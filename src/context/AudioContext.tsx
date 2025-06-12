import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { AudioState, FrequencyChannel, AudioEffect, AudioContextType } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const initialState: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 528, waveform: 'sine', enabled: false },
    { id: 3, frequency: 639, waveform: 'sine', enabled: false },
    { id: 4, frequency: 741, waveform: 'sine', enabled: false },
  ],
  duration: 30,
  isPlaying: false,
  effects: {
    ringMod: {
      id: 'ringMod',
      name: 'Ring Modulation',
      enabled: false,
      value: 10,
      min: 0.1,
      max: 50,
      step: 0.1,
      description: 'Creates metallic, bell-like tones through frequency modulation'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Rhythmic volume pulsing that enhances focus and attention'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Isochronic Pulses',
      enabled: false,
      value: 10,
      min: 0.5,
      max: 40,
      step: 0.5,
      description: 'Precise rhythmic pulses for brainwave entrainment'
    },
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Smooth left-right audio movement for spatial awareness'
    },
    pan360: {
      id: 'pan360',
      name: '360° Pan',
      enabled: false,
      value: 0.2,
      min: 0.05,
      max: 1,
      step: 0.05,
      description: 'Circular audio movement for immersive meditation'
    },
    binaural: {
      id: 'binaural',
      name: 'Binaural Beats',
      enabled: false,
      value: 8,
      min: 0.5,
      max: 40,
      step: 0.5,
      description: 'Different frequencies in each ear for brainwave synchronization'
    },
    chorus: {
      id: 'chorus',
      name: 'Chorus',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Rich, layered sound texture for depth and warmth'
    },
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Gentle volume oscillation for rhythmic meditation'
    },
    noise: {
      id: 'noise',
      name: 'Background Noise',
      enabled: false,
      value: 10,
      min: 0,
      max: 50,
      step: 1,
      description: 'Subtle background texture to mask distractions'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Sweeping filter effect for dynamic soundscapes'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 50,
      min: 10,
      max: 100,
      step: 10,
      description: 'Spatial depth and ambience for immersive experience'
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 8,
      min: 1,
      max: 32,
      step: 1,
      description: 'Rhythmic audio cuts for focus and attention training'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 0.1,
      min: 0.05,
      max: 0.5,
      step: 0.05,
      description: 'Infinitely ascending/descending illusion for deep states'
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 20,
      min: 5,
      max: 50,
      step: 5,
      description: 'Digital artifacts and stutters for modern soundscapes'
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong Delay',
      enabled: false,
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Bouncing echo effect between left and right channels'
    }
  }
};

