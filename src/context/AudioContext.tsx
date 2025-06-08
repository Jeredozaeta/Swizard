import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { AudioState, FrequencyChannel, AudioEffect, AudioContextType, Preset } from '../types';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

// Initial state with 4 channels but only first one enabled for free users
const initialChannels: FrequencyChannel[] = [
  { id: 1, frequency: 432, waveform: 'sine', enabled: true },
  { id: 2, frequency: 528, waveform: 'sine', enabled: false },
  { id: 3, frequency: 639, waveform: 'sine', enabled: false },
  { id: 4, frequency: 741, waveform: 'sine', enabled: false },
];

const initialEffects: Record<string, AudioEffect> = {
  ringMod: {
    id: 'ringMod',
    name: 'Ring Mod',
    enabled: false,
    value: 10,
    min: 1,
    max: 50,
    step: 1,
    description: 'Ring modulation creates metallic, bell-like tones by multiplying the audio signal with a carrier frequency.'
  },
  amplitudeMod: {
    id: 'amplitudeMod',
    name: 'Amplitude Mod',
    enabled: false,
    value: 4,
    min: 0.1,
    max: 20,
    step: 0.1,
    description: 'Amplitude modulation creates tremolo effects by varying the volume at a specific rate.'
  },
  isoPulses: {
    id: 'isoPulses',
    name: 'Iso Pulses',
    enabled: false,
    value: 10,
    min: 1,
    max: 40,
    step: 1,
    description: 'Isochronic pulses are evenly spaced beats that help synchronize brainwaves for enhanced focus and meditation.'
  },
  stereoPan: {
    id: 'stereoPan',
    name: 'Stereo Pan',
    enabled: false,
    value: 0.5,
    min: 0.1,
    max: 2,
    step: 0.1,
    description: 'Stereo panning moves sound between left and right channels, creating spatial audio effects.'
  },
  pan360: {
    id: 'pan360',
    name: '360° Pan',
    enabled: false,
    value: 0.2,
    min: 0.05,
    max: 1,
    step: 0.05,
    description: '360-degree panning creates immersive circular sound movement around the listener.'
  },
  binaural: {
    id: 'binaural',
    name: 'Binaural',
    enabled: false,
    value: 4,
    min: 0.5,
    max: 40,
    step: 0.5,
    description: 'Binaural beats occur when slightly different frequencies are played in each ear, promoting specific brainwave states.'
  },
  chorus: {
    id: 'chorus',
    name: 'Chorus',
    enabled: false,
    value: 0.5,
    min: 0.1,
    max: 2,
    step: 0.1,
    description: 'Chorus adds richness and depth by creating multiple delayed copies of the sound with slight pitch variations.'
  },
  tremolo: {
    id: 'tremolo',
    name: 'Tremolo',
    enabled: false,
    value: 4,
    min: 0.5,
    max: 20,
    step: 0.5,
    description: 'Tremolo creates rhythmic volume fluctuations, adding movement and texture to sustained tones.'
  },
  noise: {
    id: 'noise',
    name: 'Noise',
    enabled: false,
    value: 10,
    min: 1,
    max: 50,
    step: 1,
    description: 'Adds colored noise (white, pink, or brown) to mask distractions and enhance focus during meditation.'
  },
  phaser: {
    id: 'phaser',
    name: 'Phaser',
    enabled: false,
    value: 0.5,
    min: 0.1,
    max: 2,
    step: 0.1,
    description: 'Phaser creates sweeping, whooshing sounds by shifting the phase of the audio signal over time.'
  },
  reverb: {
    id: 'reverb',
    name: 'Reverb',
    enabled: false,
    value: 50,
    min: 10,
    max: 100,
    step: 10,
    description: 'Reverb simulates acoustic spaces, from intimate rooms to vast cathedrals, adding depth and atmosphere.'
  },
  stutter: {
    id: 'stutter',
    name: 'Stutter',
    enabled: false,
    value: 8,
    min: 2,
    max: 32,
    step: 2,
    description: 'Stutter effect creates rhythmic chopping and repeating of the audio signal for dynamic textures.'
  },
  shepard: {
    id: 'shepard',
    name: 'Shepard',
    enabled: false,
    value: 0.1,
    min: 0.05,
    max: 0.5,
    step: 0.05,
    description: 'Shepard tones create the illusion of continuously ascending or descending pitch, inducing deep meditative states.'
  },
  glitch: {
    id: 'glitch',
    name: 'Glitch',
    enabled: false,
    value: 20,
    min: 5,
    max: 50,
    step: 5,
    description: 'Glitch effects add digital artifacts and stutters, creating modern, experimental soundscapes.'
  },
  pingPong: {
    id: 'pingPong',
    name: 'Ping Pong',
    enabled: false,
    value: 0.3,
    min: 0.1,
    max: 0.8,
    step: 0.1,
    description: 'Ping pong delay bounces echoes between left and right channels, creating spacious stereo effects.'
  }
};

const initialState: AudioState = {
  channels: initialChannels,
  duration: 30,
  isPlaying: false,
  effects: initialEffects,
};

