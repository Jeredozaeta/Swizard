import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Music } from 'lucide-react';

interface PresetProps {
  frequency: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const Preset: React.FC<PresetProps> = ({ frequency, title, description, icon: Icon }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
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
      gainNodeRef.current.connect(audioContextRef.current.destination);
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
    </div>
  );
};

const PresetDemo: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 mb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Preset
          frequency={432}
          title="432 Hz Healing Frequency"
          description="Experience the calming power of the 432 Hz frequency, known for its harmonious resonance with nature and potential healing properties."
          icon={Volume2}
        />
        <Preset
          frequency={528}
          title="528 Hz Solfeggio Frequency"
          description="Known as the 'Miracle Tone', 528 Hz is associated with transformation and DNA repair, promoting positive energy and mental clarity."
          icon={Music}
        />
      </div>
    </div>
  );
};

export default PresetDemo;