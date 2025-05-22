import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

const FPSCounter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fps, setFps] = useState(0);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);

  useEffect(() => {
    const updateFPS = () => {
      const currentTime = performance.now();
      framesRef.current++;

      if (currentTime >= lastTimeRef.current + 1000) {
        setFps(framesRef.current);
        framesRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      frameRef.current = requestAnimationFrame(updateFPS);
    };

    frameRef.current = requestAnimationFrame(updateFPS);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Activity className="h-4 w-4 text-purple-400" />
      <span className="font-mono text-purple-200">{fps} FPS</span>
    </div>
  );
};

export default FPSCounter;