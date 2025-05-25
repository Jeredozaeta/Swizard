import React, { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const LegalDisclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 mb-3 animate-slideDown"
      style={{
        animation: 'slideDown 0.5s ease-out'
      }}
    >
      <div className="bg-[rgba(20,0,40,0.9)] p-4 sm:p-4 relative">
        <div className="flex items-start gap-3 max-w-7xl mx-auto">
          <AlertTriangle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white mb-2">
              <strong>Important Safety Notice:</strong> This application generates audio frequencies 
              that may affect neural activity. Start at low volumes and discontinue use if you 
              experience any discomfort. Do not use while operating machinery or if you have a 
              history of seizures or other neurological conditions.
            </p>
            <div className="text-xs text-white/90 space-y-1">
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
                <Link to="/terms" className="text-white underline inline-flex items-center gap-0.5 hover:text-white/90">
                  Terms of Service <ExternalLink className="h-3 w-3" />
                </Link>
                {' '}for full details.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            style={{ minWidth: '28px', minHeight: '28px' }}
            title="Dismiss"
          >
            <X className="h-7 w-7 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDisclaimer;