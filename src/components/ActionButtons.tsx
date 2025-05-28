import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Crown, Sparkles, Save } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { slicedExport } from '../audio/slicedExport';

interface ActionButtonsProps {
  onShowPricing: () => void;
  selectedDuration: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onShowPricing, selectedDuration }) => {
  const { state, togglePlayback, sharePreset } = useAudio();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const exportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalizingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const downloadURLRef = useRef<string | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  useEffect(() => {
    const handleExportComplete = (event: CustomEvent<{ url: string; size: number }>) => {
      downloadURLRef.current = event.detail.url;
      console.log('[Swizard Export] Export complete, size:', (event.detail.size / 1024 / 1024).toFixed(2), 'MB');
    };

    document.addEventListener('swizardExportComplete', handleExportComplete as EventListener);
    return () => {
      document.removeEventListener('swizardExportComplete', handleExportComplete as EventListener);
    };
  }, []);

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

  const triggerDownload = (url: string, filename: string) => {
    if (downloadTriggered) return;
    setDownloadTriggered(true);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    downloadURLRef.current = url;

    toast.info(
      <div>
        If download doesn't start, {' '}
        <button
          onClick={() => triggerDownload(url, filename)}
          className="underline text-purple-400 hover:text-purple-300"
        >
          click here
        </button>
      </div>,
      { autoClose: 10000 }
    );
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
      setDownloadTriggered(false);

      // Log export details
      console.log('[Swizard Export] Starting export:', {
        duration: selectedDuration,
        activeEffects: Object.values(state.effects).filter(e => e.enabled).length,
        activeChannels: state.channels.filter(c => c.enabled).length
      });

      // Set timeout for the entire export process (5 minutes)
      exportTimeoutRef.current = setTimeout(() => {
        console.error('[Swizard Export] Export timed out after 5 minutes');
        toast.error('Export timed out. Try using a shorter duration or fewer effects.', {
          autoClose: 5000
        });
        setExporting(false);
        setProgress(0);
      }, 300000);

      const blobs = await slicedExport({
        durationSeconds: selectedDuration,
        frequencies: state.channels,
        effects: state.effects,
        onProgress: (percent) => {
          setProgress(percent);
          
          // Set timeout for finalization phase
          if (percent === 100 && !finalizingTimeoutRef.current) {
            finalizingTimeoutRef.current = setTimeout(() => {
              console.log('[Swizard Export] Finalization taking too long, triggering fallback...');
              if (downloadURLRef.current && !downloadTriggered) {
                triggerDownload(downloadURLRef.current, `swizard-fallback-${Date.now()}.wav`);
              }
            }, 15000);
          }
        }
      });

      // Clear timeouts since export completed
      if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current);
      if (finalizingTimeoutRef.current) clearTimeout(finalizingTimeoutRef.current);

      if (blobs.length === 1) {
        const url = URL.createObjectURL(blobs[0]);
        const filename = `swizard-${Date.now()}.wav`;
        triggerDownload(url, filename);

        console.log('[Swizard Export] Final file size:', (blobs[0].size / 1024 / 1024).toFixed(2), 'MB');
        toast.success('Audio saved successfully!');
      } else {
        blobs.forEach((blob, index) => {
          const url = URL.createObjectURL(blob);
          const filename = `swizard-${Date.now()}-part${index + 1}.wav`;
          triggerDownload(url, filename);
          
          console.log('[Swizard Export] Part', index + 1, 'size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        });

        toast.success(`${blobs.length} audio files saved successfully!`);
      }
    } catch (error: any) {
      console.error('[Swizard Export] Export error:', {
        message: error.message,
        duration: selectedDuration,
        activeEffects: Object.values(state.effects).filter(e => e.enabled).length
      });
      
      toast.error('Export failed - please try again', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
    } finally {
      if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current);
      if (finalizingTimeoutRef.current) clearTimeout(finalizingTimeoutRef.current);
      setExporting(false);
      setProgress(0);
    }
  };

  const getExportButtonText = () => {
    if (exporting) {
      if (progress === 100) {
        return 'Finalizing...';
      }
      return `Saving... ${Math.round(progress)}%`;
    }
    return 'Save';
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