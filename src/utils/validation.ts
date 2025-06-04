// Input validation and sanitization utilities
import DOMPurify from 'dompurify';

// Validate and sanitize preset names
export const sanitizePresetName = (name: string): string => {
  if (!name) throw new Error('Preset name is required');
  
  // Remove HTML and potentially dangerous characters
  const cleaned = DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [] // Strip all attributes
  });
  
  // Additional sanitization
  const sanitized = cleaned
    .trim()
    .replace(/[<>{}[\]\\\/]/g, '') // Remove special characters
    .slice(0, 100); // Enforce length limit
    
  if (!sanitized) {
    throw new Error('Invalid preset name');
  }
  
  return sanitized;
};

// Validate frequency input
export const validateFrequency = (freq: number): number => {
  if (typeof freq !== 'number' || isNaN(freq)) {
    throw new Error('Invalid frequency value');
  }
  
  // Enforce frequency limits
  return Math.min(Math.max(0, freq), 20000);
};

// Validate duration input
export const validateDuration = (duration: number): number => {
  if (typeof duration !== 'number' || isNaN(duration)) {
    throw new Error('Invalid duration');
  }
  
  // Enforce duration limits (30 seconds to 12 hours)
  return Math.min(Math.max(30, duration), 43200);
};

// Validate effect values
export const validateEffectValue = (value: number, min: number, max: number): number => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Invalid effect value');
  }
  
  return Math.min(Math.max(min, value), max);
};