type AudioAction =
  | { type: 'UPDATE_CHANNEL'; id: number; updates: Partial<FrequencyChannel> }
  | { type: 'UPDATE_EFFECT'; id: string; updates: Partial<AudioEffect> }
  | { type: 'UPDATE_DURATION'; duration: number }
  | { type: 'TOGGLE_PLAYBACK' }
  | { type: 'SET_STATE'; state: AudioState };

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'UPDATE_CHANNEL':
      return {
        ...state,
        channels: state.channels.map(channel =>
          channel.id === action.id
            ? { ...channel, ...action.updates }
            : channel
        )
      };
    case 'UPDATE_EFFECT':
      return {
        ...state,
        effects: {
          ...state.effects,
          [action.id]: {
            ...state.effects[action.id],
            ...action.updates
          }
        }
      };
    case 'UPDATE_DURATION':
      return {
        ...state,
        duration: action.duration
      };
    case 'TOGGLE_PLAYBACK':
      return {
        ...state,
        isPlaying: !state.isPlaying
      };
    case 'SET_STATE':
      return action.state;
    default:
      return state;
  }
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const oscillatorsRef = useRef<Map<number, Tone.Oscillator>>(new Map());
  const effectsRef = useRef<Map<string, any>>(new Map());
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Free tier: only first channel is unlocked
  const isPro = false; // This would come from your auth/subscription context

  useEffect(() => {
    const initAudio = async () => {
      try {
        if (Tone.context.state === 'suspended') {
          await Tone.start();
        }
        
        // Create master gain and compressor
        masterGainRef.current = new Tone.Gain(0.8);
        const compressor = new Tone.Compressor({
          threshold: -24,
          ratio: 12,
          attack: 0.003,
          release: 0.25
        });
        
        masterGainRef.current.connect(compressor);
        compressor.toDestination();

        // Create analyser for waveform visualization
        audioContextRef.current = Tone.context.rawContext as AudioContext;
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Connect to analyser
        compressor.connect(analyserRef.current);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.dispose();
        } catch (e) {
          // Oscillator might already be stopped
        }
      });
      oscillatorsRef.current.clear();
      
      effectsRef.current.forEach(effect => {
        try {
          effect.dispose?.();
        } catch (e) {
          // Effect might already be disposed
        }
      });
      effectsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!masterGainRef.current) return;

    const enabledChannels = state.channels.filter(c => c.enabled);
    
    // Stop all current oscillators
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.dispose();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    oscillatorsRef.current.clear();

    if (state.isPlaying && enabledChannels.length > 0) {
      enabledChannels.forEach(channel => {
        try {
          // For free users, force channels 2-4 to 0 Hz (silent)
          const actualFrequency = (!isPro && channel.id > 1) ? 0 : channel.frequency;
          
          // Skip creating oscillator if frequency is 0
          if (actualFrequency === 0) return;
          
          const osc = new Tone.Oscillator({
            type: channel.waveform,
            frequency: actualFrequency,
          });
          
          const channelGain = new Tone.Gain(1 / Math.max(1, enabledChannels.length));
          osc.connect(channelGain);
          channelGain.connect(masterGainRef.current!);
          
          osc.start();
          oscillatorsRef.current.set(channel.id, osc);
        } catch (error) {
          console.error(`Failed to create oscillator for channel ${channel.id}:`, error);
        }
      });
    }
  }, [state.isPlaying, state.channels, isPro]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    // For free users, force channels 2-4 to have 0 Hz frequency
    if (!isPro && id > 1 && updates.frequency !== undefined) {
      updates = { ...updates, frequency: 0 };
    }
    
    dispatch({ type: 'UPDATE_CHANNEL', id, updates });
  }, [isPro]);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    dispatch({ type: 'UPDATE_EFFECT', id, updates });
  }, []);

  const updateDuration = useCallback((duration: number) => {
    dispatch({ type: 'UPDATE_DURATION', duration });
  }, []);

  const togglePlayback = useCallback(async () => {
    try {
      if (Tone.context.state === 'suspended') {
        await Tone.start();
      }
      dispatch({ type: 'TOGGLE_PLAYBACK' });
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      toast.error('Failed to start audio playback');
    }
  }, []);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((serializedState: any): boolean => {
    try {
      if (!serializedState || typeof serializedState !== 'object') {
        return false;
      }

      const newState: AudioState = {
        ...initialState,
        channels: serializedState.channels || initialState.channels,
        effects: { ...initialState.effects, ...serializedState.effects },
        duration: serializedState.duration || initialState.duration,
        isPlaying: false
      };

      dispatch({ type: 'SET_STATE', state: newState });
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  }, []);

  const sharePreset = useCallback(async (name: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required to share presets');
      }

      const presetData = serializeState();
      
      const { data, error } = await supabase
        .from('presets')
        .insert({
          user_id: session.user.id,
          name,
          data: presetData
        })
        .select('id')
        .single();

      if (error) throw error;
      
      return data.id;
    } catch (error: any) {
      console.error('Failed to share preset:', error);
      throw new Error(error.message || 'Failed to create share link');
    }
  }, [serializeState]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Handle legacy config format
      if (id.startsWith('config=')) {
        const configData = id.replace('config=', '');
        try {
          const decodedData = JSON.parse(decodeURIComponent(configData));
          return deserializeState(decodedData);
        } catch (error) {
          console.error('Failed to parse legacy config:', error);
          return false;
        }
      }

      // Handle new preset format
      const { data, error } = await supabase
        .from('presets')
        .select('data')
        .eq('id', id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        console.error('Preset not found or expired:', error);
        return false;
      }

      // Increment view count
      await supabase.rpc('increment_preset_views', { preset_id: id });

      return deserializeState(data.data);
    } catch (error) {
      console.error('Failed to load preset:', error);
      return false;
    }
  }, [deserializeState]);

  const value: AudioContextType = {
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