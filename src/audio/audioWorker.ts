// Constants for audio configuration
const SAMPLE_RATE = 48000;
const CHANNELS = 2;

// Maximum duration: 12 hours in seconds
const MAX_DURATION = 43200; // 12 hours * 60 minutes * 60 seconds

// Chunk size for processing (1 minute)
const CHUNK_DURATION = 60;

interface WaveformGenerator {
  (t: number, frequency: number): number;
}

const waveformGenerators: Record<string, WaveformGenerator> = {
  sine: (t: number, frequency: number) => 
    Math.sin(2 * Math.PI * frequency * t),
  
  square: (t: number, frequency: number) => 
    Math.sign(Math.sin(2 * Math.PI * frequency * t)),
  
  sawtooth: (t: number, frequency: number) => 
    2 * ((frequency * t) % 1) - 1,
  
  triangle: (t: number, frequency: number) => 
    2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1
};

interface AudioChannel {
  frequency: number;
  waveform: keyof typeof waveformGenerators;
  enabled: boolean;
}

export interface AudioGenerationResult {
  audioData: Float32Array;
  metadata: {
    sampleRate: number;
    channels: number;
    duration: number;
  };
}

export async function generateAudioData({
  durationSeconds,
  frequencies,
  sampleRate = SAMPLE_RATE,
  effects = [],
  onProgress
}: {
  durationSeconds: number;
  frequencies: AudioChannel[];
  sampleRate?: number;
  effects?: any[];
  onProgress?: (percent: number) => void;
}): Promise<AudioGenerationResult> {
  console.log('Starting audio generation:', { durationSeconds, frequencies });

  if (durationSeconds > MAX_DURATION) {
    throw new Error(`Duration cannot exceed ${MAX_DURATION} seconds (12 hours)`);
  }

  const numSamples = Math.floor(durationSeconds * sampleRate);
  const buffer = new Float32Array(numSamples * CHANNELS);
  const enabledChannels = frequencies.filter(c => c.enabled);

  if (enabledChannels.length === 0) {
    throw new Error('No enabled frequency channels found');
  }

  console.log(`Generating ${numSamples} samples for ${enabledChannels.length} channels`);

  const CHUNK_SIZE = Math.floor(sampleRate * CHUNK_DURATION);
  const numChunks = Math.ceil(numSamples / CHUNK_SIZE);

  for (let chunk = 0; chunk < numChunks; chunk++) {
    const startSample = chunk * CHUNK_SIZE;
    const endSample = Math.min(startSample + CHUNK_SIZE, numSamples);
    
    for (let i = startSample; i < endSample; i++) {
      const t = i / sampleRate;
      let leftSample = 0;
      let rightSample = 0;

      for (const channel of enabledChannels) {
        const sample = waveformGenerators[channel.waveform](t, channel.frequency);
        leftSample += sample;
        rightSample += sample;
      }

      // Normalize based on number of channels
      const normalizer = Math.max(1, enabledChannels.length);
      buffer[i * CHANNELS] = leftSample / normalizer;
      buffer[i * CHANNELS + 1] = rightSample / normalizer;
    }

    // Report progress after each chunk
    if (onProgress) {
      const progress = ((chunk + 1) / numChunks) * 100;
      onProgress(progress);
    }

    // Yield to main thread periodically
    if (chunk % 4 === 3) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    audioData: buffer,
    metadata: {
      sampleRate,
      channels: CHANNELS,
      duration: durationSeconds
    }
  };
}

// Clean up on termination
self.addEventListener('unload', () => {
  // No cleanup needed
});