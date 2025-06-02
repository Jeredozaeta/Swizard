import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AudioState, FrequencyChannel, AudioEffect, Preset } from '../types';
import { buildToneGraph } from '../audio/buildToneGraph';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

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
      description: 'Rhythmic volume modulation'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0.5,
      min: -100,
      max: 100,
      step: 1,
      description: 'Left/right channel balance'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Sweeping frequency filter'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 1.0,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'AM synthesis modulation'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.2,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Circular stereo panning'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Iso Pulses',
      enabled: false,
      value: 4.0,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Isochronic pulse generator'
    },
    noise: {
      id: 'noise',
      name: 'Noise',
      enabled: false,
      value: 10,
      min: 0,
      max: 100,
      step: 1,
      description: 'White noise blend',
      type: 'white',
      color: 0,
      density: 0.2
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 0.1,
      min: 0.01,
      max: 1,
      step: 0.01,
      description: 'Infinite rising/falling tone',
      direction: 'up',
      octaves: 4
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 4,
      min: 1,
      max: 20,
      step: 1,
      description: 'Random audio artifacts',
      pattern: [1, 0, 1, 1, 0],
      probability: 0.3,
      intensity: 0.5
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Stereo delay effect',
      feedback: 0.7,
      mix: 0.5
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      description: 'Room size and reflections',
      roomSize: 'medium',
      decayTime: 2.5,
      earlyReflections: 0.7,
      diffusion: 0.5,
      wetDryMix: 0.3,
      preDelay: 0.02,
      highDamping: 0.2,
      lowDamping: 0.3
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const outputNodeRef = useRef<AudioNode | null>(null);

  const cleanupAudio = useCallback(() => {
    if (outputNodeRef.current) {
      outputNodeRef.current.disconnect();
      outputNodeRef.current = null;
    }
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserNodeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const togglePlayback = useCallback(() => {
    setState(prevState => {
      const newIsPlaying = !prevState.isPlaying;

      if (newIsPlaying) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserNodeRef.current = audioContextRef.current.createAnalyser();
          analyserNodeRef.current.fftSize = 2048;
        }

        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const outputNode = buildToneGraph(
          audioContextRef.current,
          prevState.channels,
          prevState.effects
        );

        if (outputNode) {
          outputNode.connect(analyserNodeRef.current!);
          analyserNodeRef.current!.connect(audioContextRef.current.destination);
          outputNodeRef.current = outputNode;
        }
      } else {
        cleanupAudio();
      }

      return { ...prevState, isPlaying: newIsPlaying };
    });
  }, [cleanupAudio]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    setState(prevState => ({
      ...prevState,
      channels: prevState.channels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      )
    }));
  }, []);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    setState(prevState => ({
      ...prevState,
      effects: {
        ...prevState.effects,
        [id]: {
          ...prevState.effects[id],
          ...updates
        }
      }
    }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setState(prevState => ({
      ...prevState,
      duration
    }));
  }, []);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((newState: any): boolean => {
    try {
      if (!newState.channels || !Array.isArray(newState.channels)) {
        return false;
      }

      setState(prevState => ({
        ...prevState,
        channels: newState.channels,
        effects: newState.effects || prevState.effects,
        duration: newState.duration || prevState.duration
      }));

      return true;
    } catch (error) {
      console.error('Error deserializing state:', error);
      return false;
    }
  }, []);

  const sharePreset = useCallback(async (name: string): Promise<string> => {
    try {
      const presetData = {
        id: uuidv4(),
        name,
        data: serializeState()
      };

      const { error } = await supabase
        .from('presets')
        .insert(presetData);

      if (error) throw error;

      return presetData.id;
    } catch (error) {
      console.error('Error sharing preset:', error);
      throw new Error('Failed to share preset');
    }
  }, [serializeState]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Handle old-style config parameter
      if (id.startsWith('config=')) {
        try {
          const configStr = id.replace('config=', '');
          const decodedConfig = decodeURIComponent(configStr);
          const config = JSON.parse(decodedConfig);
          return deserializeState(config);
        } catch (error) {
          console.error('Error parsing config:', error);
          return false;
        }
      }

      // Handle new-style preset IDs
      const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading preset:', error);
        return false;
      }

      if (!preset) {
        toast.error('Preset not found');
        return false;
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