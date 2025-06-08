import React from 'react';
import { useAudio } from '../context/AudioContext';
import { AudioEffect } from '../types';
import { Info } from 'lucide-react';

interface EffectCardProps {
  effect: AudioEffect;
  isLocked?: boolean;
}

const EffectCard: React.FC<EffectCardProps> = ({ effect, isLocked = false }) => {
  if (!effect) {
    return null;
  }

  const { updateEffect } = useAudio();
  
  const handleToggle = () => {
    if (isLocked) return;
    updateEffect(effect.id, { enabled: !effect.enabled });
  };
  
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
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
    if (!effect.enabled || isLocked) return '';
    if (normalizedValue > 0.8) return 'effect-high';
    if (normalizedValue > 0.4) return 'effect-medium';
    return 'effect-low';
  };

  return (
    <div className={`effect-card ${effect.enabled && !isLocked ? 'effect-active' : ''} ${getIntensityClass()} ${
      isLocked ? 'opacity-60' : ''
    }`}>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-1">
          <h3 className="text-xs md:text-sm font-medium text-purple-200">{effect.name}</h3>
          <div className="has-tooltip">
            <Info className="h-3 w-3 info-icon" />
            <div className="tooltip -translate-y-full -translate-x-1/2 left-1/2 top-0 w-48 text-xs">
              {effect.description}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleToggle}
            disabled={isLocked}
            className={`toggle-switch ${effect.enabled && !isLocked ? 'bg-purple-600' : 'bg-gray-700'} ${
              effect.enabled && !isLocked ? getIntensityClass() : ''
            } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-pressed={effect.enabled}
          >
            <span className="sr-only">{effect.enabled ? 'Enabled' : 'Disabled'}</span>
            <span
              className={`toggle-switch-thumb ${
                effect.enabled && !isLocked ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className={`relative transition-opacity duration-300 ${
        effect.enabled && !isLocked ? 'opacity-100' : 'opacity-50'
      }`}>
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm
            transition-all duration-200 ${
              effect.enabled && !isLocked
                ? 'text-purple-300 bg-indigo-900/80' 
                : 'text-purple-400/50'
            }`}>
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
          disabled={!effect.enabled || isLocked}
          className={`w-full appearance-none bg-transparent 
            [&::-webkit-slider-runnable-track]:slider-track 
            [&::-webkit-slider-thumb]:slider-thumb 
            [&::-moz-range-track]:slider-track 
            [&::-moz-range-thumb]:slider-thumb
            transition-opacity duration-200
            ${!effect.enabled || isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${effect.enabled && !isLocked ? getIntensityClass() : ''}
          `}
        />
      </div>
    </div>
  );
};

export default EffectCard;