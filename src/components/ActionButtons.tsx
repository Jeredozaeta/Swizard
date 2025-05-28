import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Crown, Sparkles, Save, Cloud } from 'lucide-react';
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
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const downloadUrlsRef = useRef<string[]>([]);
  const [serverExport, setServerExport] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup URLs on unmount
      downloadUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
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
  };

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

  const handleServerExport = async () => {
    if (selectedDuration < 30) {
      toast.error('Please select a duration of at least 30 seconds');
      return;
    }

    setExporting(true);
    setProgress(0);
    toast.info('Starting server-side export. This may take longer to prepare — file will be ready to download shortly.', {
      autoClose: 5000
    });

    try {
      // Create a simple progress callback that only passes the number
      const progressCallback = (value: number) => {
        setProgress(value);
      };

      const chunks: Blob[] = [];
      let currentChunk = 0;
      const totalChunks = Math.ceil(selectedDuration / 600); // 10-minute chunks

      for (let i = 0; i < totalChunks; i++) {
        const startTime = i * 600;
        const duration = Math.min(600, selectedDuration - startTime);

        const result = await slicedExport({
          durationSeconds: duration,
          frequencies: state.channels,
          effects: state.effects,
          onProgress: (percent) => {
            const overallProgress = ((currentChunk * 100) + percent) / totalChunks;
            progressCallback(Math.min(99, overallProgress));
          }
        });

        if (Array.isArray(result)) {
          chunks.push(...result);
        } else {
          chunks.push(result);
        }
        
        currentChunk++;
      }

      // Upload chunks to server
      const formData = new FormData();
      chunks.forEach((chunk, index) => {
        formData.append(`chunk${index}`, chunk);
      });
      formData.append('totalDuration', selectedDuration.toString());

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stitch-audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process audio on server');
      }

      const { downloadUrl } = await response.json();
      
      // Trigger download of the complete file
      window.location.href = downloadUrl;
      
      toast.success('Export complete! Your file will download automatically.');
    } catch (error: any) {
      console.error('Server export error:', error);
      toast.error('Export failed - please try again', {
        autoClose: 5000
      });
    } finally {
      setExporting(false);
      setProgress(0);
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
      setDownloadTriggered(false);

      console.log('[Swizard Export] Starting export:', {
        duration: selectedDuration,
        activeEffects: Object.values(state.effects).filter(e => e.enabled).length,
        activeChannels: state.channels.filter(c => c.enabled).length
      });

      // Set timeout for the entire export process (30 minutes)
      exportTimeoutRef.current = setTimeout(() => {
        console.error('[Swizard Export] Export timed out after 30 minutes');
        toast.error('Export timed out. Please try using a shorter duration.', {
          autoClose: 5000
        });
        setExporting(false);
        setProgress(0);
      }, 1800000);

      // Create a simple progress callback that only passes the number
      const progressCallback = (value: number) => {
        setProgress(value);
      };

      const result = await slicedExport({
        durationSeconds: selectedDuration,
        frequencies: state.channels,
        effects: state.effects,
        onProgress: progressCallback,
        onSliceComplete: (current, total, blob) => {
          // If we have multiple parts, trigger download for each part immediately
          if (total > 1) {
            const fileName = `swizard-part${current.toString().padStart(2, '0')}.wav`;
            triggerDownload(blob, fileName);
            toast.info(`Part ${current} of ${total} ready for download`, {
              autoClose: 2000
            });
          }
        }
      });

      // Clear timeout since export completed
      if (exportTimeoutRef.current) {
        clearTimeout(exportTimeoutRef.current);
      }

      if (Array.isArray(result)) {
        // Multiple files were returned without ZIP
        if (!downloadTriggered) {
          result.forEach((blob, index) => {
            const fileName = `swizard-part${(index + 1).toString().padStart(2, '0')}.wav`;
            triggerDownload(blob, fileName);
          });
        }
        toast.success(`${result.length} audio files saved successfully!`);
      } else {
        // Single file or ZIP
        const isZip = result.type === 'application/zip';
        const filename = isZip ? 
          `swizard-export-${Date.now()}.zip` : 
          `swizard-${Date.now()}.wav`;
        
        triggerDownload(result, filename);
        toast.success(isZip ? 'Audio files saved as ZIP!' : 'Audio saved successfully!');
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
          onClick={serverExport ? handleServerExport : handleExport}
          disabled={exporting}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {serverExport ? <Cloud className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {getExportButtonText()}
        </button>

        <button
          onClick={() => setServerExport(!serverExport)}
          className={`btn btn-sm whitespace-nowrap flex-shrink-0 ${
            serverExport 
              ? 'bg-violet-600 text-white'
              : 'bg-violet-600/20 text-violet-300'
          }`}
          title={serverExport ? 'Switch to local export' : 'Switch to server export'}
        >
          <Cloud className="h-4 w-4" />
          Server Mode: {serverExport ? 'On' : 'Off'}
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