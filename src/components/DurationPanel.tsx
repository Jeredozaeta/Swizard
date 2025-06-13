import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';

interface DurationPanelProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
}

const DurationPanel: React.FC<DurationPanelProps> = ({ selectedDuration, onDurationChange }) => {
  const [timeInput, setTimeInput] = useState('00:00:30');
  const { state } = useAudio();
  const { hasUnlimitedAccess } = useAuth();
  
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
    hours = isNaN(hours) ? 0 : hours;
    minutes = isNaN(minutes) ? 0 : Math.min(minutes, 59);
    seconds = isNaN(seconds) ? 0 : Math.min(seconds, 59);
    
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    // Apply limits based on user access level
    if (hasUnlimitedAccess) {
      // No upper limit for unlimited access users, but still enforce minimum
      return Math.max(30, totalSeconds);
    } else {
      // Standard limits: between 30s and 12h
      return Math.min(Math.max(30, totalSeconds), 43200);
    }
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
      <div className="flex items-center gap-2 bg-[#1a0b2e] rounded-lg border border-purple-500/20 px-3 py-1.5">
        <Clock className="h-4 w-4 text-purple-400" />
        <input
          type="text"
          value={timeInput}
          onChange={handleTimeInputChange}
          onBlur={handleTimeInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="HH:MM:SS"
          className="w-20 bg-transparent text-center font-mono text-sm focus:outline-none text-purple-200 placeholder-purple-400/50"
          title={hasUnlimitedAccess 
            ? "Enter duration (minimum 30s, no maximum limit)" 
            : "Enter duration (minimum 30s, maximum 12h)"
          }
          maxLength={8}
          aria-label="Duration input"
        />
      </div>
      {hasUnlimitedAccess && (
        <div className="text-xs text-green-400 font-medium">
          ∞ Unlimited Duration
        </div>
      )}
    </div>
  );
};

export default DurationPanel;