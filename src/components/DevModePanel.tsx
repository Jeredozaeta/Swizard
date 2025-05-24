import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { Settings, Clock, Activity, Mail, CheckSquare, Waves, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'react-toastify';

interface DevModePanelProps {
  onShowEmailPanel: () => void;
  onShowEmailChecklist: () => void;
  onShowVerifyAudio: () => void;
  showWaveform: boolean;
  onToggleWaveform: () => void;
}

const DevModePanel: React.FC<DevModePanelProps> = ({ 
  onShowEmailPanel, 
  onShowEmailChecklist, 
  onShowVerifyAudio,
  showWaveform,
  onToggleWaveform
}) => {
  const { state, audioContext } = useAudio();
  const [sessionTime, setSessionTime] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'text-green-400';
      case 'suspended':
        return 'text-yellow-400';
      case 'closed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleDeploy = async () => {
    if (isDeploying) return;
    
    setIsDeploying(true);
    const deployToast = toast.loading('Starting deployment...');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'netlify',
          build: {
            command: 'npm run build',
            output: 'dist'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const data = await response.json();
      
      toast.update(deployToast, {
        render: 'Deployment started! Waiting for site to go live...',
        type: 'info',
        isLoading: true
      });

      // Poll deployment status
      const checkStatus = async () => {
        const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-status`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check deployment status');
        }

        const statusData = await statusResponse.json();

        if (statusData.state === 'ready') {
          toast.update(deployToast, {
            render: `Site deployed successfully! ${statusData.claimed ? 'New site URL:' : 'Live at:'} ${statusData.url}`,
            type: 'success',
            isLoading: false,
            autoClose: 5000
          });
          
          if (statusData.claim_url) {
            toast.info(
              'Click here to claim this site on your Netlify account',
              {
                onClick: () => window.open(statusData.claim_url, '_blank'),
                autoClose: 10000
              }
            );
          }
          
          return true;
        }
        
        return false;
      };

      // Poll every 5 seconds until deployment is complete
      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await checkStatus();
          if (isComplete) {
            clearInterval(pollInterval);
            setIsDeploying(false);
          }
        } catch (error) {
          clearInterval(pollInterval);
          throw error;
        }
      }, 5000);

    } catch (error) {
      console.error('Deployment error:', error);
      toast.update(deployToast, {
        render: 'Deployment failed. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900/95 rounded-lg border border-purple-500/30 shadow-xl text-sm max-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-purple-400" />
          <h3 className="font-medium text-purple-300">Developer Mode</h3>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-purple-400/70" />
          <span className="text-xs font-mono text-purple-400/70">{formatTime(sessionTime)}</span>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[calc(100vh-8rem)] p-3 space-y-3 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/30">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 bg-indigo-950/50 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-300/70">Audio Context:</span>
              <div className="flex items-center gap-2">
                <Waves className={`h-4 w-4 ${getContextStateColor(audioContext?.state || 'closed')}`} />
                <span className={`font-mono ${getContextStateColor(audioContext?.state || 'closed')}`}>
                  {audioContext?.state || 'Not initialized'} ({audioContext?.sampleRate || 0}Hz)
                </span>
              </div>
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <button
              onClick={onToggleWaveform}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              {showWaveform ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Waveform
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Waveform
                </>
              )}
            </button>

            <button
              onClick={onShowEmailPanel}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email Test Panel
            </button>
            
            <button
              onClick={onShowEmailChecklist}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              Email Checklist
            </button>

            <button
              onClick={onShowVerifyAudio}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/20 rounded text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              <Waves className="h-4 w-4" />
              Verify Audio
            </button>

            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-purple-300 transition-colors ${
                isDeploying 
                  ? 'bg-purple-500/10 cursor-not-allowed' 
                  : 'bg-purple-500/20 hover:bg-purple-500/30'
              }`}
            >
              <Upload className={`h-4 w-4 ${isDeploying ? 'animate-spin' : ''}`} />
              {isDeploying ? 'Deploying...' : 'Deploy to Live'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevModePanel;