import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Crown, Sparkles, Save } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import RecordRTC from 'recordrtc';

interface ActionButtonsProps {
  onShowPricing: () => void;
  selectedDuration: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onShowPricing, selectedDuration }) => {
  const { state, togglePlayback, sharePreset } = useAudio();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<RecordRTC | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleShare = async () => {
    try {
      const name = prompt('Enter a name for this preset:');
      if (!name) return;

      const presetId = await sharePreset(name);
      const url = `${window.location.origin}/app/preset/${presetId}`;
      
      await navigator.clipboard.writeText(url);
      
      toast.success('Link copied! Share your creation to inspire others.', {
        icon: '✨',
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
    } catch (error: any) {
      console.error('Error sharing preset:', error);
      toast.error(error.message || 'Failed to create share link', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
    }
  };

  const cleanupExport = () => {
    console.log('Cleaning up export resources');
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.destroy();
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleExport = async () => {
    if (selectedDuration < 30) {
      toast.error('Please select a duration of at least 30 seconds', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
      return;
    }

    if (exporting) {
      toast.info('Export in progress...', {
        autoClose: 3000,
        pauseOnHover: true,
        closeButton: true
      });
      return;
    }

    try {
      setExporting(true);
      setProgress(0);

      console.log('Starting MP4 export process');

      // Initialize audio context and worker
      audioContextRef.current = new AudioContext();
      console.log('Audio context created:', audioContextRef.current.state);

      workerRef.current = new Worker(
        new URL('../audio/audioWorker.ts', import.meta.url),
        { type: 'module' }
      );
      console.log('Audio worker initialized');

      // Create audio processing nodes
      const destination = audioContextRef.current.createMediaStreamDestination();
      mediaStreamRef.current = destination.stream;
      console.log('Audio destination created, stream tracks:', mediaStreamRef.current.getTracks().length);

      // Initialize MediaRecorder with high quality settings
      mediaRecorderRef.current = new RecordRTC(mediaStreamRef.current, {
        type: 'video',
        mimeType: 'video/mp4',
        frameRate: 1,
        quality: 1,
        width: 1280,
        height: 720,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 320000,
        recorderType: RecordRTC.MediaStreamRecorder,
        timeSlice: 1000, // Get data every second
        ondataavailable: (blob) => {
          console.log('Data chunk available:', blob.size, 'bytes');
        }
      });

      console.log('MP4 recording started');
      mediaRecorderRef.current.startRecording();

      // Set up worker message handling
      workerRef.current.onmessage = async (e) => {
        const { type, audioData, progress: currentProgress } = e.data;

        switch (type) {
          case 'chunk':
            if (audioData) {
              console.log('Processing audio chunk');
              const audioBuffer = await audioContextRef.current!.decodeAudioData(audioData);
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(destination);
              source.start();
              console.log('Audio chunk connected to recorder');
            }
            setProgress(currentProgress);
            break;

          case 'complete':
            console.log('Audio generation complete, stopping recording');
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stopRecording(() => {
                const blob = mediaRecorderRef.current?.getBlob();
                if (blob) {
                  console.log(`MP4 blob created - ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `swizard-${Date.now()}.mp4`;
                  document.body.appendChild(a);
                  console.log('MP4 download triggered');
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  console.log('MP4 export complete');
                } else {
                  console.error('Failed to create MP4 blob');
                  toast.error('Export failed - no data generated');
                }
                cleanupExport();
                setExporting(false);
                setProgress(0);
              });
            } else {
              console.error('MediaRecorder not initialized');
              toast.error('Export failed - recorder not initialized');
              cleanupExport();
              setExporting(false);
              setProgress(0);
            }
            break;

          case 'error':
            throw new Error(e.data.error);
        }
      };

      // Start audio generation
      workerRef.current.postMessage({
        type: 'generate',
        data: {
          channels: state.channels,
          duration: selectedDuration
        }
      });

      console.log('Audio generation started');

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Export failed - please try again', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
      cleanupExport();
      setExporting(false);
      setProgress(0);
    }
  };

  const getExportButtonText = () => {
    if (exporting) {
      if (progress === 100) {
        return 'Finalizing...';
      }
      return `Rendering... ${Math.round(progress)}%`;
    }
    return 'Export MP4';
  };

  return (
    <section className="mb-6">      
      <div className="flex flex-nowrap overflow-x-auto md:overflow-visible md:flex-wrap justify-center gap-2 md:gap-3 px-4 md:px-0 -mx-4 md:mx-0 pb-4 md:pb-0 mb-4 md:mb-8">
        <button
          onClick={togglePlayback}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0"
        >
          {state.isPlaying ? 'Stop' : 'Play'}
        </button>
        
        <div className="has-tooltip">
          <button
            disabled={true}
            className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-violet-600/50 to-fuchsia-600/50 opacity-50 cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            Export MP4
          </button>
          <div className="tooltip -translate-y-full -translate-x-1/2 left-1/2 top-0 w-48 text-xs">
            Export feature coming soon
          </div>
        </div>

        <button
          onClick={handleShare}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0"
          title="Share your creation to inspire others"
        >
          <Sparkles className="h-4 w-4" />
          Inspire Others
        </button>
        
        <button
          onClick={onShowPricing}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0"
        >
          <Crown className="h-4 w-4" />
          Go Pro
        </button>
      </div>

      {exporting && progress > 0 && (
        <div className="relative px-4">
          <div className="h-1 bg-purple-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ActionButtons;