import * as Comlink from 'comlink';
import { FrequencyChannel, AudioEffect } from '../types';
import { chunkedOfflineExport } from '../audio/chunkedOfflineExport';

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

    try {
      for (let i = 0; i < numSlices; i++) {
        const sliceStart = i * SLICE_DURATION;
        const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

        console.log(`[Export Worker] Rendering slice ${i + 1}/${numSlices}:`, {
          start: sliceStart,
          duration: sliceDuration
        });

        const blob = await chunkedOfflineExport({
          durationSeconds: sliceDuration,
          frequencies,
          effects,
          onProgress: (sliceProgress) => {
            const overallProgress = ((i * 100) + sliceProgress) / numSlices;
            // Use postMessage instead of callback
            self.postMessage({ type: 'progress', percent: Math.min(99, overallProgress) });
          }
        });

        blobs.push(blob);
        
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

Comlink.expose(api);