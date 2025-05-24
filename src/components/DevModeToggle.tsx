import React from 'react';
import { Bug } from 'lucide-react';

interface DevModeToggleProps {
  isDevMode: boolean;
  onToggle: () => void;
}

const DevModeToggle: React.FC<DevModeToggleProps> = ({ isDevMode, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 left-4 p-3 rounded-full transition-all duration-300 group ${
        isDevMode 
          ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20' 
          : 'bg-[#1a0b2e]/80 text-purple-400 hover:text-purple-300 hover:bg-[#1a0b2e]'
      }`}
      title="Toggle Developer Mode"
    >
      <Bug className="h-5 w-5 group-hover:scale-110 transition-transform" />
    </button>
  );
};

export default DevModeToggle;