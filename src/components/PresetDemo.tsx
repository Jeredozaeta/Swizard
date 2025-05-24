import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Music, Waves, Brain } from 'lucide-react';

interface PresetProps {
  frequency: number;
  title: string;
  description: string;
  icon: React.ElementType;
  effects?: {
    tremolo?: { frequency: number; depth: number };
    stereoPan?: { frequency: number };
    phaser?: { frequency: number; depth: number };
    amplitudeMod?: { frequency: number; depth: number };
    pan360?: { frequency: number };
  };
}

const Preset: React.FC<PresetProps> = ({ frequency, title, description, icon: Icon, effects }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const tremoloOscRef = useRef<OscillatorNode | null>(null);
  const tremoloGainRef = useRef<GainNode | null>(null);
  const stereoRef = useRef<StereoPannerNode | null>(null);
  const stereoPanOscRef = useRef<OscillatorNode | null>(null);
  const phaserRef = useRef<BiquadFilterNode | null>(null);
  const phaserOscRef = useRef<OscillatorNode | null>(null);
  const ampModOscRef = useRef<OscillatorNode | null>(null);
  const ampModGainRef = useRef<GainNode | null>(null);
  const pan360OscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const setupTremolo = (ctx: AudioContext, input: AudioNode) => {
    if (!effects?.tremolo) return input;

    tremoloGainRef.current = ctx.createGain();
    tremoloOscRef.current = ctx.createOscillator();
    
    tremoloOscRef.current.frequency.value = effects.tremolo.frequency;
    tremoloGainRef.current.gain.value = effects.tremolo.depth;
    
    tremoloOscRef.current.connect(tremoloGainRef.current.gain);
    input.connect(tremoloGainRef.current);
    tremoloOscRef.current.start();
    
    return tremoloGainRef.current;
  };

  const setupStereoPan = (ctx: AudioContext, input: AudioNode) => {
    if (!effects?.stereoPan) return input;

    stereoRef.current = ctx.createStereoPanner();
    stereoPanOscRef.current = ctx.createOscillator();
    
    stereoPanOscRef.current.frequency.value = effects.stereoPan.frequency;
    stereoPanOscRef.current.connect(stereoRef.current.pan);
    input.connect(stereoRef.current);
    stereoPanOscRef.current.start();
    
    return stereoRef.current;
  };

  const setupPhaser = (ctx: AudioContext, input: AudioNode) => {
    if (!effects?.phaser) return input;

    phaserRef.current = ctx.createBiquadFilter();
    phaserOscRef.current = ctx.createOscillator();
    
    phaserRef.current.type = 'allpass';
    phaserRef.current.frequency.value = 1000;
    phaserRef.current.Q.value = 10;
    
    phaserOscRef.current.frequency.value = effects.phaser.frequency;
    phaserOscRef.current.connect(phaserRef.current.frequency);
    input.connect(phaserRef.current);
    phaserOscRef.current.start();
    
    return phaserRef.current;
  };

  const setupAmplitudeMod = (ctx: AudioContext, input: AudioNode) => {
    if (!effects?.amplitudeMod) return input;

    ampModGainRef.current = ctx.createGain();
    ampModOscRef.current = ctx.createOscillator();

    ampModOscRef.current.frequency.value = effects.amplitudeMod.frequency;
    ampModGainRef.current.gain.value = effects.amplitudeMod.depth;

    ampModOscRef.current.connect(ampModGainRef.current.gain);
    input.connect(ampModGainRef.current);
    ampModOscRef.current.start();

    return ampModGainRef.current;
  };

  const setupPan360 = (ctx: AudioContext, input: AudioNode) => {
    if (!effects?.pan360) return input;

    stereoRef.current = ctx.createStereoPanner();
    pan360OscRef.current = ctx.createOscillator();

    pan360OscRef.current.frequency.value = effects.pan360.frequency;
    pan360OscRef.current.connect(stereoRef.current.pan);
    input.connect(stereoRef.current);
    pan360OscRef.current.start();

    return stereoRef.current;
  };

  const togglePlayback = () => {
    if (isPlaying) {
      oscillatorRef.current?.stop();
      tremoloOscRef.current?.stop();
      stereoPanOscRef.current?.stop();
      phaserOscRef.current?.stop();
      ampModOscRef.current?.stop();
      pan360OscRef.current?.stop();
      
      oscillatorRef.current = null;
      tremoloOscRef.current = null;
      stereoPanOscRef.current = null;
      phaserOscRef.current = null;
      ampModOscRef.current = null;
      pan360OscRef.current = null;
      
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current?.close();
      }
      audioContextRef.current = null;
      setIsPlaying(false);
    } else {
      audioContextRef.current = new AudioContext();
      oscillatorRef.current = audioContextRef.current.createOscillator();
      gainNodeRef.current = audioContextRef.current.createGain();

      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);

      oscillatorRef.current.connect(gainNodeRef.current);

      // Set up effects chain
      let currentNode: AudioNode = gainNodeRef.current;
      currentNode = setupTremolo(audioContextRef.current, currentNode);
      currentNode = setupStereoPan(audioContextRef.current, currentNode);
      currentNode = setupPhaser(audioContextRef.current, currentNode);
      currentNode = setupAmplitudeMod(audioContextRef.current, currentNode);
      currentNode = setupPan360(audioContextRef.current, currentNode);
      
      // Connect final node to output
      currentNode.connect(audioContextRef.current.destination);
      
      oscillatorRef.current.start();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-lg border border-purple-500/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-purple-200">{title}</h3>
        </div>
        <button
          onClick={togglePlayback}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-purple-600/30 hover:bg-purple-600/40 text-purple-200'
              : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play
            </>
          )}
        </button>
      </div>
      <p className="text-purple-200/80">{description}</p>
      {effects && (
        <div className="mt-4 pt-4 border-t border-purple-500/20">
          <p className="text-sm text-purple-300/70">
            Effects: {[
              effects.tremolo && 'Tremolo',
              effects.stereoPan && 'Stereo Pan',
              effects.phaser && 'Phaser',
              effects.amplitudeMod && 'Amplitude Mod',
              effects.pan360 && '360° Pan'
            ].filter(Boolean).join(' • ')}
          </p>
        </div>
      )}
    </div>
  );
};

const PresetDemo: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Preset
          frequency={432}
          title="432 Hz Healing"
          description="Experience the calming power of the 432 Hz frequency, known for its harmonious resonance with nature."
          icon={Volume2}
          effects={{
            tremolo: { frequency: 4.8, depth: 0.3 }
          }}
        />
        <Preset
          frequency={7.83}
          title="Schumann Resonance"
          description="Earth's heartbeat frequency (7.83 Hz) for grounding and enhanced meditation."
          icon={Brain}
          effects={{
            amplitudeMod: { frequency: 7.83, depth: 0.5 },
            pan360: { frequency: 0.2 }
          }}
        />
        <Preset
          frequency={528}
          title="528 Hz Solfeggio"
          description="The 'Miracle Tone', associated with transformation and DNA repair, promoting positive energy."
          icon={Music}
          effects={{
            stereoPan: { frequency: 0.5 },
            phaser: { frequency: 0.2, depth: 1000 }
          }}
        />
        <Preset
          frequency={639}
          title="639 Hz Harmony"
          description="Enhances understanding, tolerance, and love. Perfect for deep meditation and emotional healing."
          icon={Waves}
          effects={{
            tremolo: { frequency: 6.39, depth: 0.4 },
            stereoPan: { frequency: 0.3 },
            phaser: { frequency: 0.15, depth: 800 }
          }}
        />
      </div>
    </div>
  );
};

export default PresetDemo;