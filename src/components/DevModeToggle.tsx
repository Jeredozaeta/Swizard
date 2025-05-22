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
      className={`fixed bottom-4 left-4 p-2 rounded-full transition-all duration-200 ${
        isDevMode 
          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
          : 'bg-gray-800/80 text-gray-400 hover:bg-gray-800'
      }`}
      title="Toggle Developer Mode"
    >
      <Bug className="h-5 w-5" />
    </button>
  );
};

export default DevModeToggle;