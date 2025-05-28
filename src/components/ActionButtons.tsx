import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Crown, Sparkles, Save, Download } from 'lucide-react';
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
  const downloadUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup URLs on unmount
      downloadUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
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

      // Show appropriate message based on duration
      if (selectedDuration > 3600) { // > 60 minutes
        toast.info(
          'Processing long audio file. This may take a few minutes. Please keep this tab open.',
          { autoClose: 8000 }
        );
      } else {
        toast.info(
          'Your audio will download as a single file. Please keep this tab open until the download completes.',
          { autoClose: 8000 }
        );
      }

      // Set timeout for the entire export process (12 hours + 30 minutes buffer)
      exportTimeoutRef.current = setTimeout(() => {
        console.error('[Swizard Export] Export timed out after 12.5 hours');
        toast.error('Export timed out. Please try using a shorter duration.', {
          autoClose: 5000
        });
        setExporting(false);
        setProgress(0);
      }, 45000000); // 12.5 hours in milliseconds

      if (selectedDuration > 3600) { // > 60 minutes
        // Use server-side export for long durations
        const formData = new FormData();
        formData.append('totalDuration', selectedDuration.toString());
        formData.append('channels', JSON.stringify(state.channels));
        formData.append('effects', JSON.stringify(state.effects));

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-audio`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Server export failed');
        }

        const { downloadUrl } = await response.json();

        // Create download link
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `swizard-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Use client-side export for shorter durations
        const result = await slicedExport({
          durationSeconds: selectedDuration,
          frequencies: state.channels,
          effects: state.effects,
          onProgress: (value) => {
            setProgress(value);
          }
        });

        // Clear timeout since export completed
        if (exportTimeoutRef.current) {
          clearTimeout(exportTimeoutRef.current);
        }

        const filename = `swizard-${Date.now()}.wav`;
        const url = URL.createObjectURL(result);
        downloadUrlsRef.current.push(url);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
          downloadUrlsRef.current = downloadUrlsRef.current.filter(u => u !== url);
        }, 60000);
      }

      toast.success('Audio saved successfully!');
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
      if (exportTimeoutRef.current) {
        clearTimeout(exportTimeoutRef.current);
      }
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
    return 'Download Now';
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
          <Download className="h-4 w-4" />
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