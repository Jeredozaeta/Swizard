// Audio processing worklet
class AudioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'gain',
      defaultValue: 1,
      minValue: 0,
      maxValue: 1
    }];
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    const output = outputs[0];
    const gain = parameters.gain;

    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < outputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i] * gain[i];
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);

// Constants for audio configuration
const SAMPLE_RATE = 48000;
const CHANNELS = 2;

// Maximum duration: 12 hours in seconds
const MAX_DURATION = 43200; // 12 hours * 60 minutes * 60 seconds

// Chunk size for processing (1 minute)
const CHUNK_DURATION = 60;

interface WaveformGenerator {
  (t: number, frequency: number, complexity?: number): number;
}

const waveformGenerators: Record<string, WaveformGenerator> = {
  sine: (t: number, frequency: number) => 
    Math.sin(2 * Math.PI * frequency * t),
  
  square: (t: number, frequency: number, complexity = 1) => {
    if (complexity < 0.5) {
      // Simple square wave
      return Math.sign(Math.sin(2 * Math.PI * frequency * t));
    }
    // Full square wave with harmonics
    let sum = 0;
    for (let n = 1; n <= Math.ceil(complexity * 10); n += 2) {
      sum += Math.sin(2 * Math.PI * frequency * n * t) / n;
    }
    return Math.sign(sum);
  },
  
  sawtooth: (t: number, frequency: number, complexity = 1) => {
    if (complexity < 0.5) {
      // Simple sawtooth
      return 2 * ((frequency * t) % 1) - 1;
    }
    // Full sawtooth with harmonics
    let sum = 0;
    for (let n = 1; n <= Math.ceil(complexity * 10); n++) {
      sum += Math.sin(2 * Math.PI * frequency * n * t) / n;
    }
    return sum * (2 / Math.PI);
  },
  
  triangle: (t: number, frequency: number, complexity = 1) => {
    if (complexity < 0.5) {
      // Simple triangle
      return 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
    }
    // Full triangle with harmonics
    let sum = 0;
    for (let n = 0; n < Math.ceil(complexity * 10); n++) {
      const harmonic = 2 * n + 1;
      sum += Math.pow(-1, n) * Math.sin(2 * Math.PI * frequency * harmonic * t) / (harmonic * harmonic);
    }
    return sum * (8 / (Math.PI * Math.PI));
  }
};

interface AudioChannel {
  frequency: number;
  waveform: keyof typeof waveformGenerators;
  enabled: boolean;
}

interface AudioGenerationOptions {
  complexity?: number;
  sampleRate?: number;
  effectDensity?: number;
}

const generateAudioChunk = (
  channels: AudioChannel[],
  startTime: number,
  duration: number,
  options: AudioGenerationOptions = {}
): Float32Array => {
  const {
    complexity = 1,
    sampleRate = SAMPLE_RATE,
    effectDensity = 1
  } = options;

  const numSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(numSamples * CHANNELS);
  const enabledChannels = channels.filter(c => c.enabled);
  const skipSamples = complexity < 0.5 ? 2 : 1; // Skip samples for lower complexity

  for (let i = 0; i < numSamples; i += skipSamples) {
    const t = startTime + (i / sampleRate);
    let leftSample = 0;
    let rightSample = 0;

    for (const channel of enabledChannels) {
      const sample = waveformGenerators[channel.waveform](t, channel.frequency, complexity);
      
      // Apply effect density
      const effectScale = Math.random() < effectDensity ? 1 : 0.5;
      leftSample += sample * effectScale;
      rightSample += sample * effectScale;
    }

    const normalizer = Math.max(1, enabledChannels.length);
    const value = complexity < 0.5 ? 
      Math.sign(leftSample / normalizer) * 0.8 : // Simpler waveform for low complexity
      leftSample / normalizer;

    buffer[i * CHANNELS] = value;
    buffer[i * CHANNELS + 1] = value;

    // Fill skipped samples
    if (skipSamples > 1 && i < numSamples - 1) {
      buffer[(i + 1) * CHANNELS] = value;
      buffer[(i + 1) * CHANNELS + 1] = value;
    }
  }

  return buffer;
};

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'generate') {
    try {
      const { channels, duration, options = {} } = data;

      if (duration > MAX_DURATION) {
        self.postMessage({ 
          type: 'error', 
          error: `Duration cannot exceed ${MAX_DURATION} seconds (12 hours)`
        });
        return;
      }

      const numChunks = Math.ceil(duration / CHUNK_DURATION);
      self.postMessage({ type: 'start', totalChunks: numChunks });
      console.log('Starting audio generation with options:', options);

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION;
        const chunkDuration = Math.min(CHUNK_DURATION, duration - startTime);
        
        const audioData = generateAudioChunk(channels, startTime, chunkDuration, options);
        console.log(`Generated chunk ${i + 1}/${numChunks} with complexity ${options.complexity}`);
        
        self.postMessage({
          type: 'chunk',
          audioData: audioData.buffer,
          isFirstChunk: i === 0,
          isLastChunk: i === numChunks - 1,
          progress: ((i + 1) / numChunks) * 100
        }, [audioData.buffer]);

        // Yield to main thread periodically
        if (i % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      console.log('Audio generation complete');
      self.postMessage({ type: 'complete' });
    } catch (error) {
      console.error('Audio generation error:', error);
      self.postMessage({ 
        type: 'error', 
        error: 'Failed to generate audio: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  }
};

// Clean up on termination
self.addEventListener('unload', () => {
  // No cleanup needed
});