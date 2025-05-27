import React, { useState, useRef } from 'react';
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
  const [currentSlice, setCurrentSlice] = useState<number>(0);
  const [totalSlices, setTotalSlices] = useState<number>(0);

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

  const triggerDownload = (blob: Blob, filename: string): Promise<void> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      console.log('download-triggered');
      document.body.removeChild(a);

      // Clean up after download starts
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 1000);
    });
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
      setCurrentSlice(0);
      setTotalSlices(0);

      const timestamp = Date.now();
      const blobs = await slicedExport({
        durationSeconds: selectedDuration,
        frequencies: state.channels,
        effects: state.effects,
        onProgress: setProgress,
        onSliceComplete: (slice, total) => {
          setCurrentSlice(slice);
          setTotalSlices(total);
          toast.success(`Slice ${slice} of ${total} complete`, {
            autoClose: 2000
          });
        }
      });

      // Download each slice
      for (let i = 0; i < blobs.length; i++) {
        const filename = blobs.length === 1
          ? `swizard-export-${timestamp}.wav`
          : `swizard-export-${timestamp}-part-${i + 1}.wav`;

        await triggerDownload(blobs[i], filename);

        // Small delay between downloads
        if (i < blobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success('Export complete!', {
        autoClose: 4000
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed - see console for details', {
        autoClose: 5000,
        pauseOnHover: true,
        closeButton: true
      });
    } finally {
      setExporting(false);
      setProgress(0);
      setCurrentSlice(0);
      setTotalSlices(0);
    }
  };

  const getExportButtonText = () => {
    if (exporting) {
      if (totalSlices > 1) {
        return `Rendering slice ${currentSlice}/${totalSlices}... ${Math.round(progress)}%`;
      }
      if (progress === 100) {
        return 'Finalizing...';
      }
      return `Rendering... ${Math.round(progress)}%`;
    }
    return 'Export WAV';
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