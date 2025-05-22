// Base64 encoding/decoding utilities
export const encodeBase64 = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str));
  } catch (e) {
    console.warn('Failed to encode string:', e);
    return '';
  }
};

export const decodeBase64 = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch (e) {
    console.warn('Failed to decode string:', e);
    return '';
  }
};

// Generate unique identifier
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};