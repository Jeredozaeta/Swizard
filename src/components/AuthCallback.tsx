import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Loader2, Sparkles } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Processing OAuth callback...');
        
        // Check if we have the necessary URL parameters for OAuth
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          toast.error(`Authentication failed: ${errorDescription || error}`, {
            icon: '❌',
            position: "top-center",
            autoClose: 4000
          });
          navigate('/auth');
          return;
        }

        // If no code, try to get existing session
        if (!code) {
          setStatus('Checking existing session...');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.log('No valid session found, redirecting to auth');
            navigate('/auth');
            return;
          }

          // Process existing session
          await processSession(session);
          return;
        }

        setStatus('Exchanging authorization code...');
        
        // Exchange the OAuth code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (exchangeError) {
          console.error('OAuth exchange error:', exchangeError);
          throw new Error('Failed to complete OAuth authentication');
        }

        if (!data.session || !data.user) {
          console.log('No session found after OAuth exchange');
          throw new Error('Authentication failed - no session created');
        }

        await processSession(data.session);
        
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        toast.error('Authentication failed. Please try again.', {
          icon: '❌',
          position: "top-center",
          autoClose: 4000
        });
        
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    const processSession = async (session: any) => {
      setStatus('Verifying email confirmation...');
      
      // Check if email is confirmed
      if (!session.user.email_confirmed_at) {
        console.log('Email not confirmed after OAuth, signing out user');
        
        // Sign out the user immediately
        await supabase.auth.signOut();
        
        // Show branded error message
        toast.error('Please confirm your email to continue. Check your inbox for a confirmation link.', {
          icon: '📧',
          position: "top-center",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            background: 'linear-gradient(135deg, #1a0b2e, #0f0720)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: '#e879f9'
          }
        });
        
        // Redirect to auth page
        navigate('/auth');
        return;
      }

      setStatus('Authentication successful!');
      
      // Email is confirmed, proceed with login
      toast.success('Welcome to Swizard!', {
        icon: '✨',
        position: "top-center",
        autoClose: 3000
      });

      // Check for redirect parameter or default to app
      const redirectTo = searchParams.get('redirect') || '/app';
      navigate(redirectTo);
    };

    // Add a small delay to ensure the URL parameters are properly parsed
    const timer = setTimeout(handleAuthCallback, 100);
    
    return () => clearTimeout(timer);
  }, [supabase, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-8 text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Swizard
            </h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          <h2 className="text-xl font-semibold text-purple-200">
            {loading ? 'Completing Sign In...' : 'Redirecting...'}
          </h2>
          <p className="text-purple-300/80 text-sm">
            {status}
          </p>
        </div>

        {!loading && (
          <div className="mt-6">
            <button
              onClick={() => navigate('/auth')}
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;