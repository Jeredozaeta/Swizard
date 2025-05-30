import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Crown, Sparkles, Save, Download, Image, Video, X, LampDesk as Desktop, WifiOff } from 'lucide-react';
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
  const isElectron = !!(window as any).electron;
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<{
    type: 'black' | 'image' | 'video';
    file?: File;
    preview?: string;
  }>({ type: 'black' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (isElectron) {
      // Initial online status check
      window.electron.getOnlineStatus().then(setIsOnline);

      // Listen for online status changes
      const cleanup = window.electron.onOnlineStatusChanged((status) => {
        setIsOnline(status);
      });

      return cleanup;
    } else {
      // Browser online/offline detection
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnline(navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isElectron]);

  useEffect(() => {
    return () => {
      downloadUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      if (selectedBackground.preview) {
        URL.revokeObjectURL(selectedBackground.preview);
      }
    };
  }, []);

  const handleShare = async () => {
    if (!isOnline) {
      toast.error('Sharing is not available while offline');
      return;
    }

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

  const handleBackgroundSelect = (type: 'black' | 'image' | 'video') => {
    if (type === 'black') {
      setSelectedBackground({ type: 'black' });
    } else {
      fileInputRef.current?.click();
      setSelectedBackground({ type });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedBackground.type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG or PNG)');
      return;
    }

    if (selectedBackground.type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4)');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedBackground({ ...selectedBackground, file, preview });
  };

  const handleElectronExport = async () => {
    try {
      const isVideo = selectedBackground.type !== 'black';
      const defaultPath = `swizard-${Date.now()}.${isVideo ? 'mp4' : 'wav'}`;
      const filePath = await window.electron.showSaveDialog({ defaultPath });
      
      if (!filePath) return;

      const { available } = await window.electron.checkDiskSpace(filePath);
      const requiredSpace = selectedDuration * (isVideo ? 384000 : 192000);

      if (available < requiredSpace) {
        toast.error(`Not enough disk space. Need ${Math.ceil(requiredSpace / 1024 / 1024)} MB free.`);
        return;
      }

      setExporting(true);
      setProgress(0);

      const chunks: ArrayBuffer[] = [];
      const chunkDuration = 600;
      const numChunks = Math.ceil(selectedDuration / chunkDuration);

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkDuration;
        const duration = Math.min(chunkDuration, selectedDuration - start);

        const result = await slicedExport({
          durationSeconds: duration,
          frequencies: state.channels,
          effects: state.effects,
          onProgress: (value) => {
            const chunkProgress = (i * 100 + value) / numChunks;
            setProgress(Math.round(chunkProgress * 0.7));
          }
        });

        chunks.push(await result.arrayBuffer());
      }

      const cleanup = window.electron.onExportProgress((ffmpegProgress) => {
        setProgress(70 + Math.round(ffmpegProgress * 0.3));
      });

      await window.electron.startFfmpegExport({
        chunks,
        outputPath: filePath,
        format: isVideo ? 'mp4' : 'wav',
        background: selectedBackground.file ? {
          type: selectedBackground.type,
          path: selectedBackground.file.path
        } : undefined
      });

      cleanup();
      setProgress(100);
      
      toast.success(`File saved to ${filePath}`, {
        autoClose: 5000
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
      setProgress(0);
      setShowBackgroundPicker(false);
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

    if (isElectron) {
      setShowBackgroundPicker(true);
      return;
    }

    try {
      setExporting(true);
      setProgress(0);

      if (selectedDuration > 3600) {
        if (!isOnline) {
          toast.error('Server export is not available while offline. Please use the desktop app for long exports.');
          return;
        }

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

      exportTimeoutRef.current = setTimeout(() => {
        console.error('[Swizard Export] Export timed out after 12.5 hours');
        toast.error('Export timed out. Please try using a shorter duration.', {
          autoClose: 5000
        });
        setExporting(false);
        setProgress(0);
      }, 45000000);

      if (selectedDuration > 3600 && isOnline) {
        setProgress(10);
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

        setProgress(80);
        const { downloadUrl } = await response.json();
        setProgress(90);

        if (!downloadUrl) {
          throw new Error('No download URL received from server');
        }

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `swizard-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setProgress(100);
      } else {
        const result = await slicedExport({
          durationSeconds: selectedDuration,
          frequencies: state.channels,
          effects: state.effects,
          onProgress: (value) => {
            setProgress(value);
          }
        });

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

        {selectedDuration > 3600 && !isElectron && (
          <div className="has-tooltip">
            <a
              href="https://github.com/Jeredozaeta/Swizard/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm whitespace-nowrap flex-shrink-0"
            >
              <Desktop className="h-4 w-4" />
              Download Desktop App (Recommended)
            </a>
            <div className="tooltip -translate-y-full -translate-x-1/2 left-1/2 top-0 w-64 text-xs">
              Desktop app avoids browser limits and supports up to 12-hour offline exports
            </div>
          </div>
        )}

        <button
          onClick={handleShare}
          disabled={!isOnline}
          className="btn btn-primary btn-sm whitespace-nowrap flex-shrink-0"
          title={!isOnline ? 'Sharing is not available while offline' : 'Share your creation to inspire others'}
        >
          {!isOnline ? <WifiOff className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
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

      {showBackgroundPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a0b2e] rounded-lg border border-purple-500/20 p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-200">Choose Export Format</h3>
              <button
                onClick={() => setShowBackgroundPicker(false)}
                className="p-1 hover:bg-purple-500/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-purple-400" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowBackgroundPicker(false);
                  handleElectronExport();
                }}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
              >
                <Save className="h-5 w-5 text-purple-400" />
                <div className="text-left">
                  <div className="font-medium text-purple-200">WAV Audio</div>
                  <div className="text-sm text-purple-300/70">High-quality audio file</div>
                </div>
              </button>

              <div className="relative">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="py-4 text-center text-sm text-purple-300/70">or create video with background</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleBackgroundSelect('black')}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedBackground.type === 'black'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/20 hover:border-purple-500/50'
                  }`}
                >
                  <div className="w-full h-20 bg-black rounded mb-2" />
                  <div className="text-sm text-purple-200">Black Screen</div>
                </button>

                <button
                  onClick={() => handleBackgroundSelect('image')}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedBackground.type === 'image'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/20 hover:border-purple-500/50'
                  }`}
                >
                  {selectedBackground.type === 'image' && selectedBackground.preview ? (
                    <div 
                      className="w-full h-20 rounded mb-2 bg-cover bg-center"
                      style={{ backgroundImage: `url(${selectedBackground.preview})` }}
                    />
                  ) : (
                    <div className="w-full h-20 bg-purple-500/10 rounded mb-2 flex items-center justify-center">
                      <Image className="h-8 w-8 text-purple-400" />
                    </div>
                  )}
                  <div className="text-sm text-purple-200">Custom Image</div>
                </button>

                <button
                  onClick={() => handleBackgroundSelect('video')}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedBackground.type === 'video'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/20 hover:border-purple-500/50'
                  }`}
                >
                  {selectedBackground.type === 'video' && selectedBackground.preview ? (
                    <video 
                      src={selectedBackground.preview}
                      className="w-full h-20 rounded mb-2 object-cover"
                      autoPlay
                      muted
                      loop
                    />
                  ) : (
                    <div className="w-full h-20 bg-purple-500/10 rounded mb-2 flex items-center justify-center">
                      <Video className="h-8 w-8 text-purple-400" />
                    </div>
                  )}
                  <div className="text-sm text-purple-200">Custom Video</div>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={selectedBackground.type === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileSelect}
              />

              <button
                onClick={handleElectronExport}
                disabled={selectedBackground.type !== 'black' && !selectedBackground.file}
                className="w-full btn btn-primary py-2.5"
              >
                Export as MP4
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ActionButtons