import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const PresetDemo: React.FC = () => {
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
      oscillatorRef.current.frequency.setValueAtTime(432, audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);

      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      oscillatorRef.current.start();
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 mb-16">
      <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-lg border border-purple-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-purple-200">432 Hz Healing Frequency</h3>
          </div>
          <button
            onClick={togglePlayback}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-purple-300 transition-colors"
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
        <p className="text-purple-200/80">
          Experience the calming power of the 432 Hz frequency, known for its harmonious resonance with nature and potential healing properties.
        </p>
      </div>
    </div>
  );
};

export default PresetDemo;