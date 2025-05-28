import { FrequencyChannel, AudioEffect } from '../types';
import * as Comlink from 'comlink';
import { wrap } from 'comlink';
import type { ExportWorkerApi } from '../workers/exportWorker';

interface SlicedExportOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
  onProgress?: (percent: number) => void;
  onSliceComplete?: (sliceIndex: number, totalSlices: number, blob: Blob) => void;
}

export async function slicedExport({
  durationSeconds,
  frequencies,
  effects,
  onProgress,
  onSliceComplete
}: SlicedExportOptions): Promise<Blob | Blob[]> {
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
    // Check for File System Access API support
    const supportsFileSystem = 'showSaveFilePicker' in window;
    let fileHandle: FileSystemFileHandle | null = null;

    if (supportsFileSystem) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: `swizard-export-${Date.now()}.wav`,
          types: [{
            description: 'WAV Audio',
            accept: { 'audio/wav': ['.wav'] }
          }]
        });
      } catch (error) {
        console.log('[Swizard Export] User cancelled file picker or not supported');
        fileHandle = null;
      }
    }

    // Generate audio in worker - don't pass onProgress callback
    const blobs = await api.generateAudio({
      durationSeconds,
      frequencies,
      effects
    });

    // If we have a file handle, write directly to disk
    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      for (const blob of blobs) {
        await writable.write(blob);
      }
      await writable.close();
      return blobs[0]; // Return first blob for consistency
    }

    // If only one blob, return it directly
    if (blobs.length === 1) {
      onProgress?.(100);
      return blobs[0];
    }

    // Try ZIP first for multiple files
    try {
      console.log('[Swizard Export] Attempting ZIP creation...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      blobs.forEach((blob, index) => {
        const fileName = `swizard-part${(index + 1).toString().padStart(2, '0')}.wav`;
        zip.file(fileName, blob);
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE'
      });

      if (zipBlob.size > 0) {
        onProgress?.(100);
        return zipBlob;
      }
    } catch (zipError) {
      console.warn('[Swizard Export] ZIP creation failed, falling back to individual files:', zipError);
    }

    // If ZIP fails or is too large, return array of blobs
    onProgress?.(100);
    return blobs;
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