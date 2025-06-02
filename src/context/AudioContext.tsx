import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AudioState, FrequencyChannel, AudioEffect, Preset } from '../types';
import { buildToneGraph } from '../audio/buildToneGraph';
import { supabase } from '../lib/supabase';

const initialState: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 528, waveform: 'sine', enabled: false },
    { id: 3, frequency: 639, waveform: 'sine', enabled: false },
    { id: 4, frequency: 741, waveform: 'sine', enabled: false }
  ],
  duration: 30,
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
      description: 'Creates metallic tones and bell-like sounds'
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
      description: 'Sharp, rhythmic pulses'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      description: 'Left-right stereo movement'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.2,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Circular stereo motion'
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
      value: 2.5,
      min: 0.5,
      max: 8,
      step: 0.5,
      description: 'Rich, shimmering effect'
    },
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Smooth volume modulation'
    },
    noise: {
      id: 'noise',
      name: 'Noise',
      enabled: false,
      value: 20,
      min: 0,
      max: 100,
      step: 1,
      description: 'Adds texture and atmosphere'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 4,
      step: 0.1,
      description: 'Sweeping frequency effect'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      description: 'Adds space and depth'
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
      value: 0.1,
      min: 0.01,
      max: 1,
      step: 0.01,
      description: 'Infinite rising/falling effect'
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
    }
  }
};

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

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const outputNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateChannel = (id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      )
    }));
  };

  const updateEffect = (id: string, updates: Partial<AudioEffect>) => {
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
  };

  const updateDuration = (duration: number) => {
    setState(prev => ({
      ...prev,
      duration
    }));
  };

  const togglePlayback = () => {
    if (!state.isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
        analyserNodeRef.current = audioContextRef.current.createAnalyser();
        analyserNodeRef.current.fftSize = 2048;
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const outputNode = buildToneGraph(audioContextRef.current, state.channels, state.effects);
      outputNode.connect(analyserNodeRef.current!);
      analyserNodeRef.current!.connect(audioContextRef.current.destination);
      outputNodeRef.current = outputNode;
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
    }

    setState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  };

  const serializeState = () => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  };

  const deserializeState = (newState: any): boolean => {
    try {
      if (!newState.channels || !newState.effects || !newState.duration) {
        return false;
      }

      setState(prev => ({
        ...prev,
        channels: newState.channels,
        effects: newState.effects,
        duration: newState.duration
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
        try {
          const configStr = id.replace('config=', '');
          const config = JSON.parse(decodeURIComponent(configStr));
          return deserializeState(config);
        } catch (error) {
          console.error('Failed to parse config:', error);
          return false;
        }
      }

      // Handle new-style preset IDs
      const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !preset) {
        console.error('Failed to load preset:', error);
        return false;
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
        audioContext: audioContextRef.current,
        analyserNode: analyserNodeRef.current
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