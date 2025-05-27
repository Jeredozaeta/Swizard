import { AudioEffect, FrequencyChannel } from '../types';

export function buildToneGraph(
  ctx: BaseAudioContext,
  channels: FrequencyChannel[],
  effects: Record<string, AudioEffect>
): AudioNode {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;

  // Create oscillators for each enabled channel
  const enabledChannels = channels.filter(c => c.enabled);
  const channelGains: GainNode[] = [];

  enabledChannels.forEach((channel, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = channel.waveform;
    oscillator.frequency.value = channel.frequency;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0 / enabledChannels.length;

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    channelGains.push(gainNode);

    if (ctx instanceof AudioContext) {
      oscillator.start();
    }
  });

  // Apply effects
  Object.values(effects).forEach(effect => {
    if (!effect.enabled) return;

    switch (effect.id) {
      case 'tremolo': {
        const tremolo = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(tremolo.gain);
        masterGain.connect(tremolo);
        if (ctx instanceof AudioContext) {
          lfo.start();
        }
        break;
      }

      case 'stereoPan': {
        const panner = ctx.createStereoPanner();
        panner.pan.value = (effect.value - 50) / 50;
        masterGain.connect(panner);
        break;
      }

      // Add other effects here...
    }
  });

  return masterGain;
}