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
    const SLICE_DURATION = 2400; // 40 minutes per slice
    const numSlices = Math.ceil(durationSeconds / SLICE_DURATION);
    const blobs: Blob[] = [];
    const sampleRate = 44100;

    try {
      for (let i = 0; i < numSlices; i++) {
        const sliceStart = i * SLICE_DURATION;
        const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

        console.log(`[Export Worker] Rendering slice ${i + 1}/${numSlices}:`, {
          start: sliceStart,
          duration: sliceDuration
        });

        // Generate raw audio data using audioWorker's method
        const { audioData, metadata } = await generateAudioData({
          durationSeconds: sliceDuration,
          frequencies: frequencies.filter(f => f.enabled),
          sampleRate,
          effects: Object.values(effects).filter(e => e.enabled),
          onProgress: (sliceProgress) => {
            const overallProgress = ((i * 100) + sliceProgress) / numSlices;
            self.postMessage({ type: 'progress', percent: Math.min(99, overallProgress) });
          }
        });

        // Convert audio data to WAV blob
        const wavBlob = new Blob([
          createWavHeader(audioData.length, sampleRate),
          audioData
        ], { type: 'audio/wav' });

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

// Helper function to create WAV header
function createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const headerLength = 44;
  const header = new ArrayBuffer(headerLength);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return header;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

Comlink.expose(api);