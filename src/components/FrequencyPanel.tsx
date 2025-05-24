import React from 'react';
import { Info, Waves, Square, Triangle, Minus } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { Waveform } from '../types';

const FrequencyPanel: React.FC = () => {
  const { state, updateChannel } = useAudio();
  
  const formatFrequency = (freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)} kHz`;
    }
    return `${freq} Hz`;
  };

  const handleFrequencyInput = (channelId: number, value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, '');
    let freq = Math.min(Math.max(0, Number(sanitizedValue)), 20000);
    if (isNaN(freq)) freq = 0;
    freq = Math.round(freq * 100) / 100;
    updateChannel(channelId, { frequency: freq });
  };

  const handleWaveformChange = (channelId: number, value: string) => {
    const validWaveforms = ['sine', 'square', 'sawtooth', 'triangle'];
    if (!validWaveforms.includes(value)) return;
    updateChannel(channelId, { waveform: value as Waveform });
  };

  const getIntensityClass = (frequency: number) => {
    const normalizedValue = frequency / 20000;
    if (!state.isPlaying) return '';
    if (normalizedValue > 0.8) return 'effect-high';
    if (normalizedValue > 0.4) return 'effect-medium';
    return 'effect-low';
  };

  const getWaveformIcon = (waveform: Waveform) => {
    switch (waveform) {
      case 'sine':
        return <Waves className="h-4 w-4" />;
      case 'square':
        return <Square className="h-4 w-4" />;
      case 'triangle':
        return <Triangle className="h-4 w-4" />;
      case 'sawtooth':
        return <Minus className="h-4 w-4 rotate-[-45deg]" />;
      default:
        return null;
    }
  };

  return (
    <section className="mb-8">      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mx-auto">
        {state.channels.map((channel) => (
          <div 
            key={channel.id} 
            className={`effect-card group ${state.isPlaying ? 'effect-active' : ''} ${getIntensityClass(channel.frequency)}`}
          >
            <div className="flex items-center justify-center mb-3">
              <h3 className="font-display text-lg text-purple-200">Frequency {channel.id}</h3>
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="relative bg-[#1a0b2e] rounded-lg px-4 py-2.5 text-base font-mono w-3/4 text-center border border-purple-500/20 group-hover:border-purple-500/30 transition-colors">
                <input
                  type="text"
                  value={channel.frequency}
                  onChange={(e) => handleFrequencyInput(channel.id, e.target.value)}
                  className="w-full bg-transparent text-center text-white focus:outline-none font-display"
                  onBlur={(e) => handleFrequencyInput(channel.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-label={`Frequency ${channel.id} input`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/70 text-sm font-display">
                  Hz
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <input
                type="range"
                value={channel.frequency}
                onChange={(e) => handleFrequencyInput(channel.id, e.target.value)}
                min="0"
                max="20000"
                step="1"
                className={`w-full appearance-none bg-transparent 
                  [&::-webkit-slider-runnable-track]:slider-track 
                  [&::-webkit-slider-thumb]:slider-thumb 
                  [&::-moz-range-track]:slider-track 
                  [&::-moz-range-thumb]:slider-thumb
                  ${state.isPlaying ? getIntensityClass(channel.frequency) : ''}`}
                aria-label={`Frequency ${channel.id} slider`}
              />
              <div className="flex justify-between text-xs font-display text-purple-400/70">
                <span>0 Hz</span>
                <span>20 kHz</span>
              </div>
            </div>
            
            <div className="relative">
              <select
                value={channel.waveform}
                onChange={(e) => handleWaveformChange(channel.id, e.target.value)}
                className={`w-full bg-[#1a0b2e] text-white border border-purple-500/20 rounded-lg pl-10 pr-4 py-2.5 text-base font-display
                  appearance-none cursor-pointer
                  focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30
                  hover:border-purple-500/50 transition-colors duration-200
                  [&>option]:bg-[#1a0b2e] [&>option]:text-white [&>option]:py-1.5 [&>option]:px-3
                  [&>option]:my-1 [&>option:hover]:bg-[#444488]
                  ${state.isPlaying ? getIntensityClass(channel.frequency) : ''}`}
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
                aria-label={`Waveform ${channel.id} selection`}
              >
                <option value="sine">Sine Wave</option>
                <option value="square">Square Wave</option>
                <option value="sawtooth">Sawtooth Wave</option>
                <option value="triangle">Triangle Wave</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 group-hover:scale-110 transition-transform">
                {getWaveformIcon(channel.waveform)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FrequencyPanel;