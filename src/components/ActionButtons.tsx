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
  const mediaRecorderRef = useRef<RecordRTC | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const oscillatorNodesRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

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
    
    // Stop and cleanup oscillators
    oscillatorNodesRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        console.warn('Error cleaning up oscillator:', e);
      }
    });
    oscillatorNodesRef.current = [];

    // Cleanup gain nodes
    gainNodesRef.current.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        console.warn('Error cleaning up gain node:', e);
      }
    });
    gainNodesRef.current = [];

    // Cleanup master gain
    if (masterGainRef.current) {
      try {
        masterGainRef.current.disconnect();
      } catch (e) {
        console.warn('Error cleaning up master gain:', e);
      }
      masterGainRef.current = null;
    }

    // Cleanup destination
    if (destinationRef.current) {
      try {
        destinationRef.current.disconnect();
      } catch (e) {
        console.warn('Error cleaning up destination:', e);
      }
      destinationRef.current = null;
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

    setExporting(false);
    setProgress(0);
  };

  const handleExport = async () => {
    if (selectedDuration < 1) {
      toast.error('Please select a valid duration', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
      return;
    }

    if (exporting) {
      console.log('Export already in progress');
      return;
    }

    try {
      setExporting(true);
      setProgress(0);

      console.log('Initializing audio context and nodes');
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      // Create master gain for overall volume control
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.setValueAtTime(0.8, ctx.currentTime);

      // Create MediaStream destination
      console.log('Creating MediaStream destination');
      destinationRef.current = ctx.createMediaStreamDestination();
      mediaStreamRef.current = destinationRef.current.stream;
      console.log('Media stream created:', mediaStreamRef.current.id);

      // Connect master gain to destination
      masterGainRef.current.connect(destinationRef.current);

      // Set up audio nodes for each enabled channel
      console.log('Setting up audio nodes for enabled channels');
      const enabledChannels = state.channels.filter(c => c.enabled);
      console.log(`Active channels: ${enabledChannels.length}`);

      enabledChannels.forEach((channel, index) => {
        console.log(`Creating oscillator for channel ${index}:`, channel);
        
        // Create oscillator
        const oscillator = ctx.createOscillator();
        oscillator.type = channel.waveform;
        oscillator.frequency.setValueAtTime(channel.frequency, ctx.currentTime);
        
        // Create channel gain node
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(1.0 / enabledChannels.length, ctx.currentTime);
        
        // Connect channel nodes
        oscillator.connect(gainNode);
        gainNode.connect(masterGainRef.current!);
        
        // Store refs for cleanup
        oscillatorNodesRef.current.push(oscillator);
        gainNodesRef.current.push(gainNode);
        
        // Start oscillator
        oscillator.start();
        console.log(`Started oscillator ${index} at ${channel.frequency}Hz`);
      });

      console.log('Initializing MediaRecorder');
      mediaRecorderRef.current = new RecordRTC(mediaStreamRef.current, {
        type: 'video',
        mimeType: 'video/mp4',
        frameRate: 1,
        quality: 1,
        width: 1280,
        height: 720,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 320000,
        timeSlice: 1000,
        ondataavailable: (blob: Blob) => {
          console.log('Data chunk available:', blob.size, 'bytes');
        }
      });

      console.log('Starting recording');
      mediaRecorderRef.current.startRecording();

      // Set up progress tracking
      let elapsedTime = 0;
      const progressInterval = setInterval(() => {
        if (!exporting) {
          clearInterval(progressInterval);
          return;
        }

        elapsedTime += 1;
        const newProgress = (elapsedTime / selectedDuration) * 100;
        setProgress(Math.min(newProgress, 100));

        if (elapsedTime >= selectedDuration) {
          clearInterval(progressInterval);
        }
      }, 1000);

      // Stop recording after duration
      setTimeout(() => {
        console.log('Stopping recording');
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stopRecording(() => {
            const blob = mediaRecorderRef.current?.getBlob();
            
            if (blob && blob.size > 0) {
              console.log(`MP4 blob created: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `swizard-${Date.now()}.mp4`;
              document.body.appendChild(a);
              
              console.log('Triggering download');
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              toast.success('Export complete!', {
                autoClose: 3000
              });
            } else {
              console.error('Invalid blob:', blob);
              toast.error('Export failed - no audio data generated');
            }
            
            cleanupExport();
          });
        }
      }, selectedDuration * 1000);

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Export failed - please try again', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
      cleanupExport();
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