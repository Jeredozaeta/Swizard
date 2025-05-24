import { v4 as uuidv4 } from 'uuid';

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';

export interface AudioFingerprint {
  id: string;
  timestamp: number;
  signature: string;
  version: string;
}

export interface AudioMetadata {
  id: string;
  title: string;
  author: string;
  description: string;
  creationDate: string;
  lastModified: string;
  version: string;
  settings: {
    frequencies: number[];
    effects: string[];
    duration: number;
  };
  tags: string[];
}

export interface FrequencyChannel {
  id: number;
  frequency: number;
  waveform: Waveform;
  enabled: boolean;
}

export interface BaseAudioEffect {
  id: string;
  name: string;
  enabled: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

export interface NoiseEffect extends BaseAudioEffect {
  type: NoiseType;
  color: number;
  density: number;
}

export interface ShepardEffect extends BaseAudioEffect {
  direction: 'up' | 'down';
  octaves: number;
}

export interface GlitchEffect extends BaseAudioEffect {
  pattern: number[];
  probability: number;
  intensity: number;
}

export interface PingPongEffect extends BaseAudioEffect {
  feedback: number;
  mix: number;
}

export interface ReverbEffect extends BaseAudioEffect {
  roomSize: number;
  dampening: number;
  mix: number;
}

export interface AudioEffect extends BaseAudioEffect {
  type?: NoiseType;
  color?: number;
  density?: number;
  direction?: 'up' | 'down';
  octaves?: number;
  pattern?: number[];
  probability?: number;
  intensity?: number;
  feedback?: number;
  mix?: number;
  roomSize?: number;
  dampening?: number;
}

export interface AudioState {
  channels: FrequencyChannel[];
  duration: number;
  isPlaying: boolean;
  effects: Record<string, AudioEffect>;
}

export interface Preset {
  id: string;
  name: string;
  data: {
    channels: FrequencyChannel[];
    effects: Record<string, AudioEffect>;
    duration: number;
  };
  created_at: string;
  expires_at: string;
  views: number;
}

export interface AudioContextType {
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