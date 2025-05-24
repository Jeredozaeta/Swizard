import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const LegalDisclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-900/30 border border-purple-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-purple-200 mb-2">
            <strong>Health & Safety Notice:</strong> This application generates audio frequencies that may affect neural activity. 
            Do not use while operating machinery or if you have a history of seizures. 
            Consult your healthcare provider before use if you have any medical conditions.
          </p>
          <p className="text-xs text-purple-300/70">
            By using Swizard, you acknowledge that you have read and agree to our Terms of Service, 
            Privacy Policy, and Licensing terms. We make no medical claims and assume no liability 
            for the use or misuse of this tool.
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-purple-500/20 rounded-full transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4 text-purple-400" />
        </button>
      </div>
    </div>
  );
};

export default LegalDisclaimer;