type AudioAction =
  | { type: 'UPDATE_CHANNEL'; id: number; updates: Partial<FrequencyChannel> }
  | { type: 'UPDATE_EFFECT'; id: string; updates: Partial<AudioEffect> }
  | { type: 'UPDATE_DURATION'; duration: number }
  | { type: 'TOGGLE_PLAYBACK' }
  | { type: 'LOAD_STATE'; state: AudioState };

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'UPDATE_CHANNEL':
      return {
        ...state,
        channels: state.channels.map(channel =>
          channel.id === action.id ? { ...channel, ...action.updates } : channel
        ),
      };
    case 'UPDATE_EFFECT':
      return {
        ...state,
        effects: {
          ...state.effects,
          [action.id]: { ...state.effects[action.id], ...action.updates },
        },
      };
    case 'UPDATE_DURATION':
      return { ...state, duration: action.duration };
    case 'TOGGLE_PLAYBACK':
      return { ...state, isPlaying: !state.isPlaying };
    case 'LOAD_STATE':
      return action.state;
    default:
      return state;
  }
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const { supabase } = useAuth();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const oscillatorsRef = useRef<Map<number, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<number, GainNode>>(new Map());
  const [isProUser, setIsProUser] = useState(false);

  // Check if user has Pro subscription
  useEffect(() => {
    const checkProStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsProUser(false);
          return;
        }

        const { data: subscriptions } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status');

        const hasActiveSubscription = subscriptions?.some(sub => 
          sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
        );

        setIsProUser(!!hasActiveSubscription);
      } catch (error) {
        console.error('Error checking Pro status:', error);
        setIsProUser(false);
      }
    };

    checkProStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkProStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Get free tier effect IDs (first 3 effects)
  const getFreeEffectIds = () => {
    const effectIds = Object.keys(initialEffects);
    return effectIds.slice(0, 3); // ringMod, amplitudeMod, isoPulses
  };

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    // For free users, only allow updates to channel 1
    if (!isProUser && id !== 1) {
      toast.error('Upgrade to Pro to unlock additional frequency channels', {
        icon: '🔒'
      });
      return;
    }

    dispatch({ type: 'UPDATE_CHANNEL', id, updates });
  }, [isProUser]);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    // For free users, only allow updates to first 3 effects
    if (!isProUser && !getFreeEffectIds().includes(id)) {
      toast.error('Upgrade to Pro to unlock all audio effects', {
        icon: '🔒'
      });
      return;
    }

    dispatch({ type: 'UPDATE_EFFECT', id, updates });
  }, [isProUser]);

  const updateDuration = useCallback((duration: number) => {
    // For free users, cap duration at 30 seconds
    if (!isProUser && duration > 30) {
      toast.error('Upgrade to Pro for longer audio durations', {
        icon: '🔒'
      });
      return;
    }

    dispatch({ type: 'UPDATE_DURATION', duration });
  }, [isProUser]);

  const togglePlayback = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      analyserNodeRef.current.connect(audioContextRef.current.destination);
    }

    if (state.isPlaying) {
      // Stop all oscillators
      oscillatorsRef.current.forEach(osc => osc.stop());
      oscillatorsRef.current.clear();
      gainNodesRef.current.clear();
    } else {
      // Start oscillators for enabled channels
      const enabledChannels = state.channels.filter(channel => channel.enabled);
      
      // For free users, only allow first channel
      const channelsToPlay = isProUser ? enabledChannels : enabledChannels.filter(ch => ch.id === 1);
      
      channelsToPlay.forEach(channel => {
        const osc = audioContextRef.current!.createOscillator();
        const gain = audioContextRef.current!.createGain();
        
        osc.type = channel.waveform;
        osc.frequency.value = channel.frequency;
        gain.gain.value = 0.1 / Math.max(1, channelsToPlay.length);
        
        osc.connect(gain);
        gain.connect(analyserNodeRef.current!);
        
        osc.start();
        
        oscillatorsRef.current.set(channel.id, osc);
        gainNodesRef.current.set(channel.id, gain);
      });

      // For free users, auto-stop after 30 seconds
      if (!isProUser) {
        setTimeout(() => {
          if (state.isPlaying) {
            dispatch({ type: 'TOGGLE_PLAYBACK' });
            oscillatorsRef.current.forEach(osc => osc.stop());
            oscillatorsRef.current.clear();
            gainNodesRef.current.clear();
            toast.info('Upgrade to Pro for unlimited playback duration', {
              icon: '⏰'
            });
          }
        }, 30000);
      }
    }

    dispatch({ type: 'TOGGLE_PLAYBACK' });
  }, [state.isPlaying, state.channels, isProUser]);

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration,
    };
  }, [state]);

  const deserializeState = useCallback((serializedState: any): boolean => {
    try {
      const newState: AudioState = {
        channels: serializedState.channels || initialChannels,
        effects: { ...initialEffects, ...serializedState.effects },
        duration: serializedState.duration || 30,
        isPlaying: false,
      };
      
      dispatch({ type: 'LOAD_STATE', state: newState });
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  }, []);

  const sharePreset = useCallback(async (name: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Authentication required to share presets');
      }

      const { data, error } = await supabase
        .from('presets')
        .insert({
          user_id: session.user.id,
          name,
          data: serializeState(),
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to share preset');
    }
  }, [serializeState, supabase]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Handle old-style config parameter
      if (id.startsWith('config=')) {
        const configData = id.replace('config=', '');
        try {
          const decodedData = JSON.parse(decodeURIComponent(configData));
          return deserializeState(decodedData);
        } catch (error) {
          console.error('Failed to parse config data:', error);
          return false;
        }
      }

      // Handle new-style preset IDs
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
  }, [deserializeState, supabase]);

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
    analyserNode: analyserNodeRef.current,
    isProUser,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};