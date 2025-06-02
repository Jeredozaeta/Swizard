import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AudioContextType, AudioState, FrequencyChannel, AudioEffect } from '../types';
import { buildToneGraph } from '../audio/buildToneGraph';
import { supabase } from '../lib/supabase';

const defaultState: AudioState = {
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
      value: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: 'Creates metallic tones through amplitude modulation'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 2.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: 'Modulates volume for tremolo effects'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Isochronic',
      enabled: false,
      value: 4.0,
      min: 0.5,
      max: 12.0,
      step: 0.5,
      description: 'Creates rhythmic on/off pulses'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      description: 'Moves sound between left and right channels'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      description: 'Creates immersive spatial movement'
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
      value: 2.5,
      min: 0.5,
      max: 8.0,
      step: 0.5,
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
      description: 'Creates volume oscillation effects'
    },
    noise: {
      id: 'noise',
      name: 'Noise Mix',
      enabled: false,
      value: 0.1,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      description: 'Blends in filtered noise'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      description: 'Creates sweeping filter effects'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 33,
      min: 0,
      max: 100,
      step: 33,
      description: 'Adds spatial depth and ambience',
      roomSize: 'small',
      decayTime: 1.5,
      earlyReflections: 0.7,
      diffusion: 0.5,
      wetDryMix: 0.3,
      preDelay: 0.01,
      highDamping: 0.2,
      lowDamping: 0.3
    }
  }
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(defaultState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const outputNodeRef = useRef<AudioNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const togglePlayback = () => {
    setState(prev => {
      const newIsPlaying = !prev.isPlaying;

      if (newIsPlaying) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserNodeRef.current = audioContextRef.current.createAnalyser();
          analyserNodeRef.current.fftSize = 2048;
        }

        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const outputNode = buildToneGraph(audioContextRef.current, prev.channels, prev.effects);
        outputNode.connect(analyserNodeRef.current!);
        analyserNodeRef.current!.connect(audioContextRef.current.destination);
        outputNodeRef.current = outputNode;
      } else {
        if (audioContextRef.current?.state === 'running') {
          audioContextRef.current.suspend();
        }
        if (outputNodeRef.current) {
          outputNodeRef.current.disconnect();
          outputNodeRef.current = null;
        }
      }

      return { ...prev, isPlaying: newIsPlaying };
    });
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

  const deserializeState = (savedState: any): boolean => {
    try {
      if (!savedState.channels || !savedState.effects || !savedState.duration) {
        return false;
      }

      setState(prev => ({
        ...prev,
        channels: savedState.channels,
        effects: savedState.effects,
        duration: savedState.duration
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
      // Handle old-style config parameter
      if (id.startsWith('config=')) {
        try {
          const config = JSON.parse(atob(id.replace('config=', '')));
          return deserializeState(config);
        } catch {
          return false;
        }
      }

      // Handle new-style preset IDs
      const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !preset) return false;

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
      updateDuration,
      togglePlayback,
      serializeState,
      deserializeState,
      sharePreset,
      loadPreset,
      audioContext: audioContextRef.current,
      analyserNode: analyserNodeRef.current
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