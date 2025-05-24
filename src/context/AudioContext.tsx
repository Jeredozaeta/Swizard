import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';
import { AudioState, AudioEffect, FrequencyChannel, AudioContextType } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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
      value: 1.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Creates metallic tones through amplitude modulation'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Modulates volume for tremolo-like effects'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Iso Pulses',
      enabled: false,
      value: 4,
      min: 0.5,
      max: 12,
      step: 0.5,
      description: 'Creates rhythmic pulses at specified frequency'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0,
      min: -100,
      max: 100,
      step: 1,
      description: 'Controls left-right balance'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 4,
      step: 0.1,
      description: 'Creates circular panning motion'
    },
    binaural: {
      id: 'binaural',
      name: 'Binaural',
      enabled: false,
      value: 7,
      min: 0.5,
      max: 40,
      step: 0.5,
      description: 'Generates binaural beat frequencies'
    },
    chorus: {
      id: 'chorus',
      name: 'Chorus',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 8,
      step: 0.1,
      description: 'Adds richness through subtle detuning'
    },
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Creates rhythmic volume modulation'
    },
    noise: {
      id: 'noise',
      name: 'Noise',
      enabled: false,
      value: 10,
      min: 0,
      max: 100,
      step: 1,
      description: 'Adds filtered noise to the signal'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 12,
      step: 0.1,
      description: 'Creates sweeping filter effects'
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 8,
      min: 1,
      max: 32,
      step: 1,
      description: 'Creates rhythmic gate effects'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard',
      enabled: false,
      value: 0.25,
      min: 0.1,
      max: 2,
      step: 0.05,
      description: 'Generates endless rising/falling tones'
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      description: 'Creates random audio artifacts'
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Alternating stereo delay effect'
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(defaultState);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const effectNodesRef = useRef<Record<string, AudioNode>>({});

  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const setupAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      setAudioContext(ctx);
      setAnalyserNode(analyser);
    }
  }, [audioContext]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      )
    }));
  }, []);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [id]: { ...prev.effects[id], ...updates }
      }
    }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const togglePlayback = useCallback(() => {
    setupAudioContext();
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [setupAudioContext]);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((data: any): boolean => {
    try {
      if (!data.channels || !data.effects || !data.duration) {
        return false;
      }

      setState(prev => ({
        ...prev,
        channels: data.channels,
        effects: data.effects,
        duration: data.duration
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
      let data;
      
      if (id.startsWith('config=')) {
        // Handle legacy config parameter
        const config = decodeURIComponent(id.replace('config=', ''));
        data = JSON.parse(atob(config));
      } else {
        // Handle new preset IDs
        const { data: preset, error } = await supabase
          .from('presets')
          .select('data')
          .eq('id', id)
          .single();

        if (error) throw error;
        data = preset.data;

        // Increment views
        await supabase.rpc('increment_preset_views', { preset_id: id });
      }

      return deserializeState(data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  }, [deserializeState]);

  const value = {
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
  };

  return (
    <AudioContext.Provider value={value}>
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