import { FrequencyChannel, AudioEffect } from '../types';
import * as Comlink from 'comlink';
import { wrap } from 'comlink';
import type { ExportWorkerApi } from '../workers/exportWorker';

interface SlicedExportOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
  onProgress?: (percent: number) => void;
}

export async function slicedExport({
  durationSeconds,
  frequencies,
  effects,
  onProgress
}: SlicedExportOptions): Promise<Blob> {
  console.log('[Swizard Export] Starting export:', { 
    durationSeconds,
    numFrequencies: frequencies.filter(f => f.enabled).length,
    numEffects: Object.values(effects).filter(e => e.enabled).length
  });

  // Create worker and wrap with Comlink
  const worker = new Worker(new URL('../workers/exportWorker.ts', import.meta.url), {
    type: 'module'
  });
  
  // Set up progress handler before wrapping with Comlink
  worker.onmessage = (event) => {
    if (event.data?.type === 'progress' && onProgress) {
      onProgress(event.data.percent);
    }
  };

  const api = wrap<ExportWorkerApi>(worker);

  try {
    // Generate audio in worker
    const audioBlobs = await api.generateAudio({
      durationSeconds,
      frequencies,
      effects
    });

    if (!audioBlobs || (Array.isArray(audioBlobs) && audioBlobs.length === 0)) {
      throw new Error('Generated audio is empty');
    }

    // Combine multiple blobs into a single blob if needed
    const finalBlob = Array.isArray(audioBlobs) 
      ? new Blob(audioBlobs, { type: 'audio/wav' })
      : audioBlobs;

    if (finalBlob.size === 0) {
      throw new Error('Generated audio blob is empty');
    }

    onProgress?.(100);
    return finalBlob;
  } catch (error) {
    console.error('[Swizard Export] Export error:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    worker.terminate();
  }
}