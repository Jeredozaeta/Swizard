import { encodeWav } from './wavEncoder';

export interface RenderConfig {
  durationSeconds: number;
  sampleRate?: number;
  buildGraph: (ctx: BaseAudioContext) => AudioNode;
}

export async function renderOffline({
  durationSeconds,
  sampleRate = 44100,
  buildGraph
}: RenderConfig): Promise<Blob> {
  const CHUNK_SEC = 120;
  const totalChunks = Math.ceil(durationSeconds / CHUNK_SEC);
  const channelData: Float32Array[] = [];

  let renderedFrames = 0;

  for (let i = 0; i < totalChunks; i++) {
    const sliceLenSec = Math.min(CHUNK_SEC, durationSeconds - i * CHUNK_SEC);
    const length = Math.round(sliceLenSec * sampleRate);

    const oac = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });
    const graphOut = buildGraph(oac);
    graphOut.connect(oac.destination);

    const sliceBuffer = await oac.startRendering();

    for (let ch = 0; ch < 2; ch++) {
      if (!channelData[ch]) channelData[ch] = new Float32Array(durationSeconds * sampleRate);
      channelData[ch].set(sliceBuffer.getChannelData(ch), renderedFrames);
    }
    renderedFrames += length;
  }

  const wavBuffer = encodeWav(channelData, sampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}