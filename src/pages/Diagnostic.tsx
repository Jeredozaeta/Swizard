import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Cpu, Waves, Database, Shield, AlertTriangle, Zap, Brain } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import FPSCounter from '../components/FPSCounter';
import { getAnalyticsStatus } from '../utils/analytics';

const Diagnostic: React.FC = () => {
  const { state, audioContext } = useAudio();
  const { supabase } = useAuth();
  const [performanceMode, setPerformanceMode] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [analyticsStatus, setAnalyticsStatus] = useState(getAnalyticsStatus());

  useEffect(() => {
    const loadSubscriptionData = async () => {
      const { data } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .single();
      setSubscription(data);
    };

    const checkTwoFactor = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.factors) {
        setTwoFactorEnabled(Object.keys(user.factors).length > 0);
      }
    };

    // Update analytics status periodically
    const analyticsInterval = setInterval(() => {
      setAnalyticsStatus(getAnalyticsStatus());
    }, 5000);

    loadSubscriptionData();
    checkTwoFactor();

    return () => {
      clearInterval(analyticsInterval);
    };
  }, [supabase]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to App
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium border border-red-500/30">
              DEV MODE – Not visible to end users
            </span>
            <FPSCounter className="bg-[#1a0b2e]/50 px-3 py-1 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Audio Engine Status */}
          <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Waves className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-purple-300">Audio Engine Status</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Context State:</span>
                <span className={`font-mono ${getContextStateColor(audioContext?.state || 'closed')}`}>
                  {audioContext?.state || 'Not initialized'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Sample Rate:</span>
                <span className="font-mono text-purple-200">
                  {audioContext?.sampleRate || 0} Hz
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Active Channels:</span>
                <span className="font-mono text-purple-200">
                  {state.channels.filter(c => c.enabled).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Active Effects:</span>
                <span className="font-mono text-purple-200">
                  {Object.values(state.effects).filter(e => e.enabled).length}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-purple-300">Performance Settings</h2>
              </div>
              <button
                onClick={() => setPerformanceMode(!performanceMode)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  performanceMode
                    ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                    : 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
                }`}
              >
                <Zap className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Performance Mode:</span>
                <span className={`font-mono ${performanceMode ? 'text-amber-300' : 'text-purple-200'}`}>
                  {performanceMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Target FPS:</span>
                <span className="font-mono text-purple-200">
                  {performanceMode ? '30' : '60'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Visual Effects:</span>
                <span className="font-mono text-purple-200">
                  {performanceMode ? 'Minimal' : 'Full'}
                </span>
              </div>
            </div>
          </div>

          {/* Session State */}
          <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-purple-300">Session State</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Active Plan:</span>
                <span className="font-mono text-purple-200">
                  {subscription?.status === 'active' ? 'Pro' : 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">2FA Status:</span>
                <span className={`font-mono ${twoFactorEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-200/70">Subscription Status:</span>
                <span className={`font-mono ${subscription?.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {subscription?.status || 'none'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Log */}
          <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-purple-300">Error Log</h2>
            </div>
            <div className="space-y-2">
              {errors.length === 0 ? (
                <p className="text-purple-200/70 text-sm">No errors logged</p>
              ) : (
                errors.map((error, index) => (
                  <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-2 text-sm text-red-300">
                    {error}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Analytics Status */}
          <div className="col-span-full bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-purple-300">Analytics Status</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-purple-300">Sentry</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyticsStatus.sentry.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-purple-200/70">
                      {analyticsStatus.sentry.enabled ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                  {analyticsStatus.sentry.enabled && (
                    <div className="text-xs text-purple-200/50 font-mono">
                      Last Event: {analyticsStatus.sentry.lastEventId || 'None'}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-purple-300">PostHog</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyticsStatus.posthog.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-purple-200/70">
                      {analyticsStatus.posthog.enabled ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                  {analyticsStatus.posthog.enabled && (
                    <>
                      <div className="text-xs text-purple-200/50 font-mono">
                        Session: {analyticsStatus.posthog.sessionId}
                      </div>
                      <div className="text-xs text-purple-200/50 font-mono">
                        User: {analyticsStatus.posthog.distinctId}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Diagnostic;