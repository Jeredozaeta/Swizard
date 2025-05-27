import { buildToneGraph } from './buildToneGraph';

interface RenderOptions {
  durationSeconds: number;
  buildGraph: (ctx: OfflineAudioContext) => AudioNode;
}

export async function renderOffline({ durationSeconds, buildGraph }: RenderOptions): Promise<Blob> {
  // Create offline context for rendering
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.ceil(durationSeconds * sampleRate),
    sampleRate: sampleRate
  });

  try {
    // Build the audio graph
    const outputNode = buildGraph(ctx);
    outputNode.connect(ctx.destination);

    // Render the audio
    const audioBuffer = await ctx.startRendering();

    // Convert to WAV blob
    const wavBlob = await audioBufferToWav(audioBuffer);
    return wavBlob;
  } catch (error) {
    console.error('Render error:', error);
    throw new Error('Failed to render audio');
  }
}

function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const buffer32 = new Float32Array(buffer.length * numOfChan);
  const view = new DataView(new ArrayBuffer(44 + length));
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Get channels
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Write WAV header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(36 + length);                        // file length
  setUint32(0x45564157);                         // "WAVE"
  setUint32(0x20746D66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit
  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length);                             // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = Math.max(-1, Math.min(1, channels[channel][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(44 + pos, sample, true);
      pos += 2;
    }
  }

  // Create WAV blob
  return Promise.resolve(new Blob([view], { type: 'audio/wav' }));

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}