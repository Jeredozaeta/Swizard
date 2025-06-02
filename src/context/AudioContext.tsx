import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AudioContext as WebAudioContext, OfflineAudioContext } from 'standardized-audio-context';
import { buildToneGraph } from '../audio/buildToneGraph';
import { AudioState, AudioContextType, FrequencyChannel, AudioEffect, Preset } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

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
      value: 0.2,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Creates a sweeping filter effect'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 7.83,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Ring modulation for complex harmonic effects'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.2,
      min: 0.1,
      max: 5,
      step: 0.1,
      description: 'Circular panning for immersive spatial effects'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Iso Pulses',
      enabled: false,
      value: 7.83,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Isochronic pulses for brainwave entrainment'
    },
    flanger: {
      id: 'flanger',
      name: 'Flanger',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Classic modulated delay effect for rich harmonics'
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const [audioContext, setAudioContext] = useState<WebAudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const graphNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContext?.state === 'running') {
        audioContext.close();
      }
    };
  }, []);

  const togglePlayback = () => {
    if (state.isPlaying) {
      if (audioContext?.state === 'running') {
        audioContext.close();
        setAudioContext(null);
        setAnalyserNode(null);
      }
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      const ctx = new WebAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);

      graphNodeRef.current = buildToneGraph(ctx, state.channels, state.effects);
      graphNodeRef.current.connect(analyser);

      setAudioContext(ctx);
      setAnalyserNode(analyser);
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const updateChannel = (id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch => 
        ch.id === id ? { ...ch, ...updates } : ch
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
      let preset: Preset;

      if (id.startsWith('config=')) {
        // Legacy format
        const config = JSON.parse(atob(id.replace('config=', '')));
        preset = {
          id: 'legacy',
          name: 'Imported Preset',
          data: config,
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
          views: 0
        };
      } else {
        // New format
        const { data, error } = await supabase
          .rpc('increment_preset_views', { preset_id: id })
          .then(() => supabase
            .from('presets')
            .select()
            .eq('id', id)
            .single()
          );

        if (error) throw error;
        if (!data) throw new Error('Preset not found');
        preset = data;
      }

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