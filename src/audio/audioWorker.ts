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

const generateAudioChunk = (
  channels: AudioChannel[],
  startTime: number,
  duration: number,
  sampleRate: number = SAMPLE_RATE
): Float32Array => {
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(numSamples * CHANNELS);
  const enabledChannels = channels.filter(c => c.enabled);

  for (let i = 0; i < numSamples; i++) {
    const t = startTime + (i / sampleRate);
    let leftSample = 0;
    let rightSample = 0;

    for (const channel of enabledChannels) {
      const sample = waveformGenerators[channel.waveform](t, channel.frequency);
      leftSample += sample;
      rightSample += sample;
    }

    const normalizer = Math.max(1, enabledChannels.length);
    buffer[i * CHANNELS] = leftSample / normalizer;
    buffer[i * CHANNELS + 1] = rightSample / normalizer;
  }

  return buffer;
};

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'generate') {
    try {
      const { channels, duration } = data;

      if (duration > MAX_DURATION) {
        self.postMessage({ 
          type: 'error', 
          error: `Duration cannot exceed ${MAX_DURATION} seconds (12 hours)`
        });
        return;
      }

      const numChunks = Math.ceil(duration / CHUNK_DURATION);
      self.postMessage({ type: 'start', totalChunks: numChunks });
      console.log('Starting audio generation');

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION;
        const chunkDuration = Math.min(CHUNK_DURATION, duration - startTime);
        
        const audioData = generateAudioChunk(channels, startTime, chunkDuration);
        console.log(`Generated chunk ${i + 1}/${numChunks}`);
        
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