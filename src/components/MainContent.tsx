import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { motion } from 'framer-motion';
import Header from './Header';
import FrequencyPanel from './FrequencyPanel';
import WaveformOutput from './WaveformOutput';
import AudioFXPanel from './AudioFXPanel';
import ActionButtons from './ActionButtons';
import Footer from './Footer';
import DevModePanel from './DevModePanel';
import DevModeToggle from './DevModeToggle';
import Pricing from './Pricing';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import DurationPanel from './DurationPanel';
import { Zap } from 'lucide-react';

const MainContent: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { loadPreset } = useAudio();
  const [isDevMode, setIsDevMode] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showWaveform, setShowWaveform] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const { supabase } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      setIsAdmin(role?.role === 'admin');
    };

    checkAdminRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const loadPresetData = async () => {
      const config = searchParams.get('config');
      if (config) {
        try {
          const success = await loadPreset(`config=${config}`);
          if (success) {
            toast.success('Preset loaded from shared link!', {
              icon: '🎵'
            });
          } else {
            toast.error('Failed to load shared preset');
          }
        } catch (error) {
          console.error('Error loading shared state:', error);
          toast.error('Failed to load shared preset');
        }
        return;
      }

      if (id) {
        try {
          const success = await loadPreset(id);
          if (success) {
            toast.success('Preset loaded successfully!', {
              icon: '🎵'
            });
          } else {
            toast.error('This preset has expired or was not found');
          }
        } catch (error) {
          console.error('Error loading preset:', error);
          toast.error('Failed to load preset');
        }
      }
    };

    loadPresetData();
  }, [id, searchParams, loadPreset]);

  return (
    <div className={`min-h-screen text-white ${
      performanceMode ? 'bg-[#030014]' : 'bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720]'
    }`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Header />
        <main>
          <div className="rounded-xl bg-[#1a0b2e] p-6 shadow-lg">
            {showPricing ? (
              <Pricing onClose={() => setShowPricing(false)} />
            ) : (
              <>
                <FrequencyPanel />
                {showWaveform && <WaveformOutput performanceMode={performanceMode} />}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={() => setShowWaveform(!showWaveform)}
                    className="btn btn-secondary btn-sm"
                  >
                    {showWaveform ? 'Hide Waveform' : 'Show Waveform'}
                  </button>
                  <div className="has-tooltip">
                    <button
                      onClick={() => setPerformanceMode(!performanceMode)}
                      className={`btn btn-sm ${
                        performanceMode
                          ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                          : 'btn-secondary'
                      }`}
                    >
                      <Zap className="h-4 w-4" />
                      {performanceMode ? 'Disable Performance Mode' : 'Enable Performance Mode'}
                    </button>
                    <div className="tooltip -translate-y-full -translate-x-1/2 left-1/2 top-0 w-64 text-xs">
                      Use this if the app feels slow or laggy — it'll speed things up by simplifying visual effects.
                    </div>
                  </div>
                </div>
                <AudioFXPanel />
                <DurationPanel 
                  selectedDuration={selectedDuration} 
                  onDurationChange={setSelectedDuration} 
                />
                <ActionButtons 
                  onShowPricing={() => setShowPricing(true)} 
                  selectedDuration={selectedDuration}
                />
              </>
            )}
          </div>
          
          <Footer />
        </main>
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
      {isAdmin && (
        <>
          <DevModeToggle isDevMode={isDevMode} onToggle={() => setIsDevMode(!isDevMode)} />
          {isDevMode && (
            <DevModePanel 
              onShowEmailPanel={() => {}}
              onShowEmailChecklist={() => {}}
              onShowVerifyAudio={() => {}}
              showWaveform={showWaveform}
              onToggleWaveform={() => setShowWaveform(!showWaveform)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MainContent;