import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { 
  AudioContextType, 
  AudioState, 
  FrequencyChannel,
  AudioEffect,
  Preset
} from '../types';

const defaultState: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 528, waveform: 'sine', enabled: true },
    { id: 3, frequency: 639, waveform: 'sine', enabled: true },
    { id: 4, frequency: 741, waveform: 'sine', enabled: true }
  ],
  duration: 300,
  isPlaying: false,
  effects: {
    ringMod: {
      id: 'ringMod',
      name: 'Ring Modulation',
      enabled: false,
      value: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: 'Modulates the amplitude of the signal with a sine wave'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 2.0,
      min: 0.1,
      max: 20.0,
      step: 0.1,
      description: 'Creates tremolo-like effects by modulating volume'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Isochronic',
      enabled: false,
      value: 4.0,
      min: 0.5,
      max: 12.0,
      step: 0.5,
      description: 'Generates rhythmic pulses at specified frequency'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0,
      min: -100,
      max: 100,
      step: 1,
      description: 'Controls left/right balance of the sound'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: 'Creates rotating spatial effect'
    },
    binaural: {
      id: 'binaural',
      name: 'Binaural Beat',
      enabled: false,
      value: 7.83,
      min: 0.5,
      max: 40.0,
      step: 0.01,
      description: 'Creates frequency difference between ears'
    },
    chorus: {
      id: 'chorus',
      name: 'Chorus',
      enabled: false,
      value: 2.0,
      min: 0.1,
      max: 8.0,
      step: 0.1,
      description: 'Adds richness through subtle detuning'
    },
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4.0,
      min: 0.1,
      max: 20.0,
      step: 0.1,
      description: 'Rapid volume modulation effect'
    },
    noise: {
      id: 'noise',
      name: 'Noise',
      enabled: false,
      value: 10,
      min: 0,
      max: 100,
      step: 1,
      type: 'white',
      color: 0,
      density: 0.2,
      description: 'Adds textural noise to the signal'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 2.0,
      min: 0.1,
      max: 12.0,
      step: 0.1,
      description: 'Creates sweeping filter effects'
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 4,
      min: 1,
      max: 32,
      step: 1,
      pattern: [1, 0, 1, 0],
      probability: 0.5,
      intensity: 0.8,
      description: 'Creates rhythmic interruptions'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 2.0,
      min: 0.1,
      max: 8.0,
      step: 0.1,
      direction: 'up',
      octaves: 4,
      description: 'Infinite rising/falling tone illusion'
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      pattern: [1, 1, 0, 1],
      probability: 0.3,
      intensity: 0.6,
      description: 'Adds digital artifacts and glitches'
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      feedback: 0.7,
      mix: 0.5,
      description: 'Creates stereo delay patterns'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      roomSize: 'medium',
      decayTime: 2.0,
      earlyReflections: -6,
      diffusion: 50,
      wetDryMix: 30,
      preDelay: 20,
      highDamping: 20,
      lowDamping: 20,
      description: 'Adds space and depth to the sound'
    }
  }
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(defaultState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const effectNodesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    return () => {
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const setupAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        // Check for window object and AudioContext/webkitAudioContext
        if (typeof window !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          
          if (!AudioContextClass) {
            console.error('Web Audio API is not supported in this environment');
            return null;
          }
          
          audioContextRef.current = new AudioContextClass();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
        } else {
          console.error('Window object is not available in this environment');
          return null;
        }
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        return null;
      }
    }
    return audioContextRef.current;
  };

  const createReverbNode = async (ctx: AudioContext) => {
    const reverbEffect = state.effects.reverb;
    if (!reverbEffect?.enabled) return null;

    const convolver = ctx.createConvolver();
    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    
    // Create impulse response
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * (reverbEffect.decayTime || 2.0);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (reverbEffect.decayTime * sampleRate));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    
    convolver.buffer = impulse;
    wetGain.gain.value = reverbEffect.wetDryMix / 100;
    dryGain.gain.value = 1 - (reverbEffect.wetDryMix / 100);
    
    return { convolver, wetGain, dryGain };
  };

  const togglePlayback = async () => {
    const ctx = setupAudioContext();
    
    if (!ctx) {
      console.error('Failed to initialize audio context');
      return;
    }
    
    if (state.isPlaying) {
      oscillatorsRef.current.forEach(osc => osc.stop());
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    // Create and connect nodes
    const masterGain = ctx.createGain();
    masterGain.connect(analyserRef.current!);
    analyserRef.current!.connect(ctx.destination);

    // Initialize effect nodes
    const reverbNode = await createReverbNode(ctx);
    if (reverbNode) {
      effectNodesRef.current.reverb = reverbNode;
      reverbNode.convolver.connect(reverbNode.wetGain);
      reverbNode.wetGain.connect(masterGain);
    }

    // Create oscillators
    state.channels.forEach((channel, i) => {
      if (!channel.enabled) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = channel.waveform;
      osc.frequency.setValueAtTime(channel.frequency, ctx.currentTime);
      
      // Connect through effects chain
      osc.connect(gainNode);
      if (reverbNode && state.effects.reverb.enabled) {
        gainNode.connect(reverbNode.convolver);
        gainNode.connect(reverbNode.dryGain);
        reverbNode.dryGain.connect(masterGain);
      } else {
        gainNode.connect(masterGain);
      }

      oscillatorsRef.current.push(osc);
      gainNodesRef.current.push(gainNode);
      osc.start();
    });

    setState(prev => ({ ...prev, isPlaying: true }));
  };

  const updateChannel = (id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch => 
        ch.id === id ? { ...ch, ...updates } : ch
      )
    }));

    // Update running oscillators
    if (state.isPlaying) {
      const idx = state.channels.findIndex(ch => ch.id === id);
      const osc = oscillatorsRef.current[idx];
      if (osc && updates.frequency) {
        osc.frequency.setValueAtTime(updates.frequency, audioContextRef.current!.currentTime);
      }
      if (osc && updates.waveform) {
        osc.type = updates.waveform;
      }
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

    // Update running effects
    if (state.isPlaying && id === 'reverb') {
      const reverbNode = effectNodesRef.current.reverb;
      if (reverbNode && updates.wetDryMix !== undefined) {
        reverbNode.wetGain.gain.setValueAtTime(
          updates.wetDryMix / 100,
          audioContextRef.current!.currentTime
        );
        reverbNode.dryGain.gain.setValueAtTime(
          1 - (updates.wetDryMix / 100),
          audioContextRef.current!.currentTime
        );
      }
    }
  };

  const serializeState = () => {
    return {
      channels: state.channels,
      effects: state.effects
    };
  };

  const deserializeState = (savedState: any): boolean => {
    try {
      if (!savedState.channels || !savedState.effects) return false;
      
      setState(prev => ({
        ...prev,
        channels: savedState.channels,
        effects: savedState.effects
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  };

  const sharePreset = async (name: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('presets')
        .insert({
          name,
          data: serializeState(),
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error sharing preset:', error);
      throw new Error('Failed to share preset');
    }
  };

  const loadPreset = async (id: string): Promise<boolean> => {
    try {
      // Handle old-style config parameter
      if (id.startsWith('config=')) {
        const config = JSON.parse(atob(id.replace('config=', '')));
        return deserializeState(config);
      }

      // Handle new-style preset IDs
      const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!preset) {
        throw new Error('Preset not found');
      }

      // Increment views
      await supabase.rpc('increment_preset_views', { preset_id: id });

      return deserializeState(preset.data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  };

  return (
    <AudioContext.Provider value={{
      state,
      updateChannel,
      updateEffect,
      updateDuration: (duration: number) => setState(prev => ({ ...prev, duration })),
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