import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Play, Crown, Sparkles, Save, Download, XCircle } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

interface ActionButtonsProps {
  onShowPricing: () => void;
  selectedDuration: number;
}

type ExportStatus = 'idle' | 'rendering' | 'ready' | 'error';

const MIN_AUDIO_SIZE = 1024; // 1KB minimum size
const TOAST_DURATION = 5000; // 5 seconds
const BYTES_PER_SECOND = 192000; // 48kHz * 16-bit * 2 channels
const GB_THRESHOLD = 3 * 1024 * 1024 * 1024; // 3GB in bytes

const ActionButtons: React.FC<ActionButtonsProps> = ({ onShowPricing, selectedDuration }) => {
  const { state, togglePlayback, sharePreset } = useAudio();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const retryTimeoutRef = useRef<number | null>(null);
  
  const cleanupWorker = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    audioChunksRef.current = [];
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
        autoClose: TOAST_DURATION,
        pauseOnHover: true,
        closeButton: true
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error sharing preset:', error);
      toast.error(error.message || 'Failed to create share link', {
        autoClose: TOAST_DURATION,
        pauseOnHover: true,
        closeButton: true
      });
    }
  };

  const estimateFileSize = (duration: number): number => {
    return Math.ceil(duration * BYTES_PER_SECOND);
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const saveFile = () => {
    try {
      if (!audioChunksRef.current.length) {
        toast.error('No audio data available', {
          autoClose: TOAST_DURATION,
          pauseOnHover: true,
          closeButton: true
        });
        return;
      }

      const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      
      if (finalBlob.size < MIN_AUDIO_SIZE) {
        toast.error('Export failed — please try again', {
          autoClose: TOAST_DURATION,
          pauseOnHover: true,
          closeButton: true
        });
        setExportStatus('error');
        cleanupWorker();
        return;
      }

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      downloadUrlRef.current = URL.createObjectURL(finalBlob);
      
      const a = document.createElement('a');
      a.href = downloadUrlRef.current;
      a.download = `swizard-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.info('Download started — check your files', {
        autoClose: TOAST_DURATION,
        closeButton: true
      });
    } catch (error: any) {
      console.error('Save file error:', error);
      const isDiskFullError = error.name === 'QuotaExceededError' || 
                            error.message.includes('storage') ||
                            error.message.includes('quota') ||
                            error.message.includes('disk');
      
      toast.error(
        isDiskFullError 
          ? 'Download failed — Your device ran out of space'
          : 'Export failed — please try again',
        {
          autoClose: TOAST_DURATION,
          pauseOnHover: true,
          closeButton: true
        }
      );
      setExportStatus('error');
      cleanupWorker();
    }
  };

  const handleDownload = async () => {
    if (selectedDuration < 30) {
      toast.error('Please select a duration of at least 30 seconds', {
        autoClose: TOAST_DURATION,
        pauseOnHover: true,
        closeButton: true
      });
      return;
    }

    if (exportStatus === 'rendering') {
      toast.info('Please wait while your audio is being rendered...', {
        autoClose: TOAST_DURATION,
        pauseOnHover: true,
        closeButton: true
      });
      return;
    }

    if (exportStatus === 'ready' && audioChunksRef.current.length > 0) {
      saveFile();
      return;
    }

    // Check estimated file size
    const estimatedBytes = estimateFileSize(selectedDuration);
    if (estimatedBytes >= GB_THRESHOLD) {
      const sizeStr = formatFileSize(estimatedBytes);
      const confirmed = window.confirm(
        `Make sure you have enough disk space. This export is approximately ${sizeStr}. Do you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setDownloading(true);
      setProgress(0);
      setExportStatus('rendering');
      cleanupWorker();
      audioChunksRef.current = [];

      workerRef.current = new Worker(
        new URL('../audio/audioWorker.ts', import.meta.url),
        { type: 'module' }
      );

      const worker = workerRef.current;
      let lastChunkIndex = -1;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      const messageHandler = async (e: MessageEvent) => {
        const { type, header, data, isFirstChunk, isLastChunk, progress, error } = e.data;

        switch (type) {
          case 'chunk':
            try {
              const chunkParts = [];
              if (header) chunkParts.push(header);
              if (data) chunkParts.push(data);
              
              const chunkBlob = new Blob(chunkParts, { type: 'audio/wav' });
              audioChunksRef.current.push(chunkBlob);

              setProgress(progress);
              lastChunkIndex++;

              if (isLastChunk) {
                setExportStatus('ready');
                setDownloading(false);
                setProgress(0);
                saveFile();
              }
            } catch (error: any) {
              console.error('Chunk processing error:', error);
              const isDiskFullError = error.name === 'QuotaExceededError' || 
                                    error.message.includes('storage') ||
                                    error.message.includes('quota') ||
                                    error.message.includes('disk');
              
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`Retrying chunk processing (attempt ${retryCount})`);
                
                // Wait before retrying
                retryTimeoutRef.current = window.setTimeout(() => {
                  // Remove the last failed chunk
                  if (audioChunksRef.current.length > lastChunkIndex) {
                    audioChunksRef.current.pop();
                  }
                  
                  // Restart the worker
                  cleanupWorker();
                  handleDownload();
                }, 1000 * retryCount);
                
                return;
              }
              
              toast.error(
                isDiskFullError 
                  ? 'Download failed — Your device ran out of space'
                  : 'Export failed — please try again',
                {
                  autoClose: TOAST_DURATION,
                  pauseOnHover: true,
                  closeButton: true
                }
              );
              setExportStatus('error');
              cleanupWorker();
              setDownloading(false);
              setProgress(0);
            }
            break;

          case 'error':
            console.error('Worker error:', error);
            setExportStatus('error');
            cleanupWorker();
            
            toast.error('Export failed — please try again', {
              autoClose: TOAST_DURATION,
              pauseOnHover: true,
              closeButton: true
            });
            
            setDownloading(false);
            setProgress(0);
            break;
        }
      };

      worker.addEventListener('message', messageHandler);

      worker.postMessage({
        type: 'generate',
        data: {
          channels: state.channels,
          duration: selectedDuration
        }
      });
    } catch (error) {
      console.error('Download error:', error);
      setExportStatus('error');
      toast.error('Export failed — please try again', {
        autoClose: TOAST_DURATION,
        pauseOnHover: true,
        closeButton: true
      });
      cleanupWorker();
      setDownloading(false);
      setProgress(0);
    }
  };
  
  const handleCancelDownload = () => {
    cleanupWorker();
    setExportStatus('idle');
    
    toast.info('Export cancelled', {
      autoClose: TOAST_DURATION,
      pauseOnHover: true,
      closeButton: true
    });
    
    setDownloading(false);
    setProgress(0);
  };

  const getExportButtonText = () => {
    switch (exportStatus) {
      case 'rendering':
        return `Rendering... ${Math.round(progress)}%`;
      case 'ready':
        return 'Download WAV';
      case 'error':
        return 'Export Failed';
      default:
        return 'Export WAV';
    }
  };

  return (
    <section className="mb-6">      
      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={togglePlayback}
          className="btn btn-primary btn-sm"
        >
          <Play className="h-4 w-4" />
          {state.isPlaying ? 'Stop' : 'Play'}
        </button>
        
        <div className="relative">
          <button
            onClick={handleDownload}
            disabled={downloading || selectedDuration < 30 || exportStatus === 'error' || exportStatus === 'rendering'}
            className={`btn btn-primary btn-sm bg-gradient-to-r ${
              exportStatus === 'ready'
                ? 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500'
            } shadow-lg hover:shadow-xl transition-all duration-300`}
          >
            <Save className="h-4 w-4" />
            {getExportButtonText()}
          </button>
          {exportStatus === 'rendering' && (
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-purple-900/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <button
          onClick={handleShare}
          className={`btn btn-primary btn-sm ${hasChanges ? 'animate-attention' : ''}`}
          title="Share your creation to inspire others"
        >
          <Sparkles className="h-4 w-4" />
          Inspire Others
        </button>
        
        <button
          onClick={onShowPricing}
          className="btn btn-primary btn-sm"
        >
          <Crown className="h-4 w-4" />
          Go Pro
        </button>
      </div>

      {downloading && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-8">
          <button
            onClick={handleCancelDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            title="Cancel this export"
          >
            <XCircle className="h-4 w-4" />
            Cancel Export
          </button>
        </div>
      )}
    </section>
  );
};

export default ActionButtons;