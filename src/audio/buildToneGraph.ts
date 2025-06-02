import { AudioContext, OfflineAudioContext } from 'standardized-audio-context';
import { FrequencyChannel, AudioEffect } from '../types';

export function buildToneGraph(
  ctx: AudioContext | OfflineAudioContext,
  frequencies: FrequencyChannel[],
  effects: Record<string, AudioEffect>
): AudioNode {
  // Create master compressor
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(ctx.destination);

  // Create master gain
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(compressor);

  // Create oscillators for each frequency
  const enabledFrequencies = frequencies.filter(f => f.enabled);
  const normalizedGain = 1.0 / Math.max(1, enabledFrequencies.length);

  enabledFrequencies.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = freq.waveform;
    osc.frequency.value = freq.frequency;
    gain.gain.value = normalizedGain;
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
  });

  // Apply effects chain
  let currentNode: AudioNode = masterGain;

  Object.entries(effects).forEach(([id, effect]) => {
    if (!effect.enabled) return;

    switch (id) {
      case 'tremolo': {
        const tremolo = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(tremolo.gain);
        currentNode.connect(tremolo);
        tremolo.connect(compressor);
        lfo.start();
        currentNode = tremolo;
        break;
      }

      case 'stereoPan': {
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(panner.pan);
        currentNode.connect(panner);
        panner.connect(compressor);
        lfo.start();
        currentNode = panner;
        break;
      }

      case 'phaser': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'allpass';
        filter.frequency.value = 1000;
        filter.Q.value = 10;
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(filter.frequency);
        currentNode.connect(filter);
        filter.connect(compressor);
        lfo.start();
        currentNode = filter;
        break;
      }

      case 'amplitudeMod': {
        const modGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(modGain.gain);
        currentNode.connect(modGain);
        modGain.connect(compressor);
        lfo.start();
        currentNode = modGain;
        break;
      }

      case 'pan360': {
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        lfo.connect(panner.pan);
        currentNode.connect(panner);
        panner.connect(compressor);
        lfo.start();
        currentNode = panner;
        break;
      }

      case 'isoPulses': {
        const pulseGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = effect.value;
        lfo.connect(pulseGain.gain);
        currentNode.connect(pulseGain);
        pulseGain.connect(compressor);
        lfo.start();
        currentNode = pulseGain;
        break;
      }

      case 'flanger': {
        // Create delay node for flanger
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.005; // 5ms base delay

        // Create LFO for delay time modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        
        // Map effect value (0-100) to LFO frequency (0.1-4 Hz)
        const lfoFreq = 0.1 + (effect.value / 100) * 3.9;
        lfo.frequency.value = lfoFreq;
        
        // Modulation depth
        lfoGain.gain.value = 0.002; // +/- 2ms variation
        
        // Connect LFO to delay time
        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);
        
        // Create feedback path
        const feedback = ctx.createGain();
        feedback.gain.value = 0.5;
        
        // Create wet/dry mix
        const wetGain = ctx.createGain();
        const dryGain = ctx.createGain();
        wetGain.gain.value = 0.5;
        dryGain.gain.value = 0.5;
        
        // Connect the nodes
        currentNode.connect(dryGain);
        currentNode.connect(delay);
        delay.connect(wetGain);
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Mix wet and dry signals
        const mixer = ctx.createGain();
        dryGain.connect(mixer);
        wetGain.connect(mixer);
        mixer.connect(compressor);
        
        // Start LFO
        lfo.start();
        
        currentNode = mixer;
        break;
      }
    }
  });

  return currentNode;
}