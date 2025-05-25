import React, { useRef, useEffect, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { X, Zap } from 'lucide-react';
import { getPerformanceProfile, measurePerformance } from '../utils/performance';

interface WaveformOutputProps {
  performanceMode: boolean;
}

const WaveformOutput: React.FC<WaveformOutputProps> = ({ performanceMode }) => {
  const { state, analyserNode } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const bufferRef = useRef<Float32Array | null>(null);
  const prevBufferRef = useRef<Float32Array | null>(null);
  const gradientRef = useRef<CanvasGradient | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const lastDrawTimeRef = useRef(0);
  const performanceProfile = useRef(getPerformanceProfile());
  const frameIntervalRef = useRef(1000 / performanceProfile.current.targetFPS);
  const performanceMonitor = useRef(measurePerformance());

  const hints = [
    'Choose a frequency and press play to start',
    'Add effects below to shape your sound',
    'Try a random preset for inspiration',
    'Export your creation to WAV when ready'
  ];

  useEffect(() => {
    let hintInterval: number;
    let dismissTimeout: number;

    if (showHints) {
      hintInterval = window.setInterval(() => {
        setHintIndex(prev => (prev + 1) % hints.length);
      }, 5000);

      dismissTimeout = window.setTimeout(() => {
        const dismissButton = document.getElementById('dismiss-hints');
        if (dismissButton) {
          dismissButton.classList.add('animate-attention');
        }
      }, 10000);
    }

    return () => {
      clearInterval(hintInterval);
      clearTimeout(dismissTimeout);
    };
  }, [showHints]);

  const interpolateBuffers = (prev: Float32Array, curr: Float32Array, alpha: number): Float32Array => {
    if (!performanceProfile.current.interpolation) return curr;
    
    const result = new Float32Array(curr.length);
    const step = performanceMode ? 2 : 1;
    
    for (let i = 0; i < curr.length; i += step) {
      const value = prev[i] + (curr[i] - prev[i]) * alpha;
      result[i] = value;
      if (step > 1 && i < curr.length - 1) {
        result[i + 1] = value;
      }
    }
    return result;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const canvasCtx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!canvasCtx) return;

    if (!bufferRef.current) {
      const size = performanceMode ? 
        analyserNode.frequencyBinCount / 2 : 
        analyserNode.frequencyBinCount;
      bufferRef.current = new Float32Array(size);
      prevBufferRef.current = new Float32Array(size);
    }

    if (!gradientRef.current || performanceMode) {
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      if (performanceMode) {
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)');
      } else {
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(153, 51, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');
      }
      gradientRef.current = gradient;
    }

    const draw = (timestamp: number) => {
      if (!canvasCtx || !analyserNode || !bufferRef.current || !prevBufferRef.current) return;
      
      const fps = performanceMonitor.current();
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < frameIntervalRef.current) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      lastDrawTimeRef.current = timestamp - (elapsed % frameIntervalRef.current);
      
      prevBufferRef.current.set(bufferRef.current);
      analyserNode.getFloatTimeDomainData(bufferRef.current);
      
      const alpha = Math.min(1, elapsed / frameIntervalRef.current);
      const interpolatedBuffer = interpolateBuffers(prevBufferRef.current, bufferRef.current, alpha);

      canvasCtx.fillStyle = performanceMode ? 
        'rgb(15, 7, 32)' : 
        'rgba(15, 7, 32, 0.3)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (state.isPlaying) {
        const drawLine = (width: number, alpha: number) => {
          if (performanceMode && width > 1) return;
          
          canvasCtx.beginPath();
          canvasCtx.lineWidth = width;
          canvasCtx.strokeStyle = performanceMode ?
            'rgba(139, 92, 246, 0.6)' :
            `rgba(139, 92, 246, ${alpha})`;
          
          const sliceWidth = canvas.width / interpolatedBuffer.length;
          let x = 0;
          
          for (let i = 0; i < interpolatedBuffer.length; i++) {
            const v = interpolatedBuffer[i];
            const y = (v + 1) / 2 * canvas.height;
            
            if (i === 0) {
              canvasCtx.moveTo(x, y);
            } else {
              if (performanceMode) {
                canvasCtx.lineTo(x, y);
              } else {
                const prevX = x - sliceWidth;
                const prevY = ((interpolatedBuffer[i - 1] + 1) / 2) * canvas.height;
                canvasCtx.quadraticCurveTo(
                  prevX + sliceWidth / 2,
                  prevY,
                  x,
                  y
                );
              }
            }
            
            x += sliceWidth;
          }
          
          canvasCtx.stroke();
        };

        if (!performanceMode) {
          drawLine(4, 0.1);
          drawLine(3, 0.2);
          drawLine(2, 0.4);
        }
        drawLine(1, 0.8);
      } else {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = performanceMode ?
          'rgba(139, 92, 246, 0.4)' :
          'rgba(139, 92, 246, 0.6)';
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };
    
    if (state.isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      canvasCtx.fillStyle = 'rgb(15, 7, 32)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.beginPath();
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      canvasCtx.moveTo(0, canvas.height / 2);
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, state.isPlaying, performanceMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === canvas) {
          canvas.width = entry.contentRect.width;
          canvas.height = entry.contentRect.height;
          
          const canvasCtx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
          });
          
          if (canvasCtx) {
            const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
            if (performanceMode) {
              gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
              gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)');
            } else {
              gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
              gradient.addColorStop(0.5, 'rgba(153, 51, 255, 0.8)');
              gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');
            }
            gradientRef.current = gradient;
          }
        }
      }
    });
    
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
      gradientRef.current = null;
    };
  }, [performanceMode]);

  return (
    <section className="mb-4 w-full">
      <div className="bg-[#0f0720]/50 rounded-lg border border-purple-500/20 overflow-hidden w-full md:w-3/4 mx-auto">
        <canvas 
          ref={canvasRef} 
          className="w-full h-16"
        ></canvas>
        <div className="relative bg-[#0f0720]/50 py-2 border-t border-purple-500/10">
          {showHints ? (
            <div className="flex items-center justify-center gap-4">
              <p
                className="text-sm text-purple-300/70 transition-opacity duration-500"
                style={{ opacity: showHints ? 1 : 0 }}
              >
                {hints[hintIndex]}
              </p>
              <button
                id="dismiss-hints"
                onClick={() => setShowHints(false)}
                className="absolute right-2 p-1.5 rounded-full hover:bg-purple-500/20 transition-colors"
                title="Dismiss hints"
              >
                <X className="h-4 w-4 text-purple-400" />
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-purple-300/70">
              Live audio waveform visualization
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default WaveformOutput;