import { AudioContext, OfflineAudioContext } from 'standardized-audio-context';

interface RenderOptions {
  durationSeconds: number;
  buildGraph: (ctx: AudioContext | OfflineAudioContext) => AudioNode;
}

export async function renderOffline({ durationSeconds, buildGraph }: RenderOptions): Promise<Blob> {
  const sampleRate = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSeconds * sampleRate), sampleRate);
  
  const outputNode = buildGraph(ctx);
  outputNode.connect(ctx.destination);
  
  const audioBuffer = await ctx.startRendering();
  
  // Convert to WAV
  const wavData = [];
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    wavData.push(audioBuffer.getChannelData(channel));
  }
  
  const wavBuffer = encodeWav(wavData, sampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}