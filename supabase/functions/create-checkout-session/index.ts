import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "npm:stripe@13.11.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  typescript: true
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId } = await req.json();
    
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Check for existing active subscription
    const { data: existingSubscriptions, error: subscriptionError } = await supabase
      .from('stripe_user_subscriptions')
      .select('subscription_status, subscription_id, cancel_at_period_end, current_period_end')
      .in('subscription_status', ['active', 'trialing', 'past_due']);

    if (subscriptionError) {
      console.error('Error checking existing subscriptions:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify subscription status' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Check if user has an active subscription
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      const activeSubscription = existingSubscriptions[0];
      
      // If subscription is active and not set to cancel at period end
      if (activeSubscription.subscription_status === 'active' && !activeSubscription.cancel_at_period_end) {
        return new Response(
          JSON.stringify({ 
            error: 'You already have an active subscription. Please manage your existing subscription instead of creating a new one.',
            code: 'EXISTING_SUBSCRIPTION'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409, // Conflict
          }
        );
      }

      // If subscription is in trial
      if (activeSubscription.subscription_status === 'trialing') {
        return new Response(
          JSON.stringify({ 
            error: 'You are currently in a trial period. Please wait for the trial to end or cancel it before subscribing to a new plan.',
            code: 'TRIAL_ACTIVE'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }

      // If subscription is past due (give them a chance to update payment)
      if (activeSubscription.subscription_status === 'past_due') {
        return new Response(
          JSON.stringify({ 
            error: 'Your current subscription has a payment issue. Please update your payment method instead of creating a new subscription.',
            code: 'PAYMENT_PAST_DUE'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }
    }

    const origin = req.headers.get('origin') || 'https://swizard.app';
    
    // Get or create customer
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information:', getCustomerError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch customer information' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    let customerId;

    if (!customer || !customer.customer_id) {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: newCustomer.id,
        });

      if (createCustomerError) {
        console.error('Failed to save customer information:', createCustomerError);
        
        // Cleanup on error
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to cleanup customer:', deleteError);
        }

        return new Response(
          JSON.stringify({ error: 'Failed to create customer mapping' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      customerId = newCustomer.id;
    } else {
      customerId = customer.customer_id;
      
      // Double-check with Stripe for any active subscriptions we might have missed
      const stripeCustomer = await stripe.customers.retrieve(customerId, {
        expand: ['subscriptions']
      });

      if (stripeCustomer.subscriptions && stripeCustomer.subscriptions.data.length > 0) {
        const activeStripeSubscriptions = stripeCustomer.subscriptions.data.filter(sub => 
          ['active', 'trialing', 'past_due'].includes(sub.status) && !sub.cancel_at_period_end
        );

        if (activeStripeSubscriptions.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'You have an active subscription in Stripe. Please manage your existing subscription.',
              code: 'STRIPE_SUBSCRIPTION_ACTIVE'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 409,
            }
          );
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        source: 'swizard_web',
        checkout_initiated: new Date().toISOString(),
        user_id: user.id
      },
      subscription_data: {
        metadata: {
          source: 'swizard_web',
          user_id: user.id
        }
      },
      custom_text: {
        submit: {
          message: 'Your Swizard Pro subscription will start immediately after payment.'
        }
      }
    });

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Checkout session error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});