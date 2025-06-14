import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password' | 'check_email';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { supabase, user, sendConfirmationAgain } = useAuth();
  const [view, setView] = useState<AuthView>('sign_in');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check email confirmation
        if (!session.user.email_confirmed_at) {
          console.log('User signed in but email not confirmed, signing out');
          
          // Show resend link for unconfirmed emails
          setShowResendLink(true);
          
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
          
          return; // Don't proceed with navigation
        }

        // Email is confirmed, proceed normally
        toast.success('Welcome to Swizard!', {
          icon: '✨'
        });
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleResendConfirmation = async () => {
    if (!formData.email || resendingConfirmation) return;
    
    setResendingConfirmation(true);
    try {
      await sendConfirmationAgain(formData.email.trim());
    } catch (error) {
      console.error('Error resending confirmation:', error);
    } finally {
      setResendingConfirmation(false);
    }
  };

  // SIGN IN - Only called from Sign In form
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (view !== 'sign_in') return; // Guard clause
    if (loading) return; // Prevent double submission
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setShowResendLink(false); // Reset resend link visibility
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and confirm your account');
          setShowResendLink(true);
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        // Check email confirmation immediately after successful sign-in
        if (!data.user.email_confirmed_at) {
          console.log('Sign-in successful but email not confirmed, signing out');
          
          // Show resend link
          setShowResendLink(true);
          
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
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SIGN UP - Only called from Sign Up form
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (view !== 'sign_up') return; // Guard clause
    if (loading) return; // Prevent double submission
    
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        setView('check_email');
        toast.success('Check your email for a confirmation link!');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD - Only called from Forgot Password form
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (view !== 'forgot_password') return; // Guard clause
    if (loading) return; // Prevent double submission
    
    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`
      });

      if (error) {
        toast.error(error.message);
      } else {
        setView('check_email');
        toast.success('Password reset email sent!');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE SIGN IN - Separate method, not tied to forms
  const handleGoogleSignIn = async () => {
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error(error.message);
      }
      // Note: OAuth flow will handle the redirect and email confirmation check
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // VIEW SWITCHING - Only changes UI state
  const switchView = (newView: AuthView) => {
    if (loading) return; // Don't switch views while loading
    setView(newView);
    setShowResendLink(false); // Hide resend link when switching views
    // Clear form when switching views
    setFormData({
      email: formData.email, // Keep email when switching
      password: '',
      confirmPassword: '',
      fullName: ''
    });
  };

  const renderSignInForm = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full pl-10 pr-12 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter your password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Resend Confirmation Link */}
      {showResendLink && formData.email && (
        <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-300 mb-2">
            Email not confirmed yet?
          </p>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendingConfirmation || loading}
            className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3 w-3 ${resendingConfirmation ? 'animate-spin' : ''}`} />
            {resendingConfirmation ? 'Sending...' : 'Resend confirmation email'}
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => switchView('forgot_password')}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          disabled={loading}
        >
          Forgot your password?
        </button>
      </div>
    </form>
  );

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter your full name"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full pl-10 pr-12 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Create a password (min 6 characters)"
            required
            minLength={6}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Confirm your password"
            required
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full pl-10 pr-4 py-3 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? 'Sending...' : 'Send Reset Email'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => switchView('sign_in')}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          disabled={loading}
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );

  const renderCheckEmailView = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-purple-200">Check Your Email</h3>
      <p className="text-purple-300/80">
        We've sent you a link to {view === 'check_email' && formData.email ? 'reset your password' : 'confirm your account'}. 
        Please check your email and follow the instructions.
      </p>
      <button
        onClick={() => switchView('sign_in')}
        className="text-purple-400 hover:text-purple-300 transition-colors"
        disabled={loading}
      >
        Back to Sign In
      </button>
    </div>
  );

  const getTitle = () => {
    switch (view) {
      case 'sign_up': return 'Create Your Account';
      case 'forgot_password': return 'Reset Password';
      case 'check_email': return 'Email Sent';
      default: return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'sign_up': return 'Join Swizard and unlock your creative potential';
      case 'forgot_password': return 'Enter your email to reset your password';
      case 'check_email': return '';
      default: return 'Sign in to access your Pro features and saved creations';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </button>
        </div>

        <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Swizard
              </h1>
            </div>
            <h2 className="text-xl font-semibold text-purple-200 mb-2">
              {getTitle()}
            </h2>
            {getSubtitle() && (
              <p className="text-purple-300/80 text-sm">
                {getSubtitle()}
              </p>
            )}
          </div>

          {/* Forms */}
          {view === 'sign_in' && renderSignInForm()}
          {view === 'sign_up' && renderSignUpForm()}
          {view === 'forgot_password' && renderForgotPasswordForm()}
          {view === 'check_email' && renderCheckEmailView()}

          {/* Google Sign In - Only show for sign in/up */}
          {(view === 'sign_in' || view === 'sign_up') && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-500/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1a0b2e]/50 text-purple-300">or</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Switch between sign in/up */}
          {(view === 'sign_in' || view === 'sign_up') && (
            <div className="mt-6 text-center">
              <p className="text-purple-300/80 text-sm">
                {view === 'sign_in' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => switchView(view === 'sign_in' ? 'sign_up' : 'sign_in')}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  disabled={loading}
                >
                  {view === 'sign_in' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-purple-400/60">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;