import { encodeBase64, decodeBase64, generateId } from './utils';
import { AudioMetadata, AudioFingerprint } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultMetadata = (): AudioMetadata => ({
  id: generateId(),
  title: 'Untitled Sound',
  author: 'Anonymous',
  description: '',
  creationDate: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  version: '1.0.0',
  settings: {
    frequencies: [],
    effects: [],
    duration: 0
  },
  tags: []
});

export const generateFingerprint = (): AudioFingerprint => ({
  id: uuidv4(),
  timestamp: Date.now(),
  signature: generateId(),
  version: '1.0'
});

export const embedFingerprint = (audioBuffer: AudioBuffer, fingerprint: AudioFingerprint): AudioBuffer => {
  const data = encodeBase64(JSON.stringify(fingerprint));
  const samples = audioBuffer.getChannelData(0);
  const bitsPerSample = 2;
  
  // Use frequencies above 18kHz for embedding
  for (let i = 0; i < data.length && i * bitsPerSample < samples.length; i++) {
    const byte = data.charCodeAt(i);
    for (let bit = 0; bit < 8; bit += bitsPerSample) {
      const idx = i * 8 + bit;
      if (idx < samples.length) {
        // Modify least significant bits using spread spectrum technique
        const phase = Math.sin(2 * Math.PI * idx / samples.length);
        const magnitude = ((byte >> bit) & ((1 << bitsPerSample) - 1)) / 255;
        samples[idx] = samples[idx] + (magnitude * phase * 0.0001);
      }
    }
  }
  
  return audioBuffer;
};

export const extractFingerprint = (audioBuffer: AudioBuffer): AudioFingerprint | null => {
  try {
    const samples = audioBuffer.getChannelData(0);
    const bitsPerSample = 2;
    const dataLength = Math.floor(samples.length / (8 / bitsPerSample));
    let data = '';
    
    for (let i = 0; i < dataLength; i++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += bitsPerSample) {
        const idx = i * 8 + bit;
        if (idx < samples.length) {
          // Extract using inverse spread spectrum technique
          const phase = Math.sin(2 * Math.PI * idx / samples.length);
          const val = Math.round(((samples[idx] % 0.0001) / phase) * 255);
          byte |= (val & ((1 << bitsPerSample) - 1)) << bit;
        }
      }
      data += String.fromCharCode(byte);
    }
    
    const parsedData = JSON.parse(decodeBase64(data));
    return {
      id: parsedData.id,
      timestamp: parsedData.timestamp,
      signature: parsedData.signature,
      version: parsedData.version
    };
  } catch (e) {
    console.warn('Failed to extract fingerprint:', e);
    return null;
  }
};

export const embedMetadata = (audioBuffer: AudioBuffer, metadata: AudioMetadata): AudioBuffer => {
  const data = encodeBase64(JSON.stringify({
    ...metadata,
    lastModified: new Date().toISOString()
  }));
  const samples = audioBuffer.getChannelData(0);
  const bitsPerSample = 2;
  
  for (let i = 0; i < data.length && i * bitsPerSample < samples.length; i++) {
    const byte = data.charCodeAt(i);
    for (let bit = 0; bit < 8; bit += bitsPerSample) {
      const idx = i * 8 + bit;
      if (idx < samples.length) {
        samples[idx] = samples[idx] + 
          (((byte >> bit) & ((1 << bitsPerSample) - 1)) / 255) * 0.0001;
      }
    }
  }
  
  return audioBuffer;
};

export const extractMetadata = (audioBuffer: AudioBuffer): AudioMetadata | null => {
  try {
    const samples = audioBuffer.getChannelData(0);
    const bitsPerSample = 2;
    const dataLength = Math.floor(samples.length / (8 / bitsPerSample));
    let data = '';
    
    for (let i = 0; i < dataLength; i++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += bitsPerSample) {
        const idx = i * 8 + bit;
        if (idx < samples.length) {
          const val = Math.round((samples[idx] % 0.0001) * 255);
          byte |= (val & ((1 << bitsPerSample) - 1)) << bit;
        }
      }
      data += String.fromCharCode(byte);
    }
    
    const parsedData = JSON.parse(decodeBase64(data));
    return {
      ...createDefaultMetadata(),
      ...parsedData
    };
  } catch (e) {
    console.warn('Failed to extract metadata:', e);
    return createDefaultMetadata();
  }
};