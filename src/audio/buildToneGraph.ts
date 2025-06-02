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
        lfo.type = 'sine';
        lfo.frequency.value = effect.value;
        
        // Scale LFO output for tremolo depth
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5; // Depth control
        
        lfo.connect(lfoGain);
        lfoGain.connect(tremolo.gain);
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
        
        // Scale LFO for panning range
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.0;
        
        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);
        currentNode.connect(panner);
        panner.connect(compressor);
        lfo.start();
        currentNode = panner;
        break;
      }

      case 'phaser': {
        const filters: BiquadFilterNode[] = [];
        const numStages = 4;
        
        // Create multiple allpass filters for phasing
        for (let i = 0; i < numStages; i++) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'allpass';
          filter.frequency.value = 1000 + i * 500;
          filter.Q.value = 5;
          filters.push(filter);
        }
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        
        // Connect filters in series
        filters.reduce((prev, curr) => {
          prev.connect(curr);
          return curr;
        });
        
        // Modulate filter frequencies
        filters.forEach(filter => {
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 1500;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
        });
        
        currentNode.connect(filters[0]);
        filters[filters.length - 1].connect(compressor);
        lfo.start();
        currentNode = filters[filters.length - 1];
        break;
      }

      case 'amplitudeMod': {
        const modGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = effect.value;
        
        // Scale LFO for AM depth
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.8;
        
        lfo.connect(lfoGain);
        lfoGain.connect(modGain.gain);
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
        
        // Full range panning
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.0;
        
        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);
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
        
        // Sharp on/off for isochronic effect
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.95;
        
        lfo.connect(lfoGain);
        lfoGain.connect(pulseGain.gain);
        currentNode.connect(pulseGain);
        pulseGain.connect(compressor);
        lfo.start();
        currentNode = pulseGain;
        break;
      }

      case 'reverb': {
        // Create convolver node for reverb
        const convolver = ctx.createConvolver();
        
        // Calculate reverb time based on slider value (0-100 maps to 0.5-3 seconds)
        const reverbTime = 0.5 + (effect.value / 100) * 2.5;
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * reverbTime);
        const decay = -6.908 / reverbTime; // Natural log of 1/1000 for -60dB decay
        
        // Generate impulse response
        const impulse = ctx.createBuffer(2, length, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            // Early reflections
            const earlyReflection = i < 0.1 * length ? 0.7 : 0;
            // Main reverb tail with exponential decay
            const reverbTail = Math.exp(decay * i / sampleRate);
            // Combine with random reflections
            channelData[i] = (Math.random() * 2 - 1) * (earlyReflection + reverbTail) * 0.5;
          }
        }
        
        convolver.buffer = impulse;
        
        // Create wet/dry mix
        const wetGain = ctx.createGain();
        const dryGain = ctx.createGain();
        
        // Calculate wet/dry mix (more wet for larger room sizes)
        const wetLevel = 0.2 + (effect.value / 100) * 0.6; // 20% to 80% wet
        const dryLevel = 1 - wetLevel;
        
        wetGain.gain.value = wetLevel;
        dryGain.gain.value = dryLevel;
        
        // Connect the signal path
        currentNode.connect(dryGain);
        currentNode.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(compressor);
        wetGain.connect(compressor);
        
        currentNode = wetGain;
        break;
      }
    }
  });

  return currentNode;
}