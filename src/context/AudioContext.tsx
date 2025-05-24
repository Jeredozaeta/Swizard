import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AudioState, AudioContextType, FrequencyChannel, AudioEffect, Preset } from '../types';
import { supabase } from '../lib/supabase';

const defaultChannels: FrequencyChannel[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  frequency: 440,
  waveform: 'sine',
  enabled: true
}));

const defaultEffects: Record<string, AudioEffect> = {
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
    max: 20.0,
    step: 0.1,
    description: 'Modulates volume for tremolo effects'
  },
  isoPulses: {
    id: 'isoPulses',
    name: 'Isochronic',
    enabled: false,
    value: 4.0,
    min: 0.5,
    max: 40.0,
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
    value: 0.5,
    min: 0.1,
    max: 2.0,
    step: 0.1,
    description: 'Rotates sound in 360 degrees'
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
    value: 0.5,
    min: 0.1,
    max: 4.0,
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
    description: 'Adds rhythmic interruptions'
  },
  shepard: {
    id: 'shepard',
    name: 'Shepard Tone',
    enabled: false,
    value: 2.0,
    min: 0.1,
    max: 8.0,
    step: 0.1,
    description: 'Creates an infinitely rising/falling tone'
  },
  glitch: {
    id: 'glitch',
    name: 'Glitch',
    enabled: false,
    value: 25,
    min: 0,
    max: 100,
    step: 1,
    description: 'Adds digital artifacts and glitches'
  },
  pingPong: {
    id: 'pingPong',
    name: 'Ping Pong',
    enabled: false,
    value: 0.3,
    min: 0.1,
    max: 1.0,
    step: 0.1,
    description: 'Creates stereo delay patterns'
  }
};

const initialState: AudioState = {
  channels: defaultChannels,
  duration: 30,
  isPlaying: false,
  effects: defaultEffects
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);

  const setupAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new window.AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      setAudioContext(ctx);
      setAnalyserNode(analyser);
    }
  }, [audioContext]);

  const startOscillators = useCallback(() => {
    if (!audioContext || !analyserNode) return;

    oscillatorsRef.current.forEach(osc => osc?.stop());
    gainNodesRef.current.forEach(gain => gain?.disconnect());
    oscillatorsRef.current = [];
    gainNodesRef.current = [];

    state.channels.forEach((channel) => {
      if (!channel.enabled) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = channel.waveform;
      oscillator.frequency.setValueAtTime(channel.frequency, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.5 / state.channels.length, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(analyserNode);

      oscillator.start();
      oscillatorsRef.current.push(oscillator);
      gainNodesRef.current.push(gainNode);
    });
  }, [audioContext, analyserNode, state.channels]);

  const stopOscillators = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc?.stop();
      } catch (e) {
        console.warn('Oscillator already stopped');
      }
    });
    gainNodesRef.current.forEach(gain => gain?.disconnect());
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioContext) {
      setupAudioContext();
      return;
    }

    if (state.isPlaying) {
      stopOscillators();
    } else {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      startOscillators();
    }

    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [audioContext, setupAudioContext, startOscillators, stopOscillators, state.isPlaying]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(channel =>
        channel.id === id ? { ...channel, ...updates } : channel
      )
    }));

    if (state.isPlaying && oscillatorsRef.current[id - 1]) {
      const oscillator = oscillatorsRef.current[id - 1];
      if (updates.frequency !== undefined) {
        oscillator.frequency.setValueAtTime(updates.frequency, audioContext?.currentTime || 0);
      }
      if (updates.waveform !== undefined) {
        oscillator.type = updates.waveform;
      }
    }
  }, [audioContext, state.isPlaying]);

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
      if (!preset) return false;

      // Update views count
      await supabase.rpc('increment_preset_views', { preset_id: id });

      return deserializeState(preset.data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  }, [deserializeState]);

  useEffect(() => {
    return () => {
      stopOscillators();
      audioContext?.close();
    };
  }, [audioContext, stopOscillators]);

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