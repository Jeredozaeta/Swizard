import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { Stripe } from "npm:stripe@13.11.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Validate auth token
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Retrieve and verify the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || session.payment_status !== 'paid') {
      throw new Error('Invalid or unpaid session');
    }

    // Update subscription status if needed
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      
      const { error: updateError } = await supabase
        .from('stripe_subscriptions')
        .update({
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Verify checkout session error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to verify checkout session',
        code: error.message.includes('Authentication') ? 401 : 400
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Authentication') ? 401 : 400,
      }
    );
  }
});