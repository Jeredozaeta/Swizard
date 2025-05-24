import React from 'react';
import { useAudio } from '../context/AudioContext';
import { Sparkles, Moon, Brain } from 'lucide-react';
import { toast } from 'react-toastify';

const PRESETS = [
  {
    id: 'meditation',
    name: 'Deep Meditation',
    icon: Brain,
    description: 'Theta waves for deep meditation',
    channels: [
      { id: 1, frequency: 432, waveform: 'sine', enabled: true },
      { id: 2, frequency: 436, waveform: 'sine', enabled: true },
      { id: 3, frequency: 440, waveform: 'sine', enabled: true },
      { id: 4, frequency: 444, waveform: 'sine', enabled: true }
    ],
    effects: {
      binaural: { enabled: true, value: 7.83 },
      chorus: { enabled: true, value: 0.5 },
      reverb: { enabled: true, value: 66 }
    }
  },
  {
    id: 'focus',
    name: 'Focus Flow',
    icon: Sparkles,
    description: 'Alpha waves for enhanced focus',
    channels: [
      { id: 1, frequency: 288, waveform: 'sine', enabled: true },
      { id: 2, frequency: 292, waveform: 'sine', enabled: true },
      { id: 3, frequency: 296, waveform: 'sine', enabled: true },
      { id: 4, frequency: 300, waveform: 'sine', enabled: true }
    ],
    effects: {
      binaural: { enabled: true, value: 10.0 },
      tremolo: { enabled: true, value: 0.8 },
      stereoPan: { enabled: true, value: 30 }
    }
  },
  {
    id: 'sleep',
    name: 'Deep Sleep',
    icon: Moon,
    description: 'Delta waves for restful sleep',
    channels: [
      { id: 1, frequency: 172.06, waveform: 'sine', enabled: true },
      { id: 2, frequency: 174.61, waveform: 'sine', enabled: true },
      { id: 3, frequency: 177.18, waveform: 'sine', enabled: true },
      { id: 4, frequency: 179.78, waveform: 'sine', enabled: true }
    ],
    effects: {
      binaural: { enabled: true, value: 2.5 },
      noise: { enabled: true, value: 15 },
      reverb: { enabled: true, value: 100 }
    }
  }
];

const PresetButtons: React.FC = () => {
  const { state, updateChannel, updateEffect } = useAudio();

  const loadPreset = (preset: typeof PRESETS[0]) => {
    // Update channels
    preset.channels.forEach(channel => {
      updateChannel(channel.id, {
        frequency: channel.frequency,
        waveform: channel.waveform as any,
        enabled: channel.enabled
      });
    });

    // Update effects
    Object.entries(preset.effects).forEach(([id, effect]) => {
      updateEffect(id, {
        enabled: effect.enabled,
        value: effect.value
      });
    });

    toast.success(`${preset.name} preset loaded!`, {
      icon: '✨',
      position: "bottom-right",
      autoClose: 3000
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
      {PRESETS.map(preset => {
        const Icon = preset.icon;
        return (
          <button
            key={preset.id}
            onClick={() => loadPreset(preset)}
            className="group relative bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 
              rounded-lg border border-purple-500/20 p-6 text-left
              hover:from-violet-900/40 hover:to-fuchsia-900/40 
              hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10
              transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <h3 className="text-lg font-medium text-purple-200">{preset.name}</h3>
            </div>
            <p className="text-sm text-purple-300/70">{preset.description}</p>
          </button>
        );
      })}
    </div>
  );
};

export default PresetButtons;