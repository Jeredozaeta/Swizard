import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AudioContextType, AudioState, FrequencyChannel, AudioEffect } from '../types';
import { buildToneGraph } from '../audio/buildToneGraph';
import { supabase } from '../lib/supabase';

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4.8,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Amplitude modulation effect that creates a rhythmic pulsing'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Automated panning between left and right channels'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Creates a sweeping filter effect'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 1.0,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Ring modulation effect for metallic tones'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.2,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Full 360-degree spatial panning effect'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Iso Pulses',
      enabled: false,
      value: 4,
      min: 0.5,
      max: 12,
      step: 0.5,
      description: 'Isochronic pulse generator for entrainment'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 2.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Adds space and depth to the sound'
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const graphNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current?.state === 'running') {
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
        [id]: { ...prev.effects[id], ...updates }
      }
    }));
  };

  const updateDuration = (duration: number) => {
    setState(prev => ({ ...prev, duration }));
  };

  const togglePlayback = () => {
    if (!state.isPlaying) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      
      const outputNode = buildToneGraph(ctx, state.channels, state.effects);
      outputNode.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserNodeRef.current = analyser;
      graphNodeRef.current = outputNode;
    } else {
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      analyserNodeRef.current = null;
      graphNodeRef.current = null;
    }
    
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const serializeState = () => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  };

  const deserializeState = (data: any): boolean => {
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
  };

  const sharePreset = async (name: string): Promise<string> => {
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
  };

  const loadPreset = async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('presets')
        .select()
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return false;

      return deserializeState(data.data);
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