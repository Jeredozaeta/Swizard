import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const apiKey = Deno.env.get('POSTMARK_API_TOKEN');
const fromEmail = Deno.env.get('FROM_EMAIL');

if (!apiKey || !fromEmail) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, type, data } = body;

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    let templateAlias;
    let subject;

    switch (type) {
      case 'welcome':
        templateAlias = 'welcome';
        subject = 'Welcome to Real Sound Wizard!';
        break;
      case 'verify_prompt':
        templateAlias = 'verify_prompt';
        subject = 'Verify Your Email Address';
        break;
      case 'verify_success':
        templateAlias = 'verify_success';
        subject = 'Email Verified Successfully!';
        break;
      case 'verify_reminder':
        templateAlias = 'verify_reminder';
        subject = 'Reminder: Verify Your Email';
        break;
      case 'reset_password':
        templateAlias = 'reset_password';
        subject = 'Reset Your Password';
        break;
      case 'pro_payment':
        templateAlias = 'pro_payment';
        subject = 'Thank You for Your Pro Payment!';
        break;
      case 'payment_failed':
        templateAlias = 'payment_failed';
        subject = 'Payment Failed Alert';
        break;
      case 'sub_renewed':
        templateAlias = 'sub_renewed';
        subject = 'Subscription Renewed Successfully';
        break;
      case 'sub_canceled':
        templateAlias = 'sub_canceled';
        subject = 'Subscription Canceled';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    const templateModel = {
      product_name: 'Real Sound Wizard',
      name: data?.name || 'User',
      ...data
    };

    const postmarkResponse = await fetch('https://api.postmarkapp.com/email/withTemplate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey.trim(),
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        From: fromEmail,
        To: email,
        TemplateAlias: templateAlias,
        TemplateModel: templateModel
      })
    });

    const postmarkData = await postmarkResponse.json();

    if (!postmarkResponse.ok) {
      console.error('Postmark error:', postmarkData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        user_email: email,
        email_type: type,
        subject: subject
      });

    if (logError) {
      console.error('Database logging error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});