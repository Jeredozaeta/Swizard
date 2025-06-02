import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
      description: 'Creates a sweeping filter effect through frequency spectrum'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'AM Mod',
      enabled: false,
      value: 2.0,
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
      description: 'Circular panning for immersive spatial effects'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Iso Pulses',
      enabled: false,
      value: 4.0,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Isochronic pulse generator for entrainment'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 30,
      min: 1,
      max: 100,
      step: 1,
      description: 'Adds space and depth with algorithmic reverb'
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const currentGraphRef = useRef<{ nodes: AudioNode[]; oscillators: OscillatorNode[] }>({
    nodes: [],
    oscillators: []
  });

  const cleanupAudioGraph = useCallback(() => {
    if (currentGraphRef.current) {
      currentGraphRef.current.oscillators.forEach(osc => osc.stop());
      currentGraphRef.current.nodes.forEach(node => node.disconnect());
      currentGraphRef.current = { nodes: [], oscillators: [] };
    }
  }, []);

  const togglePlayback = useCallback(() => {
    setState(prev => {
      if (prev.isPlaying) {
        cleanupAudioGraph();
        return { ...prev, isPlaying: false };
      } else {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyser.connect(ctx.destination);
        setAnalyserNode(analyser);

        const outputNode = buildToneGraph(ctx, prev.channels, prev.effects);
        outputNode.connect(analyser);

        return { ...prev, isPlaying: true };
      }
    });
  }, [cleanupAudioGraph]);

  const updateChannel = useCallback((id: number, updates: Partial<FrequencyChannel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch => 
        ch.id === id ? { ...ch, ...updates } : ch
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

  const serializeState = useCallback(() => {
    return {
      channels: state.channels,
      effects: state.effects,
      duration: state.duration
    };
  }, [state]);

  const deserializeState = useCallback((newState: any): boolean => {
    try {
      setState(prev => ({
        ...prev,
        channels: newState.channels || prev.channels,
        effects: newState.effects || prev.effects,
        duration: newState.duration || prev.duration
      }));
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  }, []);

  const sharePreset = useCallback(async (name: string): Promise<string> => {
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
  }, [serializeState]);

  const loadPreset = useCallback(async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('presets')
      .select('data')
      .eq('id', id)
      .single();

    if (error) return false;
    return deserializeState(data.data);
  }, [deserializeState]);

  useEffect(() => {
    return () => {
      cleanupAudioGraph();
      if (audioContext?.state === 'running') {
        audioContext.close();
      }
    };
  }, [audioContext, cleanupAudioGraph]);

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