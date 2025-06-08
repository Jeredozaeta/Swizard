import React, { useState, useEffect } from 'react';
import { Clock, Lock } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

interface DurationPanelProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
}

const DurationPanel: React.FC<DurationPanelProps> = ({ selectedDuration, onDurationChange }) => {
  const [timeInput, setTimeInput] = useState('00:00:30');
  const { state } = useAudio();
  
  // Free tier: duration is locked to 30 seconds
  const isDurationLocked = selectedDuration > 30;
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      remainingSeconds.toString().padStart(2, '0')
    ].join(':');
  };

  const parseTimeToSeconds = (timeStr: string) => {
    // Remove any non-digit characters except colons
    const cleanStr = timeStr.replace(/[^\d:]/g, '');
    const parts = cleanStr.split(':');
    
    // Handle different input formats
    let hours = 0, minutes = 0, seconds = 0;
    
    if (parts.length === 3) {
      [hours, minutes, seconds] = parts.map(Number);
    } else if (parts.length === 2) {
      [minutes, seconds] = parts.map(Number);
    } else if (parts.length === 1) {
      seconds = Number(parts[0]);
    }
    
    // Validate each part
    hours = isNaN(hours) ? 0 : Math.min(hours, 12);
    minutes = isNaN(minutes) ? 0 : Math.min(minutes, 59);
    seconds = isNaN(seconds) ? 0 : Math.min(seconds, 59);
    
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    // For free users, cap at 30 seconds
    const maxDuration = 30; // Free tier limit
    return Math.min(Math.max(30, totalSeconds), maxDuration);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Allow typing numbers and colons
    if (!/^[\d:]*$/.test(value)) return;
    
    // Auto-add colons as needed
    if (value.length === 2 || value.length === 5) {
      if (!value.endsWith(':')) {
        value += ':';
      }
    }
    
    // Prevent more than 2 colons
    const colonCount = (value.match(/:/g) || []).length;
    if (colonCount > 2) return;
    
    // Maximum length check (HH:MM:SS = 8 chars)
    if (value.length > 8) return;
    
    setTimeInput(value);
  };

  const handleTimeInputBlur = () => {
    const seconds = parseTimeToSeconds(timeInput);
    onDurationChange(seconds);
    setTimeInput(formatDuration(seconds));
  };

  useEffect(() => {
    setTimeInput(formatDuration(selectedDuration));
  }, [selectedDuration]);

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <div className={`flex items-center gap-2 bg-[#1a0b2e] rounded-lg border border-purple-500/20 px-3 py-1.5 relative ${
        isDurationLocked ? 'locked' : ''
      }`}>
        <Clock className="h-4 w-4 text-purple-400" />
        <input
          type="text"
          value={timeInput}
          onChange={handleTimeInputChange}
          onBlur={handleTimeInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="HH:MM:SS"
          className="w-20 bg-transparent text-center font-mono text-sm focus:outline-none text-purple-200 placeholder-purple-400/50"
          title="Free users limited to 30 seconds"
          maxLength={8}
          aria-label="Duration input"
          disabled={isDurationLocked}
        />
        {isDurationLocked && <div className="blur-mask" />}
      </div>
      <div className="text-xs text-purple-400/70">
        Free: 30s max • <span className="text-purple-300 cursor-pointer hover:underline">Upgrade for unlimited</span>
      </div>
    </div>
  );
};

export default DurationPanel;