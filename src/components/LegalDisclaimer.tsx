import React, { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const LegalDisclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-900/30 border border-purple-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-purple-200 mb-2">
            <strong>Important Safety Notice:</strong> This application generates audio frequencies 
            that may affect neural activity. Start at low volumes and discontinue use if you 
            experience any discomfort. Do not use while operating machinery or if you have a 
            history of seizures or other neurological conditions.
          </p>
          <div className="text-xs text-purple-300/70 space-y-1">
            <p>
              By using Swizard, you acknowledge that:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>This tool is for experimental and entertainment purposes only</li>
              <li>No medical claims are made or implied</li>
              <li>Results may vary between individuals</li>
              <li>You should consult healthcare professionals for medical advice</li>
            </ul>
            <p className="mt-2">
              Read our{' '}
              <Link to="/terms" className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-0.5">
                Terms of Service <ExternalLink className="h-3 w-3" />
              </Link>
              {' '}for full details.
            </p>
          </div>
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