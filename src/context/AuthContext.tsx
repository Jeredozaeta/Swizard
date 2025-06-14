import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { toast } from 'react-toastify';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AuthContextType {
  supabase: typeof supabase;
  user: User | null;
  isAdmin: boolean;
  adminOverride: boolean;
  hasUnlimitedAccess: boolean;
  toggleAdminOverride: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    return role?.role === 'admin';
  };

  const checkEmailConfirmation = async (currentUser: User) => {
    // Check if email is confirmed
    if (!currentUser.email_confirmed_at) {
      console.log('Email not confirmed, signing out user');
      
      // Sign out immediately
      await supabase.auth.signOut();
      
      // Show branded error message
      toast.error('Your email isn\'t confirmed yet – check your inbox.', {
        icon: '📧',
        position: "top-center",
        autoClose: 6000,
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
      
      return false; // Email not confirmed
    }
    
    return true; // Email confirmed
  };

  const toggleAdminOverride = async () => {
    if (!user) return;

    try {
      const newOverrideValue = !adminOverride;
      
      const { error } = await supabase.auth.updateUser({
        data: {
          adminOverride: newOverrideValue
        }
      });

      if (error) {
        console.error('Error updating admin override:', error);
        throw error;
      }

      // The onAuthStateChange listener will handle updating the state
    } catch (error) {
      console.error('Failed to toggle admin override:', error);
      throw error;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      
      if (currentUser) {
        // Check email confirmation for sign-in events
        if (event === 'SIGNED_IN') {
          const isConfirmed = await checkEmailConfirmation(currentUser);
          if (!isConfirmed) {
            // User was signed out due to unconfirmed email
            setUser(null);
            setIsAdmin(false);
            setAdminOverride(false);
            setHasUnlimitedAccess(false);
            return;
          }
        }

        // Check admin role from database
        const adminRole = await checkAdminRole(currentUser.id);
        setIsAdmin(adminRole);

        // Get admin override from user metadata
        const override = currentUser.user_metadata?.adminOverride === true;
        setAdminOverride(override);

        // Calculate unlimited access
        const unlimited = adminRole || override;
        setHasUnlimitedAccess(unlimited);

        // Set user after all checks pass
        setUser(currentUser);

        // Send welcome email for new signups
        if (event === 'SIGNED_UP') {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                type: 'welcome',
                email: session?.user?.email,
                data: {
                  name: session?.user?.user_metadata?.full_name || 'User'
                }
              })
            });
          } catch (error) {
            console.error('Failed to send welcome email:', error);
          }
        }

        // Send email verification prompt for unconfirmed emails
        if (event === 'SIGNED_UP' && !currentUser.email_confirmed_at) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                type: 'verify_prompt',
                email: session?.user?.email,
                data: {
                  name: session?.user?.user_metadata?.full_name || 'User'
                }
              })
            });
          } catch (error) {
            console.error('Failed to send verification prompt email:', error);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminOverride(false);
        setHasUnlimitedAccess(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      supabase, 
      user, 
      isAdmin, 
      adminOverride, 
      hasUnlimitedAccess, 
      toggleAdminOverride 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};