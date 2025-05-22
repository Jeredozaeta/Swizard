import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Shield } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: role } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (role?.role === 'admin') {
            toast.success('Welcome back, admin!');
            navigate('/');
          } else {
            await supabase.auth.signOut();
            toast.error('Access denied. Admin privileges required.');
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
          await supabase.auth.signOut();
          toast.error('Failed to verify admin access');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a0b2e]/50 backdrop-blur-sm rounded-lg border border-purple-500/20 p-8">
        <div className="flex items-center justify-center mb-6">
          <Shield className="h-12 w-12 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-6">
          Admin Access
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
};

export default AdminLogin;