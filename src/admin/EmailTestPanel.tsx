import React, { useState } from 'react';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface EmailTestPanelProps {
  onExit: () => void;
}

const EmailTestPanel: React.FC<EmailTestPanelProps> = ({ onExit }) => {
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const { supabase } = useAuth();

  const handleSendTest = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting email test process...');
      console.log('Current environment:', import.meta.env.MODE);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      let authToken;
      
      if (import.meta.env.MODE === 'development') {
        console.log('Using development mode bypass');
        authToken = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      } else {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Auth session:', {
          exists: !!session,
          error: sessionError?.message
        });
        
        if (!session?.access_token) {
          throw new Error('No valid auth session');
        }
        authToken = session.access_token;
      }

      console.log('Auth token details:', {
        exists: !!authToken,
        length: authToken?.length,
        prefix: authToken?.substring(0, 10) + '***'
      });

      const requestUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      console.log('Request URL:', requestUrl);

      const requestBody = {
        type: template,
        email,
        data: {
          name: 'Test User',
          plan: 'Pro Monthly',
          amount: '$22.00'
        }
      };
      console.log('Request payload:', requestBody);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };
      console.log('Request headers:', {
        contentType: headers['Content-Type'],
        hasAuth: !!headers['Authorization'],
        authPrefix: headers['Authorization']?.substring(0, 7)
      });

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      console.log('Response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to send test email');
      }

      toast.success(`✅ Test email sent to ${email}`, {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } catch (error: any) {
      console.error('Email test error:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        env: import.meta.env.MODE,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL
      });
      
      toast.error('❌ Failed to send test email', {
        position: "bottom-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } finally {
      setLoading(false);
    }
  };

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
            Email Test Panel
          </h1>
        </div>

        <div className="bg-[#1a0b2e] rounded-lg border border-purple-500/20 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Mail className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-purple-300">
              Test Email Templates
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">
                Test Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter recipient email"
                className="w-full bg-[#1a0b2e] border border-purple-500/20 rounded-lg px-4 py-2 text-purple-200 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-300 mb-1">
                Email Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full bg-[#1a0b2e] border border-purple-500/20 rounded-lg px-4 py-2 text-purple-200 focus:outline-none focus:border-purple-500/50"
              >
                <option value="welcome">Welcome Email</option>
                <option value="verify_prompt">Verify Email Prompt</option>
                <option value="verify_success">Email Verified Success</option>
                <option value="verify_reminder">Verification Reminder</option>
                <option value="reset_password">Password Reset</option>
                <option value="pro_payment">Pro Payment Thank You</option>
                <option value="payment_failed">Payment Failed Alert</option>
                <option value="sub_renewed">Subscription Renewed</option>
                <option value="sub_canceled">Subscription Canceled</option>
              </select>
            </div>

            <button
              onClick={handleSendTest}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestPanel;