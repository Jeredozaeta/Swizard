import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const apiKey = Deno.env.get('POSTMARK_API_TOKEN');
console.log('Environment check - Postmark token:', {
  exists: !!apiKey,
  length: apiKey?.length,
  firstFourChars: apiKey?.substring(0, 4),
  isValidFormat: apiKey?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) !== null
});

const fromEmail = Deno.env.get('FROM_EMAIL');
console.log('Environment check - From email:', {
  exists: !!fromEmail,
  value: fromEmail,
  isValidEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail || '')
});

if (!apiKey) {
  throw new Error('POSTMARK_API_TOKEN is not set');
}

if (!fromEmail) {
  throw new Error('FROM_EMAIL is not set');
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  console.log('Request details:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request payload:', {
      ...body,
      type: body.type,
      recipientEmail: body.email,
      hasData: !!body.data
    });

    const { email, type, data } = body;

    if (!email || !type) {
      console.error('Validation failed:', { email: !!email, type: !!type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    console.log('Authorization check:', {
      hasHeader: !!authHeader,
      headerPrefix: authHeader?.substring(0, 7),
      tokenLength: authHeader?.replace('Bearer ', '')?.length
    });

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Auth validation:', { isServiceRole });

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      console.log('User authentication:', {
        success: !!user,
        error: authError?.message,
        userId: user?.id
      });

      if (authError || !user) {
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

    console.log('Template selection:', { type });

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
        console.error('Invalid template type:', type);
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
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

    console.log('Postmark request preparation:', {
      templateAlias,
      recipientEmail: email,
      senderEmail: fromEmail,
      hasTemplateModel: !!templateModel
    });

    const postmarkHeaders = {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': apiKey.trim(),
      'Accept': 'application/json'
    };

    console.log('Postmark request headers:', {
      contentType: postmarkHeaders['Content-Type'],
      accept: postmarkHeaders['Accept'],
      hasToken: !!postmarkHeaders['X-Postmark-Server-Token'],
      tokenLength: postmarkHeaders['X-Postmark-Server-Token'].length
    });

    const postmarkResponse = await fetch('https://api.postmarkapp.com/email/withTemplate', {
      method: 'POST',
      headers: postmarkHeaders,
      body: JSON.stringify({
        From: fromEmail,
        To: email,
        TemplateAlias: templateAlias,
        TemplateModel: templateModel
      })
    });

    console.log('Postmark response details:', {
      status: postmarkResponse.status,
      statusText: postmarkResponse.statusText,
      headers: Object.fromEntries(postmarkResponse.headers.entries())
    });

    const postmarkData = await postmarkResponse.json();
    console.log('Postmark response data:', {
      success: postmarkResponse.ok,
      data: postmarkData
    });

    if (!postmarkResponse.ok) {
      console.error('Postmark error:', {
        status: postmarkResponse.status,
        error: postmarkData
      });
      return new Response(
        JSON.stringify({ error: `Postmark error: ${postmarkData.Message || 'Unknown error'}` }),
        { 
          status: postmarkResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Database logging attempt');
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
        message: 'Email sent successfully',
        messageId: postmarkData.MessageID
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Function error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});