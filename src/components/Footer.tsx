import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Lock, AlertTriangle } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-8 border-t border-purple-500/20 pt-8 pb-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-purple-300">
            <Shield className="h-4 w-4" />
            <span>Enterprise-Grade Security</span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm">
            <Link
              to="/terms"
              className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1.5"
            >
              <Lock className="h-4 w-4" />
              Privacy Policy
            </Link>
            <Link
              to="/licensing"
              className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Licensing
            </Link>
          </nav>
        </div>
        
        <div className="text-center text-sm text-purple-300/70">
          <p className="mb-4">
            © {currentYear} Swizard. All rights reserved.
          </p>
          <div className="flex items-start gap-2 justify-center text-xs">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="text-left">
              Disclaimer: This tool is for experimental and entertainment purposes only. 
              Results may vary and no medical claims are made. Always consult healthcare 
              professionals for medical advice. Use at your own risk and start with low 
              volumes.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;