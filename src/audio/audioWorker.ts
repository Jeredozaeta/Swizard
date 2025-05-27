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
  console.log(`Generating audio chunk: startTime=${startTime}, duration=${duration}`);
  
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(numSamples * CHANNELS);
  const enabledChannels = channels.filter(c => c.enabled);

  console.log(`Enabled channels: ${enabledChannels.length}, Total samples: ${numSamples}`);

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

  console.log(`Audio chunk generated: ${buffer.length} samples`);
  return buffer;
};

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'generate') {
    try {
      const { channels, duration } = data;
      console.log(`Starting audio generation: duration=${duration}s`);

      if (duration > MAX_DURATION) {
        console.error(`Duration exceeds maximum: ${duration}s > ${MAX_DURATION}s`);
        self.postMessage({ 
          type: 'error', 
          error: `Duration cannot exceed ${MAX_DURATION} seconds (12 hours)`
        });
        return;
      }

      const numChunks = Math.ceil(duration / CHUNK_DURATION);
      self.postMessage({ type: 'start', totalChunks: numChunks });
      console.log(`Audio generation started: ${numChunks} chunks`);

      const audioData = new Float32Array(duration * SAMPLE_RATE * CHANNELS);
      let offset = 0;

      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION;
        const chunkDuration = Math.min(CHUNK_DURATION, duration - startTime);
        
        console.log(`Generating chunk ${i + 1}/${numChunks}: duration=${chunkDuration}s`);
        const chunkData = generateAudioChunk(channels, startTime, chunkDuration);
        console.log(`Chunk ${i + 1} generated: ${chunkData.length} samples`);
        
        audioData.set(chunkData, offset);
        offset += chunkData.length;

        self.postMessage({
          type: 'chunk',
          progress: ((i + 1) / numChunks) * 100
        });

        // Yield to main thread periodically
        if (i % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Create WAV file
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);

      // "RIFF" chunk descriptor
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + audioData.length * 2, true); // File size
      view.setUint32(8, 0x57415645, false); // "WAVE"

      // "fmt " sub-chunk
      view.setUint32(12, 0x666D7420, false); // "fmt "
      view.setUint32(16, 16, true); // Subchunk size
      view.setUint16(20, 1, true); // Audio format (PCM)
      view.setUint16(22, CHANNELS, true); // Channels
      view.setUint32(24, SAMPLE_RATE, true); // Sample rate
      view.setUint32(28, SAMPLE_RATE * CHANNELS * 2, true); // Byte rate
      view.setUint16(32, CHANNELS * 2, true); // Block align
      view.setUint16(34, 16, true); // Bits per sample

      // "data" sub-chunk
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, audioData.length * 2, true); // Data size

      // Convert audio data to 16-bit PCM
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Combine header and data
      const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });

      // Post the WAV blob back to the main thread
      self.postMessage({
        type: 'complete',
        wavBlob
      }, []);

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