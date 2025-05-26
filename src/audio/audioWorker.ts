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
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const BLOCK_ALIGN = CHANNELS * BYTES_PER_SAMPLE;
const BYTE_RATE = SAMPLE_RATE * BLOCK_ALIGN;

// Chunk size (5MB) for efficient memory usage
const CHUNK_SIZE = 5 * 1024 * 1024;
const CHUNK_DURATION = Math.floor(CHUNK_SIZE / BYTE_RATE);

// Maximum duration: 12 hours in seconds
const MAX_DURATION = 43200;

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

const generatePCMData = (
  channels: AudioChannel[],
  startSample: number,
  numSamples: number,
  progressCallback: (progress: number) => void
): Float32Array => {
  const buffer = new Float32Array(numSamples * CHANNELS);
  const enabledChannels = channels.filter(c => c.enabled);
  const generators = enabledChannels.map(channel => ({
    generate: waveformGenerators[channel.waveform],
    frequency: channel.frequency
  }));

  const PROGRESS_INTERVAL = Math.floor(numSamples / 100);

  for (let i = 0; i < numSamples; i++) {
    if (i % PROGRESS_INTERVAL === 0) {
      progressCallback((i / numSamples) * 100);
    }

    const t = (startSample + i) / SAMPLE_RATE;
    let leftSample = 0;
    let rightSample = 0;
    
    for (const { generate, frequency } of generators) {
      const sample = generate(t, frequency);
      leftSample += sample;
      rightSample += sample;
    }
    
    const normalizer = Math.max(1, generators.length);
    buffer[i * CHANNELS] = leftSample / normalizer;
    buffer[i * CHANNELS + 1] = rightSample / normalizer;
  }
  
  return buffer;
};

const createWAVHeader = (totalSamples: number, isFirstChunk: boolean): ArrayBuffer => {
  const headerSize = isFirstChunk ? 44 : 0;
  const buffer = new ArrayBuffer(headerSize);
  
  if (!isFirstChunk) return buffer;
  
  const view = new DataView(buffer);
  let offset = 0;
  
  // RIFF header
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + (totalSamples * BLOCK_ALIGN), true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  
  // Format chunk
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, CHANNELS, true); offset += 2;
  view.setUint32(offset, SAMPLE_RATE, true); offset += 4;
  view.setUint32(offset, BYTE_RATE, true); offset += 4;
  view.setUint16(offset, BLOCK_ALIGN, true); offset += 2;
  view.setUint16(offset, BITS_PER_SAMPLE, true); offset += 2;
  
  // Data chunk header
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, totalSamples * BLOCK_ALIGN, true);
  
  return buffer;
};

const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
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

      const totalSamples = Math.floor(SAMPLE_RATE * duration);
      const samplesPerChunk = Math.floor(SAMPLE_RATE * CHUNK_DURATION);
      const numChunks = Math.ceil(totalSamples / samplesPerChunk);

      for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
        const startSample = chunkIndex * samplesPerChunk;
        const chunkSamples = Math.min(samplesPerChunk, totalSamples - startSample);
        const isFirstChunk = chunkIndex === 0;
        const isLastChunk = chunkIndex === numChunks - 1;

        // Generate WAV header for first chunk
        const header = createWAVHeader(
          totalSamples,
          isFirstChunk
        );

        // Generate audio data
        const floatPCM = generatePCMData(
          channels, 
          startSample, 
          chunkSamples,
          (chunkProgress) => {
            const overallProgress = Math.floor((chunkIndex * 100 + chunkProgress) / numChunks);
            self.postMessage({ type: 'progress', progress: overallProgress });
          }
        );
        
        const int16PCM = floatTo16BitPCM(floatPCM);

        // Send chunk data
        self.postMessage({
          type: 'chunk',
          header: header,
          data: int16PCM.buffer,
          isFirstChunk,
          isLastChunk,
          progress: ((chunkIndex + 1) / numChunks) * 100
        }, [header, int16PCM.buffer]);

        // Yield to main thread periodically
        if (chunkIndex % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      self.postMessage({ type: 'complete' });
    } catch (error) {
      console.error('Audio generation error:', error);
      self.postMessage({ 
        type: 'error', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};

// Clean up on termination
self.addEventListener('unload', () => {
  // Cleanup
});