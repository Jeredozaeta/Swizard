import React, { useState, useEffect } from 'react';
import { Music, Lock } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import EffectCard from './EffectCard';
import { toast } from 'react-toastify';
import { getSecureRandomNumber, getSecureRandomBool, secureShuffleArray } from '../utils/random';

const AudioFXPanel: React.FC = () => {
  const { state, togglePlayback, updateChannel, updateEffect, isProUser } = useAudio();
  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<number | null>(null);
  
  const standardEffects = [
    'ringMod',
    'amplitudeMod',
    'isoPulses',
    'stereoPan',
    'pan360',
    'binaural',
    'chorus',
    'tremolo',
    'noise',
    'phaser',
    'reverb'
  ];

  const specialEffects = [
    'stutter',
    'shepard',
    'glitch',
    'pingPong'
  ];

  // Get free tier effect IDs (first 3 effects)
  const getFreeEffectIds = () => {
    return standardEffects.slice(0, 3); // ringMod, amplitudeMod, isoPulses
  };

  const isEffectLocked = (effectId: string) => {
    if (isProUser) return false;
    
    const freeEffects = getFreeEffectIds();
    return !freeEffects.includes(effectId);
  };

  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        window.clearTimeout(inactivityTimer);
      }
      setIsInactive(false);
      const timer = window.setTimeout(() => {
        setIsInactive(true);
      }, 10000);
      setInactivityTimer(Number(timer));
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      if (inactivityTimer) {
        window.clearTimeout(inactivityTimer);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [inactivityTimer]);

  const generateRandomSound = async () => {
    if (isGeneratingPreset) return;
    setIsGeneratingPreset(true);

    const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
    const shuffledWaveforms = secureShuffleArray(waveforms);
    const delay = 250;

    try {
      if (state.isPlaying) {
        togglePlayback();
      }

      // For free users, only update first channel
      const channelsToUpdate = isProUser ? state.channels : state.channels.filter(ch => ch.id === 1);

      for (const channel of channelsToUpdate) {
        if (!channel.enabled && channel.id !== 1) continue;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const baseFreq = getSecureRandomNumber(50, 500);
        const harmonic = getSecureRandomNumber(1, 8);
        const frequency = baseFreq * harmonic;
        
        updateChannel(channel.id, {
          frequency: Math.min(frequency, 20000),
          waveform: shuffledWaveforms[getSecureRandomNumber(0, shuffledWaveforms.length - 1)] as any
        });
      }

      // For effects, only update free effects for non-Pro users
      const effectsToUpdate = isProUser ? Object.values(state.effects) : Object.values(state.effects).filter(effect => !isEffectLocked(effect.id));

      for (const effect of effectsToUpdate) {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const shouldEnable = getSecureRandomBool(0.4);
        
        if (shouldEnable) {
          let randomValue;
          
          if (effect.id === 'binaural' || effect.id === 'shepard') {
            randomValue = getSecureRandomNumber(
              Math.ceil(effect.min / effect.step) + 2,
              Math.floor(effect.max / effect.step) - 2
            ) * effect.step;
          } else {
            randomValue = getSecureRandomNumber(
              Math.ceil(effect.min / effect.step),
              Math.floor(effect.max / effect.step)
            ) * effect.step;
          }
          
          updateEffect(effect.id, {
            enabled: true,
            value: Number(randomValue.toFixed(2))
          });
        } else {
          updateEffect(effect.id, { enabled: false });
        }
      }

      if (!state.isPlaying) {
        togglePlayback();
      }

      toast.success('Random sound created!', {
        icon: '✨'
      });
    } catch (error) {
      console.error('Error generating random sound:', error);
      toast.error('Failed to generate random sound');
    } finally {
      setIsGeneratingPreset(false);
    }
  };
  
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-purple-300">
          Audio FX
          {!isProUser && (
            <span className="ml-3 text-sm text-purple-400/70">
              ({getFreeEffectIds().length} of {standardEffects.length + specialEffects.length} unlocked)
            </span>
          )}
        </h2>
        <button
          onClick={generateRandomSound}
          disabled={isGeneratingPreset}
          className={`btn btn-secondary btn-sm ${isInactive ? 'animate-attention' : ''} ${
            isGeneratingPreset ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Music className={`h-4 w-4 ${isGeneratingPreset ? 'animate-spin' : ''}`} />
          <span>Create Random Sound</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
        {standardEffects.map((id, index) => {
          const isLocked = isEffectLocked(id);
          const isFreeEffect = index < 3;
          
          return (
            <div key={id} className="col-span-1 relative">
              {isLocked && (
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-1 text-purple-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs font-medium">Pro</span>
                  </div>
                </div>
              )}
              {!isProUser && isFreeEffect && (
                <div className="absolute top-2 right-2 z-20">
                  <span className="text-xs bg-green-600/20 text-green-300 px-1.5 py-0.5 rounded-full">
                    Free
                  </span>
                </div>
              )}
              <EffectCard effect={state.effects[id]} isLocked={isLocked} />
            </div>
          );
        })}
      </div>

      <div className="mt-2 md:mt-3 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {specialEffects.map(id => {
          const isLocked = isEffectLocked(id);
          
          return (
            <div key={id} className="col-span-1 relative">
              {isLocked && (
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-1 text-purple-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs font-medium">Pro</span>
                  </div>
                </div>
              )}
              <EffectCard effect={state.effects[id]} isLocked={isLocked} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AudioFXPanel;