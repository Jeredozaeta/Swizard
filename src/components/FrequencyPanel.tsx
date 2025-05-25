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
    let freq = Math.min(Math.max(0, Number(sanitizedValue)), 2000);
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
    const normalizedValue = frequency / 2000;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mx-auto">
        {state.channels.slice(0, 2).map((channel) => (
          <div 
            key={channel.id} 
            className={`effect-card ${state.isPlaying ? 'effect-active' : ''} ${getIntensityClass(channel.frequency)}`}
          >
            <div className="flex items-center justify-center mb-3">
              <h3 className="font-medium text-purple-200">Frequency {channel.id}</h3>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative bg-[#1e1e2f] rounded-lg px-4 py-2 text-sm font-mono w-full text-center border border-purple-500/20 mb-4">
                  <input
                    type="text"
                    value={channel.frequency}
                    onChange={(e) => handleFrequencyInput(channel.id, e.target.value)}
                    className="w-full bg-transparent text-center text-white focus:outline-none"
                    onBlur={(e) => handleFrequencyInput(channel.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    aria-label={`Frequency ${channel.id} input`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400/70 text-xs">
                    Hz
                  </div>
                </div>

                <div className="relative h-32 flex items-center justify-center touch-none">
                  <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-purple-400/70">
                    <span>2k</span>
                    <span>1.5k</span>
                    <span>1k</span>
                    <span>500</span>
                    <span>0</span>
                  </div>
                  
                  <div className="mx-8 h-full flex items-center">
                    <input
                      type="range"
                      value={channel.frequency}
                      onChange={(e) => handleFrequencyInput(channel.id, e.target.value)}
                      min="0"
                      max="2000"
                      step="1"
                      className="h-full -rotate-90 appearance-none bg-transparent w-32
                        [&::-webkit-slider-runnable-track]:w-full
                        [&::-webkit-slider-runnable-track]:h-2
                        [&::-webkit-slider-runnable-track]:rounded-full
                        [&::-webkit-slider-runnable-track]:bg-purple-500/20
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-purple-500
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:shadow-purple-500/20
                        [&::-webkit-slider-thumb]:border-4
                        [&::-webkit-slider-thumb]:border-[#1e1e2f]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:-mt-2
                        [&::-moz-range-track]:w-full
                        [&::-moz-range-track]:h-2
                        [&::-moz-range-track]:rounded-full
                        [&::-moz-range-track]:bg-purple-500/20
                        [&::-moz-range-thumb]:appearance-none
                        [&::-moz-range-thumb]:w-6
                        [&::-moz-range-thumb]:h-6
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-purple-500
                        [&::-moz-range-thumb]:shadow-lg
                        [&::-moz-range-thumb]:shadow-purple-500/20
                        [&::-moz-range-thumb]:border-4
                        [&::-moz-range-thumb]:border-[#1e1e2f]
                        [&::-moz-range-thumb]:cursor-pointer
                        ${state.isPlaying ? getIntensityClass(channel.frequency) : ''}"
                      aria-label={`Frequency ${channel.id} slider`}
                    />
                  </div>

                  <div className="absolute right-0 h-full w-1 bg-purple-500/20 rounded-full">
                    <div className="absolute inset-x-0 h-1 bg-purple-500/40 rounded-full" style={{ bottom: `${(channel.frequency / 2000) * 100}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <select
                  value={channel.waveform}
                  onChange={(e) => handleWaveformChange(channel.id, e.target.value)}
                  className={`w-full bg-[#1e1e2f] text-white border border-purple-500/20 rounded-lg pl-9 pr-4 py-2.5 text-base
                    appearance-none cursor-pointer
                    focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30
                    hover:border-purple-500/50 transition-colors duration-200
                    [&>option]:bg-[#1e1e2f] [&>option]:text-white [&>option]:py-1 [&>option]:px-2
                    [&>option]:my-1 [&>option:hover]:bg-[#444488]
                    ${state.isPlaying ? getIntensityClass(channel.frequency) : ''}`}
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                  aria-label={`Waveform ${channel.id} selection`}
                >
                  <option value="sine" className="py-2 hover:bg-[#444488]">Sine Wave</option>
                  <option value="square" className="py-2 hover:bg-[#444488]">Square Wave</option>
                  <option value="sawtooth" className="py-2 hover:bg-[#444488]">Sawtooth Wave</option>
                  <option value="triangle" className="py-2 hover:bg-[#444488]">Triangle Wave</option>
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-purple-300">
                  {getWaveformIcon(channel.waveform)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FrequencyPanel;