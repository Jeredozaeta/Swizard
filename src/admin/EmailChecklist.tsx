import React, { useState } from 'react';
import { ArrowLeft, Mail, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface EmailChecklistProps {
  onExit: () => void;
}

const EmailChecklist: React.FC<EmailChecklistProps> = ({ onExit }) => {
  const [testEmail, setTestEmail] = useState('');
  const [checklist, setChecklist] = useState([
    { id: 'pro_payment', name: 'Pro Payment Thank You', checked: false, comment: '' },
    { id: 'welcome', name: 'Welcome Post Signup', checked: false, comment: '' },
    { id: 'verify_prompt', name: 'Verify Email Prompt', checked: false, comment: '' },
    { id: 'verify_success', name: 'Email Verified Success', checked: false, comment: '' },
    { id: 'verify_reminder', name: 'Email Verification Reminder', checked: false, comment: '' },
    { id: 'reset_password', name: 'Password Reset Request', checked: false, comment: '' },
    { id: 'payment_failed', name: 'Payment Failed Alert', checked: false, comment: '' },
    { id: 'sub_renewed', name: 'Subscription Renewed Notice', checked: false, comment: '' },
    { id: 'sub_canceled', name: 'Subscription Canceled Notice', checked: false, comment: '' }
  ]);

  const handleSendTest = async (templateId: string) => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: templateId,
          email: testEmail,
          data: {
            name: 'Test User',
            plan: 'Pro Monthly',
            amount: '$22.00'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      toast.success(`✅ Test email sent to ${testEmail}`, {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('❌ Failed to send test email', {
        position: "bottom-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    }
  };

  const handleCheck = (id: string, checked: boolean) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked } : item
    ));
  };

  const handleComment = (id: string, comment: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, comment } : item
    ));
  };

  const getProgress = () => {
    const checked = checklist.filter(item => item.checked).length;
    return Math.round((checked / checklist.length) * 100);
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
            Email Template Checklist
          </h1>
        </div>

        <div className="bg-[#1a0b2e] rounded-lg border border-purple-500/20 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 bg-[#1a0b2e] border border-purple-500/20 rounded-lg px-4 py-2 text-purple-200 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50"
            />
            <div className="text-sm text-purple-300">
              Progress: {getProgress()}%
            </div>
          </div>

          <div className="space-y-4">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="bg-[#1a0b2e]/30 rounded-lg border border-purple-500/10 p-4 transition-all duration-200 hover:border-purple-500/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCheck(item.id, !item.checked)}
                      className={`p-1 rounded transition-colors ${
                        item.checked 
                          ? 'text-green-400 hover:text-green-300' 
                          : 'text-purple-400/50 hover:text-purple-400'
                      }`}
                    >
                      {item.checked ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </button>
                    <span className="text-purple-200">{item.name}</span>
                  </div>
                  <button
                    onClick={() => handleSendTest(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-sm text-purple-300 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send Test
                  </button>
                </div>
                <input
                  type="text"
                  value={item.comment}
                  onChange={(e) => handleComment(item.id, e.target.value)}
                  placeholder="Add notes or comments..."
                  className="w-full bg-[#1a0b2e]/50 border border-purple-500/10 rounded px-3 py-1.5 text-sm text-purple-200 placeholder-purple-400/30 focus:outline-none focus:border-purple-500/30"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailChecklist;