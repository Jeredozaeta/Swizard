import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const totalDuration = parseInt(formData.get('totalDuration') as string);
    
    if (!totalDuration) {
      throw new Error('Total duration is required');
    }

    // Get all chunks
    const chunks: Blob[] = [];
    let i = 0;
    while (formData.has(`chunk${i}`)) {
      chunks.push(formData.get(`chunk${i}`) as Blob);
      i++;
    }

    if (chunks.length === 0) {
      throw new Error('No audio chunks provided');
    }

    // Create a unique filename
    const filename = `swizard-${Date.now()}.wav`;
    
    // Upload chunks to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio_exports')
      .upload(filename, new Blob(chunks, { type: 'audio/wav' }));

    if (uploadError) {
      throw uploadError;
    }

    // Get download URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio_exports')
      .getPublicUrl(filename);

    // Set expiry for the file (24 hours)
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24);

    return new Response(
      JSON.stringify({ 
        downloadUrl: publicUrl,
        expiresAt: expiryTime.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Audio stitching error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process audio',
        code: error.code || 500
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.code || 500,
      }
    );
  }
});