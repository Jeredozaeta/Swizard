import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Success: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`
          },
          body: JSON.stringify({ sessionId })
        });

        if (!response.ok) {
          throw new Error('Failed to verify checkout session');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Invalid checkout session');
        }

        toast.success('Welcome to Pro! Your account has been upgraded.', {
          icon: '⭐'
        });
      } catch (error) {
        console.error('Checkout verification error:', error);
        toast.error('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId, navigate, supabase]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border border-purple-500/20 p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
        </div>
        
        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-purple-200 mb-8">
          Thank you for upgrading to Pro! Your account has been successfully upgraded and all Pro features are now unlocked.
        </p>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-lg font-medium text-white transition-all duration-200 hover:from-purple-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-purple-500/30"
        >
          Start Creating
          <ArrowRight className="h-4 w-4" />
        </button>

        {loading && (
          <div className="mt-4 text-sm text-purple-300/70">
            Verifying your subscription...
          </div>
        )}
      </div>
    </div>
  );
};

export default Success;