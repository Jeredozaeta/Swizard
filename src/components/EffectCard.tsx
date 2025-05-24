import React from 'react';
import { useAudio } from '../context/AudioContext';
import { AudioEffect } from '../types';
import { Info, Volume2, Waveform, Waves, Music, Disc, Shuffle, GitBranch, Radio } from 'lucide-react';

interface EffectCardProps {
  effect: AudioEffect;
}

const getEffectDescription = (effectId: string): { name: string; description: string; icon: React.ElementType } => {
  const descriptions = {
    ringMod: {
      name: 'Ring Modulation',
      description: 'Creates metallic, bell-like tones by multiplying the input with an oscillator. Great for robotic and sci-fi sounds. Start at 440Hz for classic effects.',
      icon: Radio
    },
    amplitudeMod: {
      name: 'Amplitude Modulation',
      description: 'Varies the volume rhythmically. Perfect for tremolo effects and pulsing sounds. Lower rates (2-5Hz) create gentle waves, higher rates produce vibrato.',
      icon: Volume2
    },
    isoPulses: {
      name: 'Isochronic Pulses',
      description: 'Creates distinct on-off pulses at regular intervals. Effective for brainwave entrainment. Use 4-8Hz for meditation, 8-12Hz for focus.',
      icon: Waveform
    },
    stereoPan: {
      name: 'Stereo Panning',
      description: 'Moves sound between left and right channels. Creates spatial movement and width. Great for immersive experiences and headphone listening.',
      icon: GitBranch
    },
    pan360: {
      name: '360° Panning',
      description: 'Rotates sound in a circular pattern. Creates an immersive, spinning effect. Lower rates for subtle movement, higher for dramatic rotation.',
      icon: Disc
    },
    binaural: {
      name: 'Binaural Beats',
      description: 'Creates frequency differences between ears to influence brainwaves. Use with headphones. Delta (0.5-4Hz) for sleep, Theta (4-8Hz) for meditation.',
      icon: Waves
    },
    chorus: {
      name: 'Chorus',
      description: 'Adds richness by layering slightly detuned copies. Perfect for creating lush, ethereal textures. Subtle settings work best for meditation.',
      icon: Music
    },
    tremolo: {
      name: 'Tremolo',
      description: 'Rapidly varies volume for a shimmering effect. Use low rates (2-5Hz) for gentle pulsing, higher rates for vibrato effects.',
      icon: Waveform
    },
    noise: {
      name: 'Noise Generator',
      description: 'Adds filtered noise to the signal. White noise masks unwanted sounds, pink noise aids relaxation. Adjust density for desired texture.',
      icon: Waves
    },
    phaser: {
      name: 'Phaser',
      description: 'Creates sweeping, otherworldly effects through phase shifting. Great for adding motion and depth. Lower rates for subtle movement.',
      icon: Waves
    },
    stutter: {
      name: 'Stutter',
      description: 'Creates rhythmic interruptions in the sound. Use for glitch effects and rhythmic variation. Adjust rate for different patterns.',
      icon: Shuffle
    },
    shepard: {
      name: 'Shepard Tone',
      description: 'Creates an illusion of continuously rising or falling pitch. Perfect for building tension or inducing specific mental states.',
      icon: Waves
    },
    glitch: {
      name: 'Glitch',
      description: 'Adds controlled randomization and artifacts. Great for creating unique textures and unexpected variations. Use sparingly for best effect.',
      icon: Shuffle
    },
    pingPong: {
      name: 'Ping Pong Delay',
      description: 'Bounces sound between left and right channels with decay. Creates spatial echoes. Adjust feedback for longer/shorter decay.',
      icon: GitBranch
    },
    reverb: {
      name: 'Reverb',
      description: 'Simulates sound in different spaces. Small rooms for intimacy, large halls for expansive atmosphere. Adjust mix for blend.',
      icon: Music
    }
  };

  return descriptions[effectId as keyof typeof descriptions] || {
    name: effectId,
    description: 'Modifies the sound in unique ways.',
    icon: Waves
  };
};

const EffectCard: React.FC<EffectCardProps> = ({ effect }) => {
  if (!effect) {
    return null;
  }

  const { updateEffect } = useAudio();
  
  const handleToggle = () => {
    updateEffect(effect.id, { enabled: !effect.enabled });
  };
  
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEffect(effect.id, { value: Number(e.target.value) });
  };

  const formatValue = (value: number) => {
    if (effect.step < 1) {
      return value.toFixed(1);
    }
    return Math.round(value);
  };

  const getValueLabel = () => {
    if (effect.id === 'stereoPan') {
      return `${effect.value > 0 ? 'R' : 'L'} ${Math.abs(effect.value)}%`;
    }
    if (effect.id === 'noise') {
      return `${effect.value}%`;
    }
    if (['amplitudeMod', 'isoPulses', 'pan360', 'chorus', 'tremolo', 'phaser'].includes(effect.id)) {
      return `${effect.value}Hz`;
    }
    if (effect.id === 'reverb') {
      if (effect.value <= 33) return 'Small';
      if (effect.value <= 66) return 'Medium';
      return 'Large';
    }
    return formatValue(effect.value);
  };

  const getIntensityClass = () => {
    const normalizedValue = (effect.value - effect.min) / (effect.max - effect.min);
    if (!effect.enabled) return '';
    if (normalizedValue > 0.8) return 'effect-high';
    if (normalizedValue > 0.4) return 'effect-medium';
    return 'effect-low';
  };

  const effectInfo = getEffectDescription(effect.id);
  const EffectIcon = effectInfo.icon;

  return (
    <div className={`effect-card ${effect.enabled ? 'effect-active' : ''} ${getIntensityClass()}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <EffectIcon className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-medium text-purple-200">{effectInfo.name}</h3>
          <div className="has-tooltip">
            <Info className="h-3 w-3 info-icon" />
            <div className="tooltip -translate-y-full -translate-x-1/2 left-1/2 top-0 w-48 text-xs">
              {effectInfo.description}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleToggle}
            className={`toggle-switch ${effect.enabled ? 'bg-purple-600' : 'bg-gray-700'} ${
              effect.enabled ? getIntensityClass() : ''
            }`}
            aria-pressed={effect.enabled}
            title={effect.enabled ? 'Disable effect' : 'Enable effect'}
          >
            <span className="sr-only">{effect.enabled ? 'Enabled' : 'Disabled'}</span>
            <span
              className={`toggle-switch-thumb ${
                effect.enabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className={`relative transition-opacity duration-300 ${
        effect.enabled ? 'opacity-100' : 'opacity-50'
      }`}>
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm
            transition-all duration-200 ${
              effect.enabled 
                ? 'text-purple-300 bg-indigo-900/80' 
                : 'text-purple-400/50'
            }`}
            title={`Current value: ${getValueLabel()}`}
          >
            {getValueLabel()}
          </span>
        </div>
        
        <input
          type="range"
          min={effect.min}
          max={effect.max}
          step={effect.step}
          value={effect.value}
          onChange={handleValueChange}
          disabled={!effect.enabled}
          className={`w-full appearance-none bg-transparent 
            [&::-webkit-slider-runnable-track]:slider-track 
            [&::-webkit-slider-thumb]:slider-thumb 
            [&::-moz-range-track]:slider-track 
            [&::-moz-range-thumb]:slider-thumb
            transition-opacity duration-200
            ${!effect.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${effect.enabled ? getIntensityClass() : ''}
          `}
          title={`Adjust ${effectInfo.name.toLowerCase()} amount`}
        />
      </div>
    </div>
  );
};

export default EffectCard;