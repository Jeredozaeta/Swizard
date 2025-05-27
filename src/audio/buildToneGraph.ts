import { AudioEffect, FrequencyChannel } from '../types';

export function buildToneGraph(ctx: BaseAudioContext, channels: FrequencyChannel[], effects: Record<string, AudioEffect>): AudioNode {
  // Create oscillators for each enabled channel
  const oscillators = channels
    .filter(ch => ch.enabled)
    .map(channel => {
      const osc = ctx.createOscillator();
      osc.type = channel.waveform;
      osc.frequency.value = channel.frequency;
      osc.start();
      return osc;
    });

  // Create main gain node for mixing
  const mainGain = ctx.createGain();
  mainGain.gain.value = 0.5; // Prevent clipping when mixing multiple sources

  // Connect oscillators to main gain
  oscillators.forEach(osc => osc.connect(mainGain));

  // Process chain for effects
  let currentNode: AudioNode = mainGain;

  // Apply enabled effects in order
  if (effects.ringMod?.enabled) {
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.frequency.value = effects.ringMod.value;
    modGain.gain.value = 0.5;
    mod.connect(modGain);
    modGain.connect(currentNode.gain);
    mod.start();
  }

  if (effects.amplitudeMod?.enabled) {
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.frequency.value = effects.amplitudeMod.value;
    modGain.gain.value = 0.5;
    mod.connect(modGain);
    modGain.connect(currentNode.gain);
    mod.start();
  }

  if (effects.tremolo?.enabled) {
    const tremolo = ctx.createOscillator();
    const tremoloGain = ctx.createGain();
    tremolo.frequency.value = effects.tremolo.value;
    tremoloGain.gain.value = 0.5;
    tremolo.connect(tremoloGain);
    tremoloGain.connect(currentNode.gain);
    tremolo.start();
  }

  if (effects.stereoPan?.enabled) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = effects.stereoPan.value / 100;
    currentNode.connect(panner);
    currentNode = panner;
  }

  if (effects.noise?.enabled) {
    const bufferSize = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = effects.noise.value / 100;
    noise.connect(noiseGain);
    noiseGain.connect(currentNode);
    noise.start();
  }

  return currentNode;
}