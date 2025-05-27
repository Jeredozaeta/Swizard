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
    // For testing, temporarily override duration to 1 second
    const testDuration = 1;
    console.log('Starting export with test duration:', testDuration);

    if (exporting) {
      console.log('Export already in progress');
      return;
    }

    try {
      setExporting(true);
      setProgress(0);

      console.log('Initializing audio context');
      audioContextRef.current = new AudioContext();

      console.log('Creating worker');
      workerRef.current = new Worker(
        new URL('../audio/audioWorker.ts', import.meta.url),
        { type: 'module' }
      );

      console.log('Setting up audio nodes');
      const destination = audioContextRef.current.createMediaStreamDestination();
      mediaStreamRef.current = destination.stream;
      console.log('Media stream created:', mediaStreamRef.current.id);

      console.log('Initializing MediaRecorder');
      mediaRecorderRef.current = new RecordRTC(mediaStreamRef.current, {
        type: 'video',
        mimeType: 'video/mp4',
        frameRate: 1,
        quality: 1,
        width: 1280,
        height: 720,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 320000
      });

      console.log('Starting recording');
      mediaRecorderRef.current.startRecording();

      workerRef.current.onmessage = async (e) => {
        console.log('Worker message received:', e.data.type);
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
            mediaRecorderRef.current?.stopRecording(() => {
              const blob = mediaRecorderRef.current?.getBlob();
              if (blob) {
                console.log(`MP4 blob created - ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `swizard-${Date.now()}.mp4`;
                document.body.appendChild(a);
                console.log('Triggering download');
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Download complete');
              } else {
                console.error('Failed to create MP4 blob');
                toast.error('Export failed - no data generated');
              }
              cleanupExport();
              setExporting(false);
              setProgress(0);
            });
            break;

          case 'error':
            throw new Error(e.data.error);
        }
      };

      console.log('Starting audio generation');
      workerRef.current.postMessage({
        type: 'generate',
        data: {
          channels: state.channels,
          duration: testDuration // Use test duration
        }
      });

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
    return 'Download Audio';
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
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Save className="h-4 w-4" />
          {getExportButtonText()}
        </button>

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