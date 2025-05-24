import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { AudioContextType, AudioState, FrequencyChannel, AudioEffect, Preset } from '../types';
import { embedFingerprint, generateFingerprint } from '../audio/metadata';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const initialState: AudioState = {
  channels: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    frequency: 432,
    waveform: 'sine',
    enabled: true
  })),
  duration: 30,
  isPlaying: false,
  effects: {
    ringMod: {
      id: 'ringMod',
      name: 'Ring Modulation',
      enabled: false,
      value: 1,
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
      description: 'Modulates volume for tremolo effects'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Isochronic',
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
      description: 'Rotates sound around listener'
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
      description: 'Blends in filtered noise'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 12,
      step: 0.1,
      description: 'Creates sweeping effects'
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 4,
      min: 1,
      max: 32,
      step: 1,
      description: 'Adds rhythmic interruptions'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 8,
      step: 0.1,
      description: 'Creates an endless rising/falling effect'
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 25,
      min: 0,
      max: 100,
      step: 1,
      description: 'Adds digital artifacts and distortion'
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Creates stereo delay patterns'
    }
  }
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const effectNodesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.connect(ctx.destination);
    setAnalyserNode(analyser);

    return () => {
      ctx.close();
    };
  }, []);

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
        [id]: {
          ...prev.effects[id],
          ...updates
        }
      }
    }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioContext) return;

    setState(prev => {
      const isPlaying = !prev.isPlaying;

      if (isPlaying) {
        oscillatorsRef.current.forEach(osc => osc?.stop());
        oscillatorsRef.current = [];
        gainNodesRef.current = [];

        prev.channels.forEach((channel, i) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.type = channel.waveform;
          oscillator.frequency.setValueAtTime(channel.frequency, audioContext.currentTime);
          
          oscillator.connect(gainNode);
          gainNode.connect(analyserNode!);
          
          oscillator.start();
          oscillatorsRef.current[i] = oscillator;
          gainNodesRef.current[i] = gainNode;
        });
      } else {
        oscillatorsRef.current.forEach(osc => osc?.stop());
        oscillatorsRef.current = [];
        gainNodesRef.current = [];
      }

      return { ...prev, isPlaying };
    });
  }, [audioContext, analyserNode]);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((data: any): boolean => {
    try {
      if (!data) return false;
      
      setState(prev => ({
        ...prev,
        channels: Array.isArray(data.channels) ? data.channels : prev.channels,
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
      const presetData = serializeState();
      
      const { data, error } = await supabase
        .from('presets')
        .insert({
          name,
          data: presetData,
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
  }, [serializeState]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
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
  }, [deserializeState]);

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
      audioContext,
      analyserNode
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