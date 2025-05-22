import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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
    const { fingerprint } = await req.json();

    if (!fingerprint || !fingerprint.id || !fingerprint.signature) {
      throw new Error('Invalid fingerprint data');
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

    // Store fingerprint
    const { data, error } = await supabase
      .from('audio_fingerprints')
      .insert({
        id: fingerprint.id,
        user_id: user.id,
        timestamp: new Date(fingerprint.timestamp).toISOString(),
        signature: fingerprint.signature,
        version: fingerprint.version,
        metadata: {
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip')
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing fingerprint:', error);
      throw new Error('Failed to store fingerprint');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Store fingerprint error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to store fingerprint',
        code: error.message.includes('Authentication') ? 401 : 400
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Authentication') ? 401 : 400,
      }
    );
  }
});