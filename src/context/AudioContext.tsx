import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AudioState, FrequencyChannel, AudioEffect, Preset } from '../types';
import { supabase } from '../lib/supabase';

interface AudioContextType {
  state: AudioState;
  updateChannel: (id: number, updates: Partial<FrequencyChannel>) => void;
  updateEffect: (id: string, updates: Partial<AudioEffect>) => void;
  updateDuration: (duration: number) => void;
  togglePlayback: () => void;
  serializeState: () => any;
  deserializeState: (state: any) => boolean;
  sharePreset: (name: string) => Promise<string>;
  loadPreset: (id: string) => Promise<boolean>;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const DEFAULT_EFFECTS: Record<string, AudioEffect> = {
  ringMod: {
    id: 'ringMod',
    name: 'Ring Modulation',
    enabled: false,
    value: 1,
    min: 0.1,
    max: 10,
    step: 0.1,
    description: 'Creates metallic, bell-like tones'
  },
  amplitudeMod: {
    id: 'amplitudeMod',
    name: 'Amplitude Mod',
    enabled: false,
    value: 2,
    min: 0.1,
    max: 10,
    step: 0.1,
    description: 'Rhythmic volume changes'
  },
  isoPulses: {
    id: 'isoPulses',
    name: 'Isochronic',
    enabled: false,
    value: 4,
    min: 0.5,
    max: 12,
    step: 0.5,
    description: 'Pulsating frequency patterns'
  },
  stereoPan: {
    id: 'stereoPan',
    name: 'Stereo Pan',
    enabled: false,
    value: 0,
    min: -100,
    max: 100,
    step: 1,
    description: 'Left/right channel balance'
  },
  pan360: {
    id: 'pan360',
    name: '360° Pan',
    enabled: false,
    value: 1,
    min: 0.1,
    max: 5,
    step: 0.1,
    description: 'Rotating spatial movement'
  },
  binaural: {
    id: 'binaural',
    name: 'Binaural Beat',
    enabled: false,
    value: 7.83,
    min: 0.5,
    max: 40,
    step: 0.01,
    description: 'Creates frequency difference between ears'
  },
  chorus: {
    id: 'chorus',
    name: 'Chorus',
    enabled: false,
    value: 2,
    min: 0.5,
    max: 8,
    step: 0.5,
    description: 'Rich, shimmering texture'
  },
  tremolo: {
    id: 'tremolo',
    name: 'Tremolo',
    enabled: false,
    value: 4,
    min: 0.1,
    max: 20,
    step: 0.1,
    description: 'Rapid volume modulation'
  },
  noise: {
    id: 'noise',
    name: 'Noise Mix',
    enabled: false,
    value: 10,
    min: 0,
    max: 100,
    step: 1,
    description: 'Adds filtered noise texture'
  },
  phaser: {
    id: 'phaser',
    name: 'Phaser',
    enabled: false,
    value: 2,
    min: 0.1,
    max: 12,
    step: 0.1,
    description: 'Sweeping frequency shifts'
  },
  stutter: {
    id: 'stutter',
    name: 'Stutter',
    enabled: false,
    value: 4,
    min: 1,
    max: 16,
    step: 1,
    description: 'Rhythmic interruptions'
  },
  shepard: {
    id: 'shepard',
    name: 'Shepard Tone',
    enabled: false,
    value: 2,
    min: 0.5,
    max: 8,
    step: 0.5,
    description: 'Infinitely rising/falling effect'
  },
  glitch: {
    id: 'glitch',
    name: 'Glitch',
    enabled: false,
    value: 25,
    min: 0,
    max: 100,
    step: 1,
    description: 'Random digital artifacts'
  },
  pingPong: {
    id: 'pingPong',
    name: 'Ping Pong',
    enabled: false,
    value: 0.3,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Bouncing delay effect'
  },
  reverb: {
    id: 'reverb',
    name: 'Reverb',
    enabled: false,
    value: 33,
    min: 0,
    max: 100,
    step: 1,
    description: 'Spatial room simulation'
  }
};

const INITIAL_STATE: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 436, waveform: 'sine', enabled: false },
    { id: 3, frequency: 440, waveform: 'sine', enabled: false },
    { id: 4, frequency: 444, waveform: 'sine', enabled: false }
  ],
  duration: 300,
  isPlaying: false,
  effects: DEFAULT_EFFECTS
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(INITIAL_STATE);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const effectNodesRef = useRef<Record<string, any>>({});

  const initializeAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      setAnalyserNode(analyser);
    }
  }, [audioContext]);

  const createOscillator = useCallback((channel: FrequencyChannel, ctx: AudioContext, destination: AudioNode) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = channel.waveform;
    oscillator.frequency.setValueAtTime(channel.frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(channel.enabled ? 0.5 : 0, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start();

    return { oscillator, gainNode };
  }, []);

  const setupEffectChain = useCallback((ctx: AudioContext, analyser: AnalyserNode) => {
    const effects: Record<string, any> = {};

    // Create and configure effect nodes
    Object.entries(state.effects).forEach(([id, effect]) => {
      if (effect.enabled) {
        switch (id) {
          case 'binaural': {
            const leftOsc = ctx.createOscillator();
            const rightOsc = ctx.createOscillator();
            const leftGain = ctx.createGain();
            const rightGain = ctx.createGain();
            const merger = ctx.createChannelMerger(2);

            leftOsc.frequency.value = state.channels[0].frequency;
            rightOsc.frequency.value = state.channels[0].frequency + effect.value;

            leftOsc.connect(leftGain);
            rightOsc.connect(rightGain);
            leftGain.connect(merger, 0, 0);
            rightGain.connect(merger, 0, 1);
            merger.connect(analyser);

            leftOsc.start();
            rightOsc.start();

            effects[id] = { leftOsc, rightOsc, leftGain, rightGain, merger };
            break;
          }

          case 'stereoPan': {
            const panner = ctx.createStereoPanner();
            panner.pan.setValueAtTime(effect.value / 100, ctx.currentTime);
            effects[id] = panner;
            break;
          }

          case 'tremolo': {
            const tremolo = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            lfo.frequency.value = effect.value;
            lfoGain.gain.value = 0.5;

            lfo.connect(lfoGain);
            lfoGain.connect(tremolo.gain);
            lfo.start();

            effects[id] = { tremolo, lfo, lfoGain };
            break;
          }

          case 'reverb': {
            const convolver = ctx.createConvolver();
            const wetGain = ctx.createGain();
            const dryGain = ctx.createGain();

            // Create impulse response
            const sampleRate = ctx.sampleRate;
            const length = sampleRate * (effect.value / 33); // Scale with room size
            const impulse = ctx.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
              const channelData = impulse.getChannelData(channel);
              for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length / 2));
              }
            }

            convolver.buffer = impulse;
            wetGain.gain.value = effect.value / 100;
            dryGain.gain.value = 1 - (effect.value / 100);

            effects[id] = { convolver, wetGain, dryGain };
            break;
          }
        }
      }
    });

    return effects;
  }, [state.effects, state.channels]);

  const startAudio = useCallback(() => {
    if (!audioContext || !analyserNode) return;

    // Clean up existing nodes
    oscillatorsRef.current.forEach(osc => osc.stop());
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    Object.values(effectNodesRef.current).forEach(nodes => {
      if (Array.isArray(nodes)) {
        nodes.forEach(node => {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        });
      } else if (nodes) {
        if (nodes.stop) nodes.stop();
        if (nodes.disconnect) nodes.disconnect();
      }
    });
    effectNodesRef.current = {};

    // Set up effect chain
    const effectChain = setupEffectChain(audioContext, analyserNode);
    effectNodesRef.current = effectChain;

    // Create oscillators for each channel
    state.channels.forEach(channel => {
      if (channel.enabled) {
        const { oscillator, gainNode } = createOscillator(
          channel,
          audioContext,
          effectChain.reverb?.convolver || effectChain.tremolo?.tremolo || analyserNode
        );
        oscillatorsRef.current.push(oscillator);
        gainNodesRef.current.push(gainNode);
      }
    });

    setState(prev => ({ ...prev, isPlaying: true }));
  }, [audioContext, analyserNode, state.channels, createOscillator, setupEffectChain]);

  const stopAudio = useCallback(() => {
    oscillatorsRef.current.forEach(osc => osc.stop());
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    Object.values(effectNodesRef.current).forEach(nodes => {
      if (Array.isArray(nodes)) {
        nodes.forEach(node => {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        });
      } else if (nodes) {
        if (nodes.stop) nodes.stop();
        if (nodes.disconnect) nodes.disconnect();
      }
    });
    effectNodesRef.current = {};
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioContext) {
      initializeAudioContext();
      return;
    }

    if (state.isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [audioContext, state.isPlaying, initializeAudioContext, startAudio, stopAudio]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      )
    }));

    if (state.isPlaying) {
      const channelIndex = state.channels.findIndex(c => c.id === id);
      const oscillator = oscillatorsRef.current[channelIndex];
      const gainNode = gainNodesRef.current[channelIndex];

      if (oscillator && updates.frequency) {
        oscillator.frequency.setValueAtTime(updates.frequency, audioContext?.currentTime || 0);
      }
      if (gainNode && updates.enabled !== undefined) {
        gainNode.gain.setValueAtTime(updates.enabled ? 0.5 : 0, audioContext?.currentTime || 0);
      }
    }
  }, [state.isPlaying, state.channels, audioContext]);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [id]: { ...prev.effects[id], ...updates }
      }
    }));

    if (state.isPlaying && effectNodesRef.current[id]) {
      const effect = effectNodesRef.current[id];
      
      switch (id) {
        case 'binaural': {
          if (updates.value !== undefined && effect.rightOsc) {
            effect.rightOsc.frequency.setValueAtTime(
              state.channels[0].frequency + updates.value,
              audioContext?.currentTime || 0
            );
          }
          break;
        }
        case 'stereoPan': {
          if (updates.value !== undefined && effect.pan) {
            effect.pan.pan.setValueAtTime(updates.value / 100, audioContext?.currentTime || 0);
          }
          break;
        }
        case 'tremolo': {
          if (updates.value !== undefined && effect.lfo) {
            effect.lfo.frequency.setValueAtTime(updates.value, audioContext?.currentTime || 0);
          }
          break;
        }
      }
    }
  }, [state.isPlaying, state.channels, audioContext]);

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((data: any) => {
    try {
      setState(prev => ({
        ...prev,
        channels: data.channels || prev.channels,
        effects: data.effects || prev.effects,
        duration: data.duration || prev.duration
      }));
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  }, []);

  const sharePreset = useCallback(async (name: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('presets')
        .insert({
          name,
          data: serializeState()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error sharing preset:', error);
      throw new Error('Failed to share preset');
    }
  }, [serializeState]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('presets')
        .select('data')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data?.data) throw new Error('Invalid preset data');

      return deserializeState(data.data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  }, [deserializeState]);

  useEffect(() => {
    return () => {
      stopAudio();
      audioContext?.close();
    };
  }, [stopAudio, audioContext]);

  return (
    <AudioContext.Provider
      value={{
        state,
        updateChannel,
        updateEffect,
        updateDuration,
        togglePlayback,
        serializeState,
        deserializeState,
        sharePreset,
        loadPreset,
        audioContext,
        analyserNode
      }}
    >
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