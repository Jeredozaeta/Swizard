import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

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
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
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

    // Assign admin role
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error assigning admin role:', error);
      throw new Error('Failed to assign admin role');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Assign admin role error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to assign admin role',
        code: error.message.includes('Authentication') ? 401 : 400
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Authentication') ? 401 : 400,
      }
    );
  }
});