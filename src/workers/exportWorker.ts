import * as Comlink from 'comlink';
import { FrequencyChannel, AudioEffect } from '../types';
import { generateAudioData } from '../audio/audioWorker';

export interface ExportWorkerApi {
  generateAudio: (options: {
    durationSeconds: number;
    frequencies: FrequencyChannel[];
    effects: Record<string, AudioEffect>;
  }) => Promise<Blob[]>;
}

const api: ExportWorkerApi = {
  async generateAudio({ durationSeconds, frequencies, effects }) {
    const SLICE_DURATION = 600; // 10 minutes per slice
    const numSlices = Math.ceil(durationSeconds / SLICE_DURATION);
    const blobs: Blob[] = [];
    const sampleRate = 48000;

    try {
      for (let i = 0; i < numSlices; i++) {
        const sliceStart = i * SLICE_DURATION;
        const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

        console.log(`[Export Worker] Rendering slice ${i + 1}/${numSlices}:`, {
          start: sliceStart,
          duration: sliceDuration
        });

        const result = await generateAudioData({
          durationSeconds: sliceDuration,
          frequencies: frequencies.filter(f => f.enabled),
          sampleRate,
          effects: Object.values(effects).filter(e => e.enabled),
          onProgress: (sliceProgress) => {
            const overallProgress = ((i * 100) + sliceProgress) / numSlices;
            self.postMessage({ type: 'progress', percent: Math.min(99, overallProgress) });
          }
        });

        if (!result || !result.audioData || result.audioData.length === 0) {
          throw new Error('Generated audio data is empty or invalid');
        }

        // Convert Float32Array to Int16Array for WAV format
        const int16Data = new Int16Array(result.audioData.length);
        for (let j = 0; j < result.audioData.length; j++) {
          const sample = Math.max(-1, Math.min(1, result.audioData[j]));
          int16Data[j] = Math.round(sample * 32767);
        }

        // Create WAV blob
        const wavBlob = new Blob([
          createWavHeader(int16Data.length, sampleRate),
          int16Data
        ], { type: 'audio/wav' });

        if (wavBlob.size === 0) {
          throw new Error('Generated WAV blob is empty');
        }

        blobs.push(wavBlob);
        
        // Small delay between slices to prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return blobs;
    } catch (error) {
      console.error('[Export Worker] Error:', error);
      throw error;
    }
  }
};

function createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const headerLength = 44;
  const header = new ArrayBuffer(headerLength);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength * 2, true);

  return header;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

Comlink.expose(api);