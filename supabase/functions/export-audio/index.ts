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

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per window
const WINDOW_SIZE = 3600; // 1 hour in seconds
const MAX_DURATION = 43200; // 12 hours in seconds

// In-memory store for rate limiting
const rateLimitStore = new Map<string, number[]>();

function getRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  
  // Clean up old requests
  const validRequests = userRequests.filter(timestamp => 
    now - timestamp < WINDOW_SIZE * 1000
  );
  
  if (validRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitStore.set(userId, validRequests);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Check rate limit
    if (!getRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formData = await req.formData();
    const totalDuration = parseInt(formData.get('totalDuration') as string);
    const channels = JSON.parse(formData.get('channels') as string);
    const effects = JSON.parse(formData.get('effects') as string);
    
    if (!totalDuration || !channels || !effects) {
      throw new Error('Missing required parameters');
    }

    // Check duration limit
    if (totalDuration > MAX_DURATION) {
      return new Response(
        JSON.stringify({ error: 'Duration exceeds maximum limit of 12 hours' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process audio in chunks
    const CHUNK_SIZE = 600; // 10 minutes per chunk
    const numChunks = Math.ceil(totalDuration / CHUNK_SIZE);
    const sampleRate = 48000;
    const numChannels = 2;

    // Create WAV header
    const dataSize = Math.ceil(totalDuration * sampleRate * numChannels * 2); // 2 bytes per sample
    const headerBuffer = new ArrayBuffer(44);
    const headerView = new DataView(headerBuffer);

    // Write WAV header
    const writeString = (view: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(headerView, 0, 'RIFF');
    headerView.setUint32(4, 36 + dataSize, true);
    writeString(headerView, 8, 'WAVE');
    writeString(headerView, 12, 'fmt ');
    headerView.setUint32(16, 16, true);
    headerView.setUint16(20, 1, true);
    headerView.setUint16(22, numChannels, true);
    headerView.setUint32(24, sampleRate, true);
    headerView.setUint32(28, sampleRate * numChannels * 2, true);
    headerView.setUint16(32, numChannels * 2, true);
    headerView.setUint16(34, 16, true);
    writeString(headerView, 36, 'data');
    headerView.setUint32(40, dataSize, true);

    // Create a unique filename
    const filename = `export-${Date.now()}.wav`;
    
    // Upload WAV header
    const { error: headerError } = await supabase.storage
      .from('user_uploads')
      .upload(`${filename}.header`, headerBuffer);

    if (headerError) {
      throw headerError;
    }

    // Process and upload chunks
    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * CHUNK_SIZE;
      const chunkDuration = Math.min(CHUNK_SIZE, totalDuration - chunkStart);
      
      // Generate audio data for this chunk
      const chunkData = await generateChunkData(chunkDuration, channels, effects, sampleRate);
      
      // Upload chunk
      const { error: chunkError } = await supabase.storage
        .from('user_uploads')
        .upload(`${filename}.chunk${i}`, chunkData);

      if (chunkError) {
        throw chunkError;
      }
    }

    // Get signed URL for final file
    const { data: { signedUrl } } = await supabase.storage
      .from('user_uploads')
      .createSignedUrl(filename, 3600); // 1 hour expiry

    return new Response(
      JSON.stringify({ downloadUrl: signedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Audio export error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to export audio',
        code: error.code || 500
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.code || 500,
      }
    );
  }
});

async function generateChunkData(
  duration: number,
  channels: any[],
  effects: any[],
  sampleRate: number
): Promise<ArrayBuffer> {
  const numSamples = Math.ceil(duration * sampleRate);
  const numChannels = 2;
  const buffer = new Int16Array(numSamples * numChannels);
  
  // Generate audio data for each enabled channel
  const enabledChannels = channels.filter(c => c.enabled);
  const normalizedGain = 1.0 / Math.max(1, enabledChannels.length);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let leftSample = 0;
    let rightSample = 0;

    // Generate samples for each enabled channel
    for (const channel of enabledChannels) {
      const sample = generateWaveform(t, channel.frequency, channel.waveform);
      leftSample += sample;
      rightSample += sample;
    }

    // Normalize and convert to Int16
    leftSample = Math.max(-1, Math.min(1, leftSample * normalizedGain));
    rightSample = Math.max(-1, Math.min(1, rightSample * normalizedGain));

    buffer[i * 2] = Math.round(leftSample * 32767);
    buffer[i * 2 + 1] = Math.round(rightSample * 32767);

    // Yield to prevent blocking
    if (i % 48000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return buffer.buffer;
}

function generateWaveform(t: number, frequency: number, waveform: string): number {
  const phase = 2 * Math.PI * frequency * t;
  
  switch (waveform) {
    case 'sine':
      return Math.sin(phase);
    case 'square':
      return Math.sign(Math.sin(phase));
    case 'sawtooth':
      return 2 * ((frequency * t) % 1) - 1;
    case 'triangle':
      return 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
    default:
      return 0;
  }
}