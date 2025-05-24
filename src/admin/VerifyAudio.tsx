import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { toast } from 'react-toastify';
import { Upload, X, FileAudio, Download, ArrowLeft, Shield } from 'lucide-react';
import { extractFingerprint } from '../audio/metadata';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface MatchResult {
  id: string;
  user_id: string;
  timestamp: string;
  version: string;
  metadata: any;
}

const VerifyAudio: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    setIsAdmin(role?.role === 'admin');
  };

  const assignAdminRole = async () => {
    if (!session?.user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-admin-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign admin role');
      }

      toast.success('Admin role assigned successfully!');
      await checkAdminRole(session.user.id);
    } catch (error: any) {
      console.error('Error assigning admin role:', error);
      toast.error(error.message || 'Failed to assign admin role');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setMatch(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/wav': ['.wav'],
      'audio/mp3': ['.mp3'],
    },
    maxFiles: 1,
  });

  const verifyAudio = async () => {
    if (!file || !isAdmin) return;

    setLoading(true);
    setMatch(null);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const fingerprint = extractFingerprint(audioBuffer);

      if (!fingerprint) {
        throw new Error('No fingerprint found in audio file');
      }

      const { data, error: dbError } = await supabase
        .from('audio_fingerprints')
        .select('*')
        .eq('signature', fingerprint.signature)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          setError('No matching fingerprint found in database');
        } else {
          throw dbError;
        }
      } else if (data) {
        setMatch(data as MatchResult);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify audio file');
      toast.error('Failed to verify audio file');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!match) return;

    const report = {
      verificationTime: new Date().toISOString(),
      fileName: file?.name,
      fileSize: file?.size,
      match: {
        id: match.id,
        userId: match.user_id,
        timestamp: match.timestamp,
        version: match.version,
        metadata: match.metadata
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#030014] text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to App
            </button>
          </div>
          <div className="bg-[#1a0b2e] rounded-lg border border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-purple-300">Admin Access</h2>
            </div>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              theme="dark"
              providers={[]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#030014] text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to App
            </button>
          </div>
          <div className="bg-[#1a0b2e] rounded-lg border border-purple-500/20 p-6 text-center">
            <Shield className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-purple-300 mb-4">Access Denied</h2>
            <p className="text-purple-200 mb-6">
              You need administrator privileges to access this area.
            </p>
            <button
              onClick={assignAdminRole}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Assigning...' : 'Assign Admin Role'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to App
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Audio Verification
          </h1>
        </div>

        <div className="space-y-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${isDragActive 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              {file ? (
                <>
                  <FileAudio className="h-12 w-12 text-purple-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-purple-200">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setMatch(null);
                        setError(null);
                      }}
                      className="p-1 hover:bg-purple-500/20 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4 text-purple-400" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-purple-400" />
                  <div className="text-purple-200">
                    <p className="font-medium">Drop audio file here or click to browse</p>
                    <p className="text-sm text-purple-300/70 mt-1">Supports WAV and MP3 formats</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={verifyAudio}
              disabled={!file || loading}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all duration-200
                ${file && !loading
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-purple-600/50 text-purple-200/50 cursor-not-allowed'
                }
              `}
            >
              {loading ? 'Verifying...' : 'Verify Audio'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {match && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-purple-300">Match Found</h2>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </button>
              </div>
              
              <div className="space-y-3 text-purple-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-purple-300/70">Fingerprint ID</p>
                    <p className="font-mono">{match.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-300/70">User ID</p>
                    <p className="font-mono">{match.user_id}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-purple-300/70">Timestamp</p>
                  <p>{new Date(match.timestamp).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-purple-300/70">Version</p>
                  <p>{match.version}</p>
                </div>

                {match.metadata && Object.keys(match.metadata).length > 0 && (
                  <div>
                    <p className="text-sm text-purple-300/70 mb-2">Additional Metadata</p>
                    <pre className="bg-purple-500/5 rounded p-3 text-sm overflow-auto">
                      {JSON.stringify(match.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyAudio;