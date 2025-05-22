import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

const SoundInAction: React.FC = () => {
  const [isPlayingMeditation, setIsPlayingMeditation] = useState(false);
  const [isPlayingClarity, setIsPlayingClarity] = useState(false);
  const [isPlayingSleep, setIsPlayingSleep] = useState(false);
  
  // Audio contexts and oscillators for each preset
  const [meditationContext, setMeditationContext] = useState<AudioContext | null>(null);
  const [clarityContext, setClarityContext] = useState<AudioContext | null>(null);
  const [sleepContext, setSleepContext] = useState<AudioContext | null>(null);

  // Stop all audio contexts except the one specified
  const stopOtherContexts = (exceptContext: 'meditation' | 'clarity' | 'sleep') => {
    if (exceptContext !== 'meditation' && meditationContext) {
      meditationContext.close();
      setMeditationContext(null);
      setIsPlayingMeditation(false);
    }
    if (exceptContext !== 'clarity' && clarityContext) {
      clarityContext.close();
      setClarityContext(null);
      setIsPlayingClarity(false);
    }
    if (exceptContext !== 'sleep' && sleepContext) {
      sleepContext.close();
      setSleepContext(null);
      setIsPlayingSleep(false);
    }
  };

  useEffect(() => {
    // Cleanup function to stop all audio contexts
    return () => {
      meditationContext?.close();
      clarityContext?.close();
      sleepContext?.close();
    };
  }, [meditationContext, clarityContext, sleepContext]);

  const setupMeditationAudio = () => {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    gainNode.connect(ctx.destination);

    // Left channel - 432 Hz
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.value = 432;
    
    // Right channel - 436 Hz for theta binaural beat (4 Hz difference)
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.value = 436;

    // Create stereo panner for each oscillator
    const pannerLeft = ctx.createStereoPanner();
    const pannerRight = ctx.createStereoPanner();
    pannerLeft.pan.value = -1;
    pannerRight.pan.value = 1;

    oscLeft.connect(pannerLeft).connect(gainNode);
    oscRight.connect(pannerRight).connect(gainNode);

    oscLeft.start();
    oscRight.start();

    return ctx;
  };

  const setupClarityAudio = () => {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    gainNode.connect(ctx.destination);

    // Single frequency at 396 Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 396;
    osc.connect(gainNode);
    osc.start();

    return ctx;
  };

  const setupSleepAudio = () => {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.4;
    gainNode.connect(ctx.destination);

    // 60 Hz base frequency
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60;

    // Pink noise generator
    const bufferSize = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      b6 = 0.5 * b6 + white * 0.115926;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.3;

    noise.connect(noiseGain);
    noiseGain.connect(gainNode);
    osc.connect(gainNode);

    noise.start();
    osc.start();

    return ctx;
  };

  const toggleMeditation = () => {
    if (isPlayingMeditation) {
      meditationContext?.close();
      setMeditationContext(null);
    } else {
      stopOtherContexts('meditation');
      const ctx = setupMeditationAudio();
      setMeditationContext(ctx);
    }
    setIsPlayingMeditation(!isPlayingMeditation);
  };

  const toggleClarity = () => {
    if (isPlayingClarity) {
      clarityContext?.close();
      setClarityContext(null);
    } else {
      stopOtherContexts('clarity');
      const ctx = setupClarityAudio();
      setClarityContext(ctx);
    }
    setIsPlayingClarity(!isPlayingClarity);
  };

  const toggleSleep = () => {
    if (isPlayingSleep) {
      sleepContext?.close();
      setSleepContext(null);
    } else {
      stopOtherContexts('sleep');
      const ctx = setupSleepAudio();
      setSleepContext(ctx);
    }
    setIsPlayingSleep(!isPlayingSleep);
  };

  return (
    <section className="relative mb-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 rounded-2xl p-8 backdrop-blur-sm"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h3 className="text-2xl font-bold text-violet-200">Sound in Action</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div 
            className={`bg-gradient-to-br from-violet-800/30 to-fuchsia-800/30 rounded-lg p-6 transition-all duration-300 hover:from-violet-800/40 hover:to-fuchsia-800/40 ${
              isPlayingMeditation ? 'shadow-lg shadow-violet-500/20 animate-pulse-gentle' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-violet-200">Meditation</h4>
              <button
                onClick={toggleMeditation}
                className="p-2 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors"
                title={isPlayingMeditation ? 'Stop' : 'Play'}
              >
                {isPlayingMeditation ? (
                  <Pause className="h-4 w-4 text-violet-300" />
                ) : (
                  <Play className="h-4 w-4 text-violet-300" />
                )}
              </button>
            </div>
            <p className="text-violet-300/80">432 Hz carrier wave with theta binaural beats</p>
          </motion.div>

          <motion.div 
            className={`bg-gradient-to-br from-violet-800/30 to-fuchsia-800/30 rounded-lg p-6 transition-all duration-300 hover:from-violet-800/40 hover:to-fuchsia-800/40 ${
              isPlayingClarity ? 'shadow-lg shadow-violet-500/20 animate-pulse-gentle' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-violet-200">Clarity Boost</h4>
              <button
                onClick={toggleClarity}
                className="p-2 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors"
                title={isPlayingClarity ? 'Stop' : 'Play'}
              >
                {isPlayingClarity ? (
                  <Pause className="h-4 w-4 text-violet-300" />
                ) : (
                  <Play className="h-4 w-4 text-violet-300" />
                )}
              </button>
            </div>
            <p className="text-violet-300/80">396 Hz pure tone for mental clarity</p>
          </motion.div>

          <motion.div 
            className={`bg-gradient-to-br from-violet-800/30 to-fuchsia-800/30 rounded-lg p-6 transition-all duration-300 hover:from-violet-800/40 hover:to-fuchsia-800/40 ${
              isPlayingSleep ? 'shadow-lg shadow-violet-500/20 animate-pulse-gentle' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-violet-200">Sleep</h4>
              <button
                onClick={toggleSleep}
                className="p-2 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors"
                title={isPlayingSleep ? 'Stop' : 'Play'}
              >
                {isPlayingSleep ? (
                  <Pause className="h-4 w-4 text-violet-300" />
                ) : (
                  <Play className="h-4 w-4 text-violet-300" />
                )}
              </button>
            </div>
            <p className="text-violet-300/80">Delta waves with pink noise modulation</p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default SoundInAction;