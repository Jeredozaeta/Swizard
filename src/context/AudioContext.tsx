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
  const effectNodesRef = useRef<Record<string, AudioNode>>({});

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

  const createEffectChain = useCallback((ctx: AudioContext, destination: AudioNode) => {
    const effects = state.effects;
    let lastNode: AudioNode = destination;

    // Clear previous effect nodes
    Object.values(effectNodesRef.current).forEach(node => {
      try {
        (node as AudioNode).disconnect();
      } catch (e) {
        console.warn('Error disconnecting node:', e);
      }
    });
    effectNodesRef.current = {};

    // Create new effect chain in reverse order
    if (effects.pingPong.enabled) {
      const delay = ctx.createDelay();
      const feedback = ctx.createGain();
      delay.delayTime.value = effects.pingPong.value;
      feedback.gain.value = 0.3;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(lastNode);
      lastNode = delay;
      effectNodesRef.current.pingPong = delay;
    }

    if (effects.glitch.enabled) {
      const glitchNode = ctx.createWaveShaper();
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        curve[i] = Math.random() * 2 - 1;
      }
      glitchNode.curve = curve;
      glitchNode.connect(lastNode);
      lastNode = glitchNode;
      effectNodesRef.current.glitch = glitchNode;
    }

    if (effects.phaser.enabled) {
      const phaser = ctx.createBiquadFilter();
      phaser.type = 'allpass';
      phaser.frequency.value = 1000 * effects.phaser.value;
      phaser.Q.value = 10;
      phaser.connect(lastNode);
      lastNode = phaser;
      effectNodesRef.current.phaser = phaser;
    }

    if (effects.tremolo.enabled) {
      const tremolo = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = effects.tremolo.value;
      lfo.connect(tremolo.gain);
      tremolo.connect(lastNode);
      lfo.start();
      lastNode = tremolo;
      effectNodesRef.current.tremolo = tremolo;
    }

    if (effects.chorus.enabled) {
      const chorus = ctx.createDelay();
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = effects.chorus.value;
      lfo.connect(chorus.delayTime);
      chorus.delayTime.value = 0.03;
      chorus.connect(lastNode);
      lfo.start();
      lastNode = chorus;
      effectNodesRef.current.chorus = chorus;
    }

    if (effects.stereoPan.enabled) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = effects.stereoPan.value / 100;
      panner.connect(lastNode);
      lastNode = panner;
      effectNodesRef.current.stereoPan = panner;
    }

    if (effects.noise.enabled) {
      const noiseGain = ctx.createGain();
      const bufferSize = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noiseGain.gain.value = effects.noise.value / 100;
      noise.connect(noiseGain);
      noiseGain.connect(lastNode);
      noise.start();
      effectNodesRef.current.noise = noiseGain;
    }

    return lastNode;
  }, [state.effects]);

  const startOscillators = useCallback(() => {
    if (!audioContext || !analyserNode) return;

    // Stop and disconnect existing oscillators and gains
    stopOscillators();

    // Create effect chain
    const effectChain = createEffectChain(audioContext, analyserNode);

    // Create and connect oscillators
    state.channels.forEach((channel, index) => {
      if (!channel.enabled) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = channel.waveform;
      oscillator.frequency.setValueAtTime(channel.frequency, audioContext.currentTime);

      // Adjust gain based on number of active channels
      const activeChannels = state.channels.filter(c => c.enabled).length;
      gainNode.gain.setValueAtTime(0.5 / activeChannels, audioContext.currentTime);

      // Special handling for binaural beats
      if (state.effects.binaural.enabled && index < 2) {
        const freq = channel.frequency;
        if (index === 0) {
          oscillator.frequency.setValueAtTime(freq - state.effects.binaural.value / 2, audioContext.currentTime);
        } else {
          oscillator.frequency.setValueAtTime(freq + state.effects.binaural.value / 2, audioContext.currentTime);
        }
      }

      oscillator.connect(gainNode);
      gainNode.connect(effectChain);

      oscillator.start();
      oscillatorsRef.current.push(oscillator);
      gainNodesRef.current.push(gainNode);
    });
  }, [audioContext, analyserNode, state.channels, state.effects, createEffectChain]);

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

    // Disconnect and clear effect nodes
    Object.values(effectNodesRef.current).forEach(node => {
      try {
        (node as AudioNode).disconnect();
      } catch (e) {
        console.warn('Error disconnecting effect node:', e);
      }
    });
    effectNodesRef.current = {};
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
      if (updates.enabled !== undefined && updates.enabled !== state.channels[id - 1].enabled) {
        // Restart oscillators to update gain distribution
        startOscillators();
      }
    }
  }, [audioContext, state.isPlaying, state.channels, startOscillators]);

  const updateEffect = useCallback((id: string, updates: Partial<AudioEffect>) => {
    setState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [id]: { ...prev.effects[id], ...updates }
      }
    }));

    // Restart oscillators to apply effect changes
    if (state.isPlaying) {
      startOscillators();
    }
  }, [state.isPlaying, startOscillators]);

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

export { AudioProvider }

export { useAudio }