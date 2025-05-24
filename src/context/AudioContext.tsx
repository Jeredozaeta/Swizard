import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AudioContextType, AudioState, FrequencyChannel, AudioEffect, NoiseType } from '../types';
import { supabase } from '../lib/supabase';

const initialState: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 528, waveform: 'sine', enabled: true },
    { id: 3, frequency: 639, waveform: 'sine', enabled: true },
    { id: 4, frequency: 741, waveform: 'sine', enabled: true },
  ],
  duration: 300,
  isPlaying: false,
  effects: {
    ringMod: { 
      id: 'ringMod', 
      name: 'Ring Mod', 
      enabled: false, 
      value: 100, 
      min: 20, 
      max: 2000, 
      step: 1, 
      description: 'Creates metallic, bell-like tones' 
    },
    amplitudeMod: { 
      id: 'amplitudeMod', 
      name: 'Amplitude Mod', 
      enabled: false, 
      value: 1, 
      min: 0, 
      max: 20, 
      step: 0.1, 
      description: 'Modulates the amplitude of the sound' 
    },
    isoPulses: { 
      id: 'isoPulses', 
      name: 'Iso Pulses', 
      enabled: false, 
      value: 4, 
      min: 0.1, 
      max: 12, 
      step: 0.1, 
      description: 'Creates rhythmic pulses in the sound' 
    },
    stereoPan: { 
      id: 'stereoPan', 
      name: 'Stereo Pan', 
      enabled: false, 
      value: 0, 
      min: -100, 
      max: 100, 
      step: 1, 
      description: 'Controls left/right balance' 
    },
    pan360: { 
      id: 'pan360', 
      name: '360° Pan', 
      enabled: false, 
      value: 1, 
      min: 0.1, 
      max: 10, 
      step: 0.1, 
      description: 'Creates a 360-degree rotating effect' 
    },
    binaural: {
      id: 'binaural',
      name: 'Binaural Pan',
      enabled: false,
      value: 4,
      min: 1,
      max: 30,
      step: 1,
      description: 'Creates spatial audio effect with phase differences',
      baseFrequency: 440,
      phaseOffset: 0
    },
    chorus: { 
      id: 'chorus', 
      name: 'Chorus', 
      enabled: false, 
      value: 2, 
      min: 0.1, 
      max: 10, 
      step: 0.1, 
      description: 'Adds rich chorus effect with multiple voices' 
    },
    tremolo: { 
      id: 'tremolo', 
      name: 'Tremolo', 
      enabled: false, 
      value: 2, 
      min: 0.1, 
      max: 10, 
      step: 0.1, 
      description: 'Adds tremolo effect (amplitude modulation)' 
    },
    noise: { 
      id: 'noise', 
      name: 'Noise', 
      enabled: false, 
      value: 0, 
      min: 0, 
      max: 100, 
      step: 1, 
      description: 'Adds customizable noise to the sound',
      type: 'white' as NoiseType,
      color: 0,
      density: 50,
    },
    phaser: { 
      id: 'phaser', 
      name: 'Phaser', 
      enabled: false, 
      value: 2, 
      min: 0.1, 
      max: 10, 
      step: 0.1, 
      description: 'Creates a sweeping filter effect' 
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 100,
      min: 50,
      max: 500,
      step: 10,
      description: 'Creates a tempo stutter/glitch effect'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      description: 'Creates an infinitely ascending/descending tone illusion',
      direction: 'up',
      octaves: 5
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch Seq',
      enabled: false,
      value: 4,
      min: 1,
      max: 16,
      step: 1,
      description: 'Creates rhythmic glitch patterns',
      pattern: [1, 0, 1, 1, 0, 1, 0, 0],
      probability: 0.7,
      intensity: 0.8
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.3,
      min: 0.1,
      max: 1.0,
      step: 0.1,
      description: 'Creates stereo delay that bounces between channels',
      feedback: 0.4,
      mix: 0.5
    }
  }
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioTimerRef = useRef<number | null>(null);
  const stutterIntervalRef = useRef<number | null>(null);
  const shepardTonesRef = useRef<{
    oscillators: OscillatorNode[];
    gains: GainNode[];
    lfo: OscillatorNode | null;
    resetInterval: number | null;
  }>({ oscillators: [], gains: [], lfo: null, resetInterval: null });
  
  const masterGainRef = useRef<GainNode | null>(null);
  const stereoPannerRef = useRef<StereoPannerNode | null>(null);
  const pan360Ref = useRef<{
    panner: StereoPannerNode | null;
    lfo: OscillatorNode | null;
    depth: GainNode | null;
  }>({ panner: null, lfo: null, depth: null });
  const chorusRef = useRef<{
    voices: Array<{
      delay: DelayNode;
      lfo: OscillatorNode;
      gain: GainNode;
    }>;
    mix: GainNode | null;
  }>({ voices: [], mix: null });
  const amOscillatorRef = useRef<OscillatorNode | null>(null);
  const amGainRef = useRef<GainNode | null>(null);
  const isoPulsesOscRef = useRef<OscillatorNode | null>(null);
  const isoPulsesGainRef = useRef<GainNode | null>(null);
  const tremoloOscRef = useRef<OscillatorNode | null>(null);
  const tremoloGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const phaserRef = useRef<{
    filters: BiquadFilterNode[];
    lfo: OscillatorNode | null;
    depth: GainNode | null;
  }>({ filters: [], lfo: null, depth: null });
  const ringModRef = useRef<{
    oscillator: OscillatorNode | null;
    gain: GainNode | null;
    multiply: GainNode | null;
  }>({ oscillator: null, gain: null, multiply: null });
  const glitchRef = useRef<{
    intervalId: number | null;
    workletNode: AudioWorkletNode | null;
    gainNode: GainNode | null;
  }>({ intervalId: null, workletNode: null, gainNode: null });
  const binauralRef = useRef<{
    leftPanner: StereoPannerNode | null;
    rightPanner: StereoPannerNode | null;
    leftOsc: OscillatorNode | null;
    rightOsc: OscillatorNode | null;
    leftGain: GainNode | null;
    rightGain: GainNode | null;
  }>({
    leftPanner: null,
    rightPanner: null,
    leftOsc: null,
    rightOsc: null,
    leftGain: null,
    rightGain: null
  });
  const pingPongRef = useRef<{
    leftDelay: DelayNode | null;
    rightDelay: DelayNode | null;
    leftPanner: StereoPannerNode | null;
    rightPanner: StereoPannerNode | null;
    leftFeedback: GainNode | null;
    rightFeedback: GainNode | null;
    mix: GainNode | null;
  }>({
    leftDelay: null,
    rightDelay: null,
    leftPanner: null,
    rightPanner: null,
    leftFeedback: null,
    rightFeedback: null,
    mix: null
  });

  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new window.AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        return true;
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        return false;
      }
    }
    return true;
  };

  const setupShepardTone = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    const baseFreq = 50;
    const numOctaves = state.effects.shepard.octaves || 5;
    const speed = state.effects.shepard.value;
    const direction = state.effects.shepard.direction || 'up';

    shepardTonesRef.current.lfo = ctx.createOscillator();
    shepardTonesRef.current.lfo.frequency.value = speed;

    for (let i = 0; i < numOctaves; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const freq = baseFreq * Math.pow(2, i);
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      const normalizedPos = i / (numOctaves - 1);
      gain.gain.value = Math.sin(normalizedPos * Math.PI);
      
      osc.connect(gain);
      gain.connect(masterGainRef.current);
      
      shepardTonesRef.current.oscillators.push(osc);
      shepardTonesRef.current.gains.push(gain);
      
      osc.start();
      
      const freqMultiplier = direction === 'up' ? 2 : 0.5;
      osc.frequency.exponentialRampToValueAtTime(
        freq * freqMultiplier,
        ctx.currentTime + (1 / speed)
      );
    }

    const resetFrequencies = () => {
      if (!ctx || !shepardTonesRef.current.oscillators.length) return;
      
      shepardTonesRef.current.oscillators.forEach((osc, i) => {
        const freq = baseFreq * Math.pow(2, i);
        if (direction === 'up') {
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            freq * 2,
            ctx.currentTime + (1 / speed)
          );
        } else {
          osc.frequency.setValueAtTime(freq * 2, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            freq,
            ctx.currentTime + (1 / speed)
          );
        }
      });
    };

    shepardTonesRef.current.resetInterval = window.setInterval(resetFrequencies, (1000 / speed));
  };

  const cleanupShepardTone = () => {
    if (shepardTonesRef.current.resetInterval) {
      clearInterval(shepardTonesRef.current.resetInterval);
      shepardTonesRef.current.resetInterval = null;
    }

    shepardTonesRef.current.oscillators.forEach(osc => {
      try {
        if (osc && osc.playbackState === 'playing') {
          osc.stop();
        }
        osc.disconnect();
      } catch (e) {
        console.warn('Error cleaning up Shepard tone oscillator:', e);
      }
    });
    
    shepardTonesRef.current.gains.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        console.warn('Error cleaning up Shepard tone gain node:', e);
      }
    });
    
    if (shepardTonesRef.current.lfo) {
      try {
        if (shepardTonesRef.current.lfo.playbackState === 'playing') {
          shepardTonesRef.current.lfo.stop();
        }
        shepardTonesRef.current.lfo.disconnect();
      } catch (e) {
        console.warn('Error cleaning up Shepard tone LFO:', e);
      }
    }
    
    shepardTonesRef.current = { 
      oscillators: [], 
      gains: [], 
      lfo: null, 
      resetInterval: null 
    };
  };

  const setupGlitch = async () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    glitchRef.current.gainNode = ctx.createGain();
    glitchRef.current.gainNode.gain.value = 1;

    masterGainRef.current.connect(glitchRef.current.gainNode);
    glitchRef.current.gainNode.connect(analyserRef.current!);

    const glitchEffect = state.effects.glitch;
    const stepDuration = 60000 / (glitchEffect.value * 4);

    const applyGlitchStep = () => {
      if (!glitchRef.current.gainNode || !ctx) return;

      const pattern = glitchEffect.pattern || [1, 0, 1, 1, 0, 1, 0, 0];
      const currentStep = Math.floor((ctx.currentTime * 1000) / stepDuration) % pattern.length;
      
      const shouldGlitch = Math.random() < (glitchEffect.probability || 0.7);
      const intensity = glitchEffect.intensity || 0.8;

      if (pattern[currentStep] && shouldGlitch) {
        const now = ctx.currentTime;
        const glitchDuration = stepDuration / 1000;
        
        glitchRef.current.gainNode.gain.cancelScheduledValues(now);
        glitchRef.current.gainNode.gain.setValueAtTime(1, now);
        
        for (let i = 0; i < 4; i++) {
          const startTime = now + (i * glitchDuration / 4);
          glitchRef.current.gainNode.gain.linearRampToValueAtTime(
            Math.random() * intensity,
            startTime + (glitchDuration / 8)
          );
          glitchRef.current.gainNode.gain.linearRampToValueAtTime(
            1,
            startTime + (glitchDuration / 4)
          );
        }
      }
    };

    glitchRef.current.intervalId = window.setInterval(applyGlitchStep, stepDuration / 4);
  };

  const cleanupGlitch = () => {
    if (glitchRef.current.intervalId) {
      clearInterval(glitchRef.current.intervalId);
      glitchRef.current.intervalId = null;
    }

    if (glitchRef.current.gainNode) {
      glitchRef.current.gainNode.disconnect();
      glitchRef.current.gainNode = null;
    }

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const setupBinauralBeats = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    const effect = state.effects.binaural;
    const baseFreq = effect.baseFrequency || 440;
    const beatFreq = effect.value;

    binauralRef.current.leftPanner = ctx.createStereoPanner();
    binauralRef.current.rightPanner = ctx.createStereoPanner();
    binauralRef.current.leftPanner.pan.value = -1;
    binauralRef.current.rightPanner.pan.value = 1;

    binauralRef.current.leftOsc = ctx.createOscillator();
    binauralRef.current.rightOsc = ctx.createOscillator();
    binauralRef.current.leftGain = ctx.createGain();
    binauralRef.current.rightGain = ctx.createGain();

    binauralRef.current.leftOsc.frequency.value = baseFreq;
    binauralRef.current.rightOsc.frequency.value = baseFreq + beatFreq;

    binauralRef.current.leftGain.gain.value = 0.5;
    binauralRef.current.rightGain.gain.value = 0.5;

    binauralRef.current.leftOsc.connect(binauralRef.current.leftGain);
    binauralRef.current.rightOsc.connect(binauralRef.current.rightGain);
    binauralRef.current.leftGain.connect(binauralRef.current.leftPanner);
    binauralRef.current.rightGain.connect(binauralRef.current.rightPanner);
    binauralRef.current.leftPanner.connect(masterGainRef.current);
    binauralRef.current.rightPanner.connect(masterGainRef.current);

    binauralRef.current.leftOsc.start();
    binauralRef.current.rightOsc.start();
  };

  const cleanupBinauralBeats = () => {
    if (binauralRef.current.leftOsc) {
      binauralRef.current.leftOsc.stop();
      binauralRef.current.leftOsc.disconnect();
    }
    if (binauralRef.current.rightOsc) {
      binauralRef.current.rightOsc.stop();
      binauralRef.current.rightOsc.disconnect();
    }
    if (binauralRef.current.leftGain) {
      binauralRef.current.leftGain.disconnect();
    }
    if (binauralRef.current.rightGain) {
      binauralRef.current.rightGain.disconnect();
    }
    if (binauralRef.current.leftPanner) {
      binauralRef.current.leftPanner.disconnect();
    }
    if (binauralRef.current.rightPanner) {
      binauralRef.current.rightPanner.disconnect();
    }

    binauralRef.current = {
      leftPanner: null,
      rightPanner: null,
      leftOsc: null,
      rightOsc: null,
      leftGain: null,
      rightGain: null
    };
  };

  const setupPingPongDelay = () => {
    if (!audioContextRef.current || !masterGainRef.current || !analyserRef.current) return;

    const ctx = audioContextRef.current;
    const effect = state.effects.pingPong;
    
    // Create nodes
    pingPongRef.current.leftDelay = ctx.createDelay(2.0);
    pingPongRef.current.rightDelay = ctx.createDelay(2.0);
    pingPongRef.current.leftPanner = ctx.createStereoPanner();
    pingPongRef.current.rightPanner = ctx.createStereoPanner();
    pingPongRef.current.leftFeedback = ctx.createGain();
    pingPongRef.current.rightFeedback = ctx.createGain();
    pingPongRef.current.mix = ctx.createGain();

    // Set initial values
    pingPongRef.current.leftDelay.delayTime.value = effect.value;
    pingPongRef.current.rightDelay.delayTime.value = effect.value * 1.5;
    pingPongRef.current.leftPanner.pan.value = -1;
    pingPongRef.current.rightPanner.pan.value = 1;
    pingPongRef.current.leftFeedback.gain.value = effect.feedback || 0.4;
    pingPongRef.current.rightFeedback.gain.value = effect.feedback || 0.4;
    pingPongRef.current.mix.gain.value = effect.mix || 0.5;

    // Connect nodes
    masterGainRef.current.connect(pingPongRef.current.leftDelay);
    masterGainRef.current.connect(pingPongRef.current.rightDelay);

    // Left channel
    pingPongRef.current.leftDelay.connect(pingPongRef.current.leftPanner);
    pingPongRef.current.leftDelay.connect(pingPongRef.current.leftFeedback);
    pingPongRef.current.leftFeedback.connect(pingPongRef.current.rightDelay);

    // Right channel
    pingPongRef.current.rightDelay.connect(pingPongRef.current.rightPanner);
    pingPongRef.current.rightDelay.connect(pingPongRef.current.rightFeedback);
    pingPongRef.current.rightFeedback.connect(pingPongRef.current.leftDelay);

    // Mix to output
    pingPongRef.current.leftPanner.connect(pingPongRef.current.mix);
    pingPongRef.current.rightPanner.connect(pingPongRef.current.mix);
    pingPongRef.current.mix.connect(analyserRef.current);

    // Direct signal
    masterGainRef.current.connect(analyserRef.current);
  };

  const cleanupPingPongDelay = () => {
    if (pingPongRef.current.leftDelay) {
      pingPongRef.current.leftDelay.disconnect();
    }
    if (pingPongRef.current.rightDelay) {
      pingPongRef.current.rightDelay.disconnect();
    }
    if (pingPongRef.current.leftPanner) {
      pingPongRef.current.leftPanner.disconnect();
    }
    if (pingPongRef.current.rightPanner) {
      pingPongRef.current.rightPanner.disconnect();
    }
    if (pingPongRef.current.leftFeedback) {
      pingPongRef.current.leftFeedback.disconnect();
    }
    if (pingPongRef.current.rightFeedback) {
      pingPongRef.current.rightFeedback.disconnect();
    }
    if (pingPongRef.current.mix) {
      pingPongRef.current.mix.disconnect();
    }

    pingPongRef.current = {
      leftDelay: null,
      rightDelay: null,
      leftPanner: null,
      rightPanner: null,
      leftFeedback: null,
      rightFeedback: null,
      mix: null
    };

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const updateChannel = (channelId: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(channel =>
        channel.id === channelId ? { ...channel, ...updates } : channel
      )
    }));

    if (!state.isPlaying) return;

    const index = state.channels.findIndex(c => c.id === channelId);
    if (index === -1) return;

    if ('frequency' in updates && oscillatorsRef.current[index]) {
      oscillatorsRef.current[index].frequency.setValueAtTime(
        updates.frequency as number,
        audioContextRef.current!.currentTime
      );
    }

    if ('enabled' in updates) {
      if (updates.enabled && !oscillatorsRef.current[index]) {
        const oscillator = audioContextRef.current!.createOscillator();
        const gainNode = audioContextRef.current!.createGain();
        
        oscillator.type = state.channels[index].waveform;
        oscillator.frequency.value = state.channels[index].frequency;
        gainNode.gain.value = 0.5;
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGainRef.current!);
        oscillator.start();
        
        oscillatorsRef.current[index] = oscillator;
        gainNodesRef.current[index] = gainNode;
      } else if (!updates.enabled && oscillatorsRef.current[index]) {
        oscillatorsRef.current[index].stop();
        oscillatorsRef.current[index].disconnect();
        gainNodesRef.current[index].disconnect();
        oscillatorsRef.current[index] = null!;
        gainNodesRef.current[index] = null!;
      }
    }

    if ('waveform' in updates && oscillatorsRef.current[index]) {
      oscillatorsRef.current[index].type = updates.waveform as OscillatorType;
    }
  };

  const setupRingMod = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    ringModRef.current.oscillator = ctx.createOscillator();
    ringModRef.current.gain = ctx.createGain();
    ringModRef.current.multiply = ctx.createGain();
    
    ringModRef.current.oscillator.frequency.value = state.effects.ringMod.value;
    ringModRef.current.oscillator.type = 'sine';
    
    ringModRef.current.gain.gain.value = 1;
    ringModRef.current.multiply.gain.value = 0;
    
    masterGainRef.current.connect(ringModRef.current.multiply);
    ringModRef.current.oscillator.connect(ringModRef.current.gain);
    ringModRef.current.gain.connect(ringModRef.current.multiply.gain);
    
    ringModRef.current.multiply.connect(analyserRef.current!);
    
    ringModRef.current.oscillator.start();
  };

  const cleanupRingMod = () => {
    if (ringModRef.current.oscillator) {
      ringModRef.current.oscillator.stop();
      ringModRef.current.oscillator.disconnect();
    }
    if (ringModRef.current.gain) {
      ringModRef.current.gain.disconnect();
    }
    if (ringModRef.current.multiply) {
      ringModRef.current.multiply.disconnect();
    }
    
    ringModRef.current = { oscillator: null, gain: null, multiply: null };

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const setupAmplitudeModulation = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    amOscillatorRef.current = ctx.createOscillator();
    amGainRef.current = ctx.createGain();
    
    amOscillatorRef.current.frequency.value = state.effects.amplitudeMod.value;
    amOscillatorRef.current.type = 'sine';
    
    amGainRef.current.gain.value = 0.5;
    
    amOscillatorRef.current.connect(amGainRef.current);
    amGainRef.current.connect(masterGainRef.current.gain);
    
    amOscillatorRef.current.start();
  };

  const cleanupAmplitudeModulation = () => {
    if (amOscillatorRef.current) {
      amOscillatorRef.current.stop();
      amOscillatorRef.current.disconnect();
      amOscillatorRef.current = null;
    }
    if (amGainRef.current) {
      amGainRef.current.disconnect();
      amGainRef.current = null;
    }
  };

  const setupIsoPulses = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    isoPulsesOscRef.current = ctx.createOscillator();
    isoPulsesGainRef.current = ctx.createGain();
    
    isoPulsesOscRef.current.frequency.value = state.effects.isoPulses.value;
    isoPulsesOscRef.current.type = 'sine';
    
    isoPulsesGainRef.current.gain.value = 0.5;
    
    isoPulsesOscRef.current.connect(isoPulsesGainRef.current);
    isoPulsesGainRef.current.connect(masterGainRef.current.gain);
    
    isoPulsesOscRef.current.start();
  };

  const cleanupIsoPulses = () => {
    if (isoPulsesOscRef.current) {
      isoPulsesOscRef.current.stop();
      isoPulsesOscRef.current.disconnect();
      isoPulsesOscRef.current = null;
    }
    if (isoPulsesGainRef.current) {
      isoPulsesGainRef.current.disconnect();
      isoPulsesGainRef.current = null;
    }
  };

  const setupStereoPan = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    stereoPannerRef.current = ctx.createStereoPanner();
    stereoPannerRef.current.pan.value = state.effects.stereoPan.value / 100;

    masterGainRef.current.disconnect();
    masterGainRef.current.connect(stereoPannerRef.current);
    stereoPannerRef.current.connect(analyserRef.current!);
  };

  const cleanupStereoPan = () => {
    if (stereoPannerRef.current) {
      stereoPannerRef.current.disconnect();
      stereoPannerRef.current = null;
    }

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const setup360Pan = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    pan360Ref.current.panner = ctx.createStereoPanner();
    pan360Ref.current.lfo = ctx.createOscillator();
    pan360Ref.current.depth = ctx.createGain();
    
    pan360Ref.current.lfo.frequency.value = state.effects.pan360.value;
    pan360Ref.current.depth.gain.value = 1;
    
    pan360Ref.current.lfo.connect(pan360Ref.current.depth);
    pan360Ref.current.depth.connect(pan360Ref.current.panner.pan);
    
    masterGainRef.current.disconnect();
    masterGainRef.current.connect(pan360Ref.current.panner);
    pan360Ref.current.panner.connect(analyserRef.current!);
    
    pan360Ref.current.lfo.start();
  };

  const cleanup360Pan = () => {
    if (pan360Ref.current.lfo) {
      pan360Ref.current.lfo.stop();
      pan360Ref.current.lfo.disconnect();
    }
    if (pan360Ref.current.depth) {
      pan360Ref.current.depth.disconnect();
    }
    if (pan360Ref.current.panner) {
      pan360Ref.current.panner.disconnect();
    }
    
    pan360Ref.current = { panner: null, lfo: null, depth: null };

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const setupChorus = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    chorusRef.current.mix = ctx.createGain();
    
    for (let i = 0; i < 3; i++) {
      const delay = ctx.createDelay();
      const lfo = ctx.createOscillator();
      const gain = ctx.createGain();
      
      delay.delayTime.value = 0.03 + (i * 0.01);
      lfo.frequency.value = 0.1 + (i * 0.2);
      gain.gain.value = 0.3;
      
      lfo.connect(gain);
      gain.connect(delay.delayTime);
      
      masterGainRef.current.connect(delay);
      delay.connect(chorusRef.current.mix);
      
      lfo.start();
      
      chorusRef.current.voices.push({ delay, lfo, gain });
    }
    
    masterGainRef.current.connect(chorusRef.current.mix);
    chorusRef.current.mix.connect(analyserRef.current!);
  };

  const cleanupChorus = () => {
    chorusRef.current.voices.forEach(voice => {
      voice.lfo.stop();
      voice.lfo.disconnect();
      voice.gain.disconnect();
      voice.delay.disconnect();
    });
    
    if (chorusRef.current.mix) {
      chorusRef.current.mix.disconnect();
    }
    
    chorusRef.current = { voices: [], mix: null };

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const setupTremolo = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    
    tremoloOscRef.current = ctx.createOscillator();
    tremoloGainRef.current = ctx.createGain();
    
    tremoloOscRef.current.frequency.value = state.effects.tremolo.value;
    tremoloOscRef.current.type = 'sine';
    
    tremoloGainRef.current.gain.value = 0.5;
    
    tremoloOscRef.current.connect(tremoloGainRef.current);
    tremoloGainRef.current.connect(masterGainRef.current.gain);
    
    tremoloOscRef.current.start();
  };

  const cleanupTremolo = () => {
    if (tremoloOscRef.current) {
      tremoloOscRef.current.stop();
      tremoloOscRef.current.disconnect();
      tremoloOscRef.current = null;
    }
    if (tremoloGainRef.current) {
      tremoloGainRef.current.disconnect();
      tremoloGainRef.current = null;
    }
  };

  const setupNoise = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    const bufferSize = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noiseSourceRef.current = ctx.createBufferSource();
    noiseGainRef.current = ctx.createGain();
    
    noiseSourceRef.current.buffer = buffer;
    noiseSourceRef.current.loop = true;
    noiseGainRef.current.gain.value = state.effects.noise.value / 100 * 0.15;
    
    noiseSourceRef.current.connect(noiseGainRef.current);
    noiseGainRef.current.connect(masterGainRef.current);
    
    noiseSourceRef.current.start();
  };

  const cleanupNoise = () => {
    if (noiseSourceRef.current) {
      noiseSourceRef.current.stop();
      noiseSourceRef.current.disconnect();
      noiseSourceRef.current = null;
    }
    if (noiseGainRef.current) {
      noiseGainRef.current.disconnect();
      noiseGainRef.current = null;
    }
  };

  const setupStutter = () => {
    if (!audioContextRef.current || !state.isPlaying) return;

    const stutterRate = state.effects.stutter.value;
    const stutterInterval = () => {
      if (audioContextRef.current!.state === 'running') {
        audioContextRef.current!.suspend();
      } else {
        audioContextRef.current!.resume();
      }
    };

    stutterIntervalRef.current = window.setInterval(stutterInterval, stutterRate);
  };

  const cleanupStutter = () => {
    if (stutterIntervalRef.current) {
      clearInterval(stutterIntervalRef.current);
      stutterIntervalRef.current = null;
      
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  };

  const setupPhaser = () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    const ctx = audioContextRef.current;
    const numFilters = 8;
    const baseFrequency = 1000;
    
    phaserRef.current.lfo = ctx.createOscillator();
    phaserRef.current.depth = ctx.createGain();
    
    phaserRef.current.lfo.frequency.value = state.effects.phaser.value;
    phaserRef.current.lfo.type = 'sine';
    
    phaserRef.current.depth.gain.value = 1500;
    
    phaserRef.current.lfo.connect(phaserRef.current.depth);
    
    let prevFilter: BiquadFilterNode | null = null;
    
    for (let i = 0; i < numFilters; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = baseFrequency + (i * 100);
      filter.Q.value = 5;
      
      phaserRef.current.depth.connect(filter.frequency);
      
      if (prevFilter === null) {
        masterGainRef.current.connect(filter);
      } else {
        prevFilter.connect(filter);
      }
      
      phaserRef.current.filters.push(filter);
      prevFilter = filter;
    }
    
    if (prevFilter) {
      prevFilter.connect(analyserRef.current!);
      
      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = 0.5;
      prevFilter.connect(feedbackGain);
      feedbackGain.connect(phaserRef.current.filters[0]);
    }
    
    phaserRef.current.lfo.start();
  };

  const cleanupPhaser = () => {
    if (phaserRef.current.lfo) {
      phaserRef.current.lfo.stop();
      phaserRef.current.lfo.disconnect();
    }
    if (phaserRef.current.depth) {
      phaserRef.current.depth.disconnect();
    }
    
    phaserRef.current.filters.forEach(filter => {
      filter.disconnect();
    });
    
    phaserRef.current = { filters: [], lfo: null, depth: null };

    if (masterGainRef.current && analyserRef.current) {
      masterGainRef.current.connect(analyserRef.current);
    }
  };

  const updateEffect = (id: string, updates: Partial<AudioEffect>) => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [id]: { ...prev.effects[id], ...updates }
      }
    }));
    
    if (!state.isPlaying) return;

    if (id === 'glitch') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupGlitch();
        } else {
          cleanupGlitch();
        }
      } else if ('value' in updates || 'pattern' in updates || 
                 'probability' in updates || 'intensity' in updates) {
        cleanupGlitch();
        setupGlitch();
      }
    } else if (id === 'shepard') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupShepardTone();
        } else {
          cleanupShepardTone();
        }
      } else if ('value' in updates || 'direction' in updates) {
        cleanupShepardTone();
        setupShepardTone();
      }
    } else if (id === 'ringMod') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupRingMod();
        } else {
          cleanupRingMod();
        }
      } else if ('value' in updates && ringModRef.current.oscillator) {
        ringModRef.current.oscillator.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'phaser') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupPhaser();
        } else {
          cleanupPhaser();
        }
      } else if ('value' in updates && phaserRef.current.lfo) {
        phaserRef.current.lfo.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
        
        const baseDepth = 1500;
        const depthMultiplier = 1 + ((updates.value as number) / 10);
        if (phaserRef.current.depth) {
          phaserRef.current.depth.gain.setValueAtTime(
            baseDepth * depthMultiplier,
            audioContextRef.current!.currentTime
          );
        }
        
        phaserRef.current.filters.forEach((filter, i) => {
          const q = 5 + ((updates.value as number) / 2);
          filter.Q.setValueAtTime(
            q,
            audioContextRef.current!.currentTime
          );
        });
      }
    } else if (id === 'amplitudeMod') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupAmplitudeModulation();
        } else {
          cleanupAmplitudeModulation();
        }
      } else if ('value' in updates && amOscillatorRef.current) {
        amOscillatorRef.current.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'isoPulses') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupIsoPulses();
        } else {
          cleanupIsoPulses();
        }
      } else if ('value' in updates && isoPulsesOscRef.current) {
        isoPulsesOscRef.current.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'stereoPan') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupStereoPan();
        } else {
          cleanupStereoPan();
        }
      } else if ('value' in updates && stereoPannerRef.current) {
        stereoPannerRef.current.pan.setValueAtTime(
          (updates.value as number) / 100,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'pan360') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setup360Pan();
        } else {
          cleanup360Pan();
        }
      } else if ('value' in updates && pan360Ref.current.lfo) {
        pan360Ref.current.lfo.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'binaural') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupBinauralBeats();
        } else {
          cleanupBinauralBeats();
        }
      } else if ('value' in updates && binauralRef.current.rightOsc) {
        const baseFreq = state.effects.binaural.baseFrequency || 440;
        binauralRef.current.rightOsc.frequency.setValueAtTime(
          baseFreq + (updates.value as number),
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'chorus') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupChorus();
        } else {
          cleanupChorus();
        }
      }
    } else if (id === 'tremolo') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupTremolo();
        } else {
          cleanupTremolo();
        }
      } else if ('value' in updates && tremoloOscRef.current) {
        tremoloOscRef.current.frequency.setValueAtTime(
          updates.value as number,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'noise') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupNoise();
        } else {
          cleanupNoise();
        }
      } else if ('value' in updates && noiseGainRef.current) {
        noiseGainRef.current.gain.setValueAtTime(
          (updates.value as number) / 100 * 0.15,
          audioContextRef.current!.currentTime
        );
      }
    } else if (id === 'stutter') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupStutter();
        } else {
          cleanupStutter();
        }
      } else if ('value' in updates) {
        cleanupStutter();
        setupStutter();
      }
    } else if (id === 'pingPong') {
      if ('enabled' in updates) {
        if (updates.enabled) {
          setupPingPongDelay();
        } else {
          cleanupPingPongDelay();
        }
      } else if (state.effects.pingPong.enabled) {
        if ('value' in updates && pingPongRef.current.leftDelay && pingPongRef.current.rightDelay) {
          const delayTime = updates.value as number;
          pingPongRef.current.leftDelay.delayTime.setValueAtTime(
            delayTime,
            audioContextRef.current!.currentTime
          );
          pingPongRef.current.rightDelay.delayTime.setValueAtTime(
            delayTime * 1.5,
            audioContextRef.current!.currentTime
          );
        }
        if ('feedback' in updates && pingPongRef.current.leftFeedback && pingPongRef.current.rightFeedback) {
          const feedback = updates.feedback as number;
          pingPongRef.current.leftFeedback.gain.setValueAtTime(
            feedback,
            audioContextRef.current!.currentTime
          );
          pingPongRef.current.rightFeedback.gain.setValueAtTime(
            feedback,
            audioContextRef.current!.currentTime
          );
        }
        if ('mix' in updates && pingPongRef.current.mix) {
          pingPongRef.current.mix.gain.setValueAtTime(
            updates.mix as number,
            audioContextRef.current!.currentTime
          );
        }
      }
    }
  };

  const updateDuration = (duration: number) => {
    setState(prev => ({ ...prev, duration }));
  };

  const togglePlayback = () => {
    if (!initializeAudioContext()) {
      return;
    }

    if (state.isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }

    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const startAudio = () => {
    if (!audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    stopAudio();
    
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current!;
    
    masterGainRef.current = ctx.createGain();
    masterGainRef.current.gain.value = 0.5;
    
    const nodeConnections = new WeakMap();
    
    const trackNodeConnection = (source: AudioNode, destination: AudioNode) => {
      nodeConnections.set(source, destination);
    };
    
    const setupEffect = (effect: string) => {
      switch (effect) {
        case 'ringMod':
          if (state.effects.ringMod.enabled) {
            setupRingMod();
            if (ringModRef.current.oscillator && ringModRef.current.multiply) {
              trackNodeConnection(ringModRef.current.oscillator, ringModRef.current.multiply);
            }
          }
          break;
        case 'phaser':
          if (state.effects.phaser.enabled) {
            setupPhaser();
            phaserRef.current.filters.forEach((filter, i) => {
              if (i > 0) {
                trackNodeConnection(phaserRef.current.filters[i-1], filter);
              }
            });
          }
          break;
        case 'amplitudeMod':
          if (state.effects.amplitudeMod.enabled) {
            setupAmplitudeModulation();
            if (amOscillatorRef.current && amGainRef.current) {
              trackNodeConnection(amOscillatorRef.current, amGainRef.current);
            }
          }
          break;
        case 'isoPulses':
          if (state.effects.isoPulses.enabled) {
            setupIsoPulses();
            if (isoPulsesOscRef.current && isoPulsesGainRef.current) {
              trackNodeConnection(isoPulsesOscRef.current, isoPulsesGainRef.current);
            }
          }
          break;
        case 'stereoPan':
          if (state.effects.stereoPan.enabled) {
            setupStereoPan();
            if (masterGainRef.current && stereoPannerRef.current) {
              trackNodeConnection(masterGainRef.current, stereoPannerRef.current);
            }
          }
          break;
        case 'pan360':
          if (state.effects.pan360.enabled) {
            setup360Pan();
            if (pan360Ref.current.lfo && pan360Ref.current.depth) {
              trackNodeConnection(pan360Ref.current.lfo, pan360Ref.current.depth);
            }
          }
          break;
        case 'binaural':
          if (state.effects.binaural.enabled) {
            setupBinauralBeats();
            if (binauralRef.current.leftOsc && binauralRef.current.leftGain) {
              trackNodeConnection(binauralRef.current.leftOsc, binauralRef.current.leftGain);
            }
            if (binauralRef.current.rightOsc && binauralRef.current.rightGain) {
              trackNodeConnection(binauralRef.current.rightOsc, binauralRef.current.rightGain);
            }
          }
          break;
        case 'chorus':
          if (state.effects.chorus.enabled) {
            setupChorus();
            chorusRef.current.voices.forEach(voice => {
              trackNodeConnection(voice.lfo, voice.gain);
              trackNodeConnection(voice.delay, chorusRef.current.mix!);
            });
          }
          break;
        case 'tremolo':
          if (state.effects.tremolo.enabled) {
            setupTremolo();
            if (tremoloOscRef.current && tremoloGainRef.current) {
              trackNodeConnection(tremoloOscRef.current, tremoloGainRef.current);
            }
          }
          break;
        case 'noise':
          if (state.effects.noise.enabled) {
            setupNoise();
            if (noiseSourceRef.current && noiseGainRef.current) {
              trackNodeConnection(noiseSourceRef.current, noiseGainRef.current);
            }
          }
          break;
        case 'stutter':
          if (state.effects.stutter.enabled) {
            setupStutter();
          }
          break;
        case 'shepard':
          if (state.effects.shepard.enabled) {
            setupShepardTone();
            shepardTonesRef.current.oscillators.forEach((osc, i) => {
              trackNodeConnection(osc, shepardTonesRef.current.gains[i]);
            });
          }
          break;
        case 'glitch':
          if (state.effects.glitch.enabled) {
            setupGlitch();
            if (glitchRef.current.gainNode) {
              trackNodeConnection(masterGainRef.current!, glitchRef.current.gainNode);
            }
          }
          break;
        case 'pingPong':
          if (state.effects.pingPong.enabled) {
            setupPingPongDelay();
            if (pingPongRef.current.leftDelay && pingPongRef.current.rightDelay) {
              trackNodeConnection(masterGainRef.current!, pingPongRef.current.leftDelay);
              trackNodeConnection(masterGainRef.current!, pingPongRef.current.rightDelay);
            }
          }
          break;
      }
    };
    
    Object.keys(state.effects).forEach(setupEffect);
    
    if (!ringModRef.current.multiply && !phaserRef.current.filters.length && 
        !stereoPannerRef.current && !pan360Ref.current.panner && 
        !chorusRef.current.mix && !glitchRef.current.gainNode &&
        !pingPongRef.current.mix) {
      masterGainRef.current.connect(analyser);
      trackNodeConnection(masterGainRef.current, analyser);
    }
    
    analyser.connect(ctx.destination);
    trackNodeConnection(analyser, ctx.destination);
    
    state.channels.forEach((channel, index) => {
      if (!channel.enabled) return;
      
      const oscillator = ctx.createOscillator();
      oscillator.type = channel.waveform;
      oscillator.frequency.value = channel.frequency;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.5;
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGainRef.current!);
      
      trackNodeConnection(oscillator, gainNode);
      trackNodeConnection(gainNode, masterGainRef.current!);
      
      oscillator.start();
      
      oscillatorsRef.current[index] = oscillator;
      gainNodesRef.current[index] = gainNode;
    });
    
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
    }
    
    audioTimerRef.current = window.setTimeout(() => {
      stopAudio();
      setState(prev => ({ ...prev, isPlaying: false }));
    }, state.duration * 1000);
    
    (ctx as any).__nodeConnections = nodeConnections;
  };

  const stopAudio = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const nodeConnections = (ctx as any).__nodeConnections;
    
    const disconnectNode = (node: AudioNode) => {
      try {
        const destination = nodeConnections?.get(node);
        if (destination) {
          node.disconnect(destination);
          nodeConnections?.delete(node);
        } else {
          node.disconnect();
        }
      } catch (e) {
        console.warn('Error disconnecting node:', e);
      }
    };
    
    oscillatorsRef.current.forEach(osc => {
      if (osc) {
        try {
          osc.stop();
          disconnectNode(osc);
        } catch (e) {
          console.warn('Error stopping oscillator:', e);
        }
      }
    });
    
    gainNodesRef.current.forEach(gain => {
      if (gain) disconnectNode(gain);
    });
    
    cleanupRingMod();
    cleanupPhaser();
    cleanupAmplitudeModulation();
    cleanupIsoPulses();
    cleanupStereoPan();
    cleanup360Pan();
    cleanupBinauralBeats();
    cleanupChorus();
    cleanupTremolo();
    cleanupNoise();
    cleanupStutter();
    cleanupShepardTone();
    cleanupGlitch();
    cleanupPingPongDelay();
    
    if (masterGainRef.current) {
      disconnectNode(masterGainRef.current);
      masterGainRef.current = null;
    }
    
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    
    delete (ctx as any).__nodeConnections;
  };

  const serializeState = () => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  };

  const deserializeState = (encodedState: any) => {
    try {
      // Validate the state structure
      if (!encodedState.channels || !encodedState.effects || !encodedState.duration) {
        throw new Error('Invalid state structure');
      }

      // Stop any current playback
      if (state.isPlaying) {
        stopAudio();
      }

      setState(prev => ({
        ...prev,
        channels: encodedState.channels,
        effects: encodedState.effects,
        duration: encodedState.duration,
        isPlaying: false
      }));

      return true;
    } catch (error) {
      console.error('Error deserializing state:', error);
      return false;
    }
  };

  const sharePreset = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Must be logged in to share presets');
      }

      const presetData = {
        channels: state.channels,
        effects: state.effects,
        duration: state.duration
      };

      const { data, error } = await supabase
        .from('presets')
        .insert({
          user_id: user.id,
          name: name,
          data: presetData
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error sharing preset:', error);
      throw error;
    }
  };

  const loadPreset = async (id: string) => {
    try {
      // Check for old-style URL sharing
      if (id.includes('config=')) {
        const configParam = new URLSearchParams(id).get('config');
        if (configParam) {
          const decodedState = JSON.parse(atob(configParam));
          return deserializeState(decodedState);
        }
        return false;
      }

      const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!preset || !preset.data) {
        throw new Error('Preset not found or expired');
      }

      // Increment views
      await supabase.rpc('increment_preset_views', { preset_id: id });

      return deserializeState(preset.data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <AudioContext.Provider value={{
      state,
      updateChannel,
      updateEffect,
      updateDuration,
      togglePlayback,
      serializeState,
      deserializeState,
      sharePreset,
      loadPreset,
      audioContext: audioContextRef.current,
      analyserNode: analyserRef.current
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};