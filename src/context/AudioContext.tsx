import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { 
  AudioState, 
  AudioContextType, 
  FrequencyChannel, 
  AudioEffect,
  Preset
} from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const initialState: AudioState = {
  channels: [
    { id: 1, frequency: 432, waveform: 'sine', enabled: true },
    { id: 2, frequency: 528, waveform: 'sine', enabled: true },
    { id: 3, frequency: 639, waveform: 'sine', enabled: true },
    { id: 4, frequency: 741, waveform: 'sine', enabled: true }
  ],
  duration: 300,
  isPlaying: false,
  effects: {
    stereoPan: {
      id: 'stereoPan',
      name: 'Stereo Pan',
      enabled: false,
      value: 0,
      min: -100,
      max: 100,
      step: 1,
      description: 'Control the left/right balance of the sound'
    },
    isoPulses: {
      id: 'isoPulses',
      name: 'Isochronic Pulses',
      enabled: false,
      value: 7.83,
      min: 0.5,
      max: 40,
      step: 0.1,
      description: 'Create rhythmic pulses at specific frequencies'
    },
    ringMod: {
      id: 'ringMod',
      name: 'Ring Modulation',
      enabled: false,
      value: 10,
      min: 1,
      max: 100,
      step: 1,
      description: 'Classic ring modulation effect'
    },
    amplitudeMod: {
      id: 'amplitudeMod',
      name: 'Amplitude Mod',
      enabled: false,
      value: 5,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Modulate the amplitude over time'
    },
    pan360: {
      id: 'pan360',
      name: '360° Panning',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Circular panning effect'
    },
    binaural: {
      id: 'binaural',
      name: 'Binaural Beats',
      enabled: false,
      value: 7.83,
      min: 0.5,
      max: 40,
      step: 0.1,
      description: 'Create frequency differences between ears'
    },
    chorus: {
      id: 'chorus',
      name: 'Chorus',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Add richness through subtle detuning'
    },
    tremolo: {
      id: 'tremolo',
      name: 'Tremolo',
      enabled: false,
      value: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      description: 'Rhythmic volume modulation'
    },
    noise: {
      id: 'noise',
      name: 'Noise Mix',
      enabled: false,
      value: 10,
      min: 0,
      max: 100,
      step: 1,
      description: 'Mix in filtered noise'
    },
    phaser: {
      id: 'phaser',
      name: 'Phaser',
      enabled: false,
      value: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
      description: 'Sweeping frequency modulation'
    },
    reverb: {
      id: 'reverb',
      name: 'Reverb',
      enabled: false,
      value: 33,
      min: 0,
      max: 100,
      step: 1,
      description: 'Add space and depth to the sound'
    },
    stutter: {
      id: 'stutter',
      name: 'Stutter',
      enabled: false,
      value: 4,
      min: 1,
      max: 16,
      step: 1,
      description: 'Create rhythmic interruptions'
    },
    shepard: {
      id: 'shepard',
      name: 'Shepard Tone',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Infinite rising/falling tone illusion'
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      enabled: false,
      value: 50,
      min: 0,
      max: 100,
      step: 1,
      description: 'Add controlled randomization'
    },
    pingPong: {
      id: 'pingPong',
      name: 'Ping Pong',
      enabled: false,
      value: 0.5,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Bouncing delay effect'
    }
  }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>(initialState);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const effectNodesRef = useRef<Record<string, any>>({});

  const createReverbNode = async (context: AudioContext) => {
    const convolver = context.createConvolver();
    const impulseResponse = await fetch('/reverb-impulse.wav');
    const arrayBuffer = await impulseResponse.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    convolver.buffer = audioBuffer;
    return convolver;
  };

  const setupAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      setAnalyserNode(analyser);
      return { ctx, analyser };
    }
    return { ctx: audioContext, analyser: analyserNode };
  }, [audioContext, analyserNode]);

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
    if (state.isPlaying) {
      oscillatorsRef.current.forEach(osc => osc.stop());
      oscillatorsRef.current = [];
      gainNodesRef.current = [];
      effectNodesRef.current = {};
      if (audioContext?.state === 'running') {
        audioContext.close();
      }
      setAudioContext(null);
      setAnalyserNode(null);
    } else {
      const { ctx, analyser } = setupAudioContext();
      
      state.channels.forEach(async (channel, index) => {
        if (!channel.enabled) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = channel.waveform;
        oscillator.frequency.setValueAtTime(channel.frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);

        let lastNode: AudioNode = oscillator;
        lastNode.connect(gainNode);
        lastNode = gainNode;

        // Apply effects
        if (state.effects.stereoPan.enabled) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(state.effects.stereoPan.value / 100, ctx.currentTime);
          lastNode.connect(panner);
          lastNode = panner;
          effectNodesRef.current.stereoPan = panner;
        }

        if (state.effects.reverb.enabled) {
          const reverbNode = await createReverbNode(ctx);
          const wetGain = ctx.createGain();
          const dryGain = ctx.createGain();
          
          // Set wet/dry mix based on reverb value
          const wetLevel = state.effects.reverb.value / 100;
          wetGain.gain.setValueAtTime(wetLevel, ctx.currentTime);
          dryGain.gain.setValueAtTime(1 - wetLevel, ctx.currentTime);
          
          lastNode.connect(reverbNode);
          reverbNode.connect(wetGain);
          lastNode.connect(dryGain);
          
          wetGain.connect(analyser);
          dryGain.connect(analyser);
          
          effectNodesRef.current.reverb = { reverb: reverbNode, wet: wetGain, dry: dryGain };
        } else {
          lastNode.connect(analyser);
        }

        analyser.connect(ctx.destination);
        
        oscillatorsRef.current[index] = oscillator;
        gainNodesRef.current[index] = gainNode;
        
        oscillator.start();
      });
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

      if (error || !preset) {
        console.error('Error loading preset:', error);
        return false;
      }

      // Update views count
      await supabase.rpc('increment_preset_views', { preset_id: id });

      return deserializeState(preset.data);
    } catch (error) {
      console.error('Error loading preset:', error);
      return false;
    }
  };

  useEffect(() => {
    return () => {
      if (audioContext?.state === 'running') {
        audioContext.close();
      }
    };
  }, [audioContext]);

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