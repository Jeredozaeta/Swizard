import { AudioEffect, FrequencyChannel } from '../types';

export function buildToneGraph(
  ctx: BaseAudioContext,
  channels: FrequencyChannel[],
  effects: Record<string, AudioEffect>
): AudioNode {
  // Create master gain node
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;

  // Create oscillators for each enabled channel
  const enabledChannels = channels.filter(c => c.enabled);
  
  enabledChannels.forEach(channel => {
    const oscillator = ctx.createOscillator();
    oscillator.type = channel.waveform;
    oscillator.frequency.value = channel.frequency;

    const channelGain = ctx.createGain();
    channelGain.gain.value = 1.0 / enabledChannels.length; // Equal power mixing

    oscillator.connect(channelGain);
    channelGain.connect(masterGain);

    if (ctx instanceof AudioContext) {
      oscillator.start();
    }
  });

  // Apply effects chain
  let currentNode: AudioNode = masterGain;

  if (effects.tremolo?.enabled) {
    const tremolo = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = effects.tremolo.value;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5; // Modulation depth
    
    lfo.connect(lfoGain);
    lfoGain.connect(tremolo.gain);
    currentNode.connect(tremolo);
    currentNode = tremolo;

    if (ctx instanceof AudioContext) {
      lfo.start();
    }
  }

  if (effects.stereoPan?.enabled) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = (effects.stereoPan.value - 50) / 50; // Convert to -1 to 1 range
    currentNode.connect(panner);
    currentNode = panner;
  }

  if (effects.phaser?.enabled) {
    const phaser = ctx.createBiquadFilter();
    phaser.type = 'allpass';
    phaser.frequency.value = effects.phaser.value;
    phaser.Q.value = 10;
    currentNode.connect(phaser);
    currentNode = phaser;
  }

  if (effects.chorus?.enabled) {
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.03;
    const chorusLFO = ctx.createOscillator();
    chorusLFO.frequency.value = effects.chorus.value;
    chorusLFO.connect(delay.delayTime);
    
    const mix = ctx.createGain();
    mix.gain.value = 0.5;
    
    currentNode.connect(delay);
    delay.connect(mix);
    currentNode.connect(mix);
    currentNode = mix;

    if (ctx instanceof AudioContext) {
      chorusLFO.start();
    }
  }

  return currentNode;
}