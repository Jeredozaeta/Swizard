import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </button>
        </div>

        <div className="bg-[#1a0b2e]/50 rounded-lg border border-purple-500/20 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
              Welcome to Swizard
            </h1>
            <p className="text-purple-200/80">
              Sign in to unlock Pro features and save your creations
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                anchor: {
                  color: '#a855f7',
                  textDecoration: 'none',
                },
                message: {
                  color: '#f87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                },
                input: {
                  backgroundColor: 'rgba(26, 11, 46, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  padding: '10px 12px',
                },
                label: {
                  color: '#c4b5fd',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              }
            }}
            theme="dark"
            providers={['google']}
            redirectTo={window.location.origin}
            showLinks={true}
            view="sign_in"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;