import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { Stripe } from "npm:stripe@13.11.0";

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
  // Set up timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Function timed out')), 5000);
  });

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature provided');
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Race between webhook processing and timeout
    await Promise.race([
      (async () => {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;

            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              
              await supabase
                .from('stripe_subscriptions')
                .upsert({
                  subscription_id: subscription.id,
                  customer_id: subscription.customer as string,
                  status: subscription.status,
                  price_id: subscription.items.data[0].price.id,
                  current_period_start: subscription.current_period_start,
                  current_period_end: subscription.current_period_end,
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  payment_method_brand: subscription.default_payment_method?.card?.brand,
                  payment_method_last4: subscription.default_payment_method?.card?.last4,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'subscription_id'
                });

              try {
                const { data: customerData } = await supabase
                  .from('stripe_customers')
                  .select('user_id')
                  .eq('customer_id', subscription.customer)
                  .single();

                if (customerData?.user_id) {
                  const { data: userData } = await supabase
                    .from('auth.users')
                    .select('email')
                    .eq('id', customerData.user_id)
                    .single();

                  if (userData?.email) {
                    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                      },
                      body: JSON.stringify({
                        type: 'pro_payment',
                        email: userData.email,
                        data: {
                          plan: subscription.items.data[0].price.nickname || 'Pro Plan',
                          amount: `$${(subscription.items.data[0].price.unit_amount || 0) / 100}`
                        }
                      })
                    });
                  }
                }
              } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
              }
            }
            break;
          }

          case 'invoice.paid': {
            const invoice = event.data.object;
            
            if (invoice.subscription) {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              await supabase
                .from('stripe_subscriptions')
                .upsert({
                  subscription_id: subscription.id,
                  customer_id: subscription.customer as string,
                  status: subscription.status,
                  current_period_start: subscription.current_period_start,
                  current_period_end: subscription.current_period_end,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'subscription_id'
                });
            }
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object;
            
            await supabase
              .from('stripe_subscriptions')
              .upsert({
                subscription_id: subscription.id,
                customer_id: subscription.customer as string,
                status: subscription.status,
                price_id: subscription.items.data[0].price.id,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: subscription.cancel_at_period_end,
                payment_method_brand: subscription.default_payment_method?.card?.brand,
                payment_method_last4: subscription.default_payment_method?.card?.last4,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'subscription_id'
              });
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            
            await supabase
              .from('stripe_subscriptions')
              .update({
                status: 'canceled',
                updated_at: new Date().toISOString(),
                deleted_at: new Date().toISOString()
              })
              .eq('subscription_id', subscription.id);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object;

            if (invoice.subscription) {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              await supabase
                .from('stripe_subscriptions')
                .upsert({
                  subscription_id: subscription.id,
                  customer_id: subscription.customer as string,
                  status: subscription.status,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'subscription_id'
                });
            }
            break;
          }
        }
      })(),
      timeoutPromise
    ]);

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});