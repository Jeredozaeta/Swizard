import { FrequencyChannel, AudioEffect } from '../types';
import { chunkedOfflineExport } from './chunkedOfflineExport';
import JSZip from 'jszip';

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
  console.log('[Swizard Export] Starting sliced export:', { 
    durationSeconds,
    numFrequencies: frequencies.filter(f => f.enabled).length,
    numEffects: Object.values(effects).filter(e => e.enabled).length
  });

  const SLICE_DURATION = 2400; // 40 minutes per slice
  const numSlices = Math.ceil(durationSeconds / SLICE_DURATION);
  const blobs: Blob[] = [];

  try {
    for (let i = 0; i < numSlices; i++) {
      const sliceStart = i * SLICE_DURATION;
      const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

      console.log(`[Swizard Export] Rendering slice ${i + 1}/${numSlices}:`, {
        start: sliceStart,
        duration: sliceDuration,
        totalProgress: ((i / numSlices) * 100).toFixed(1) + '%'
      });

      const blob = await chunkedOfflineExport({
        durationSeconds: sliceDuration,
        frequencies,
        effects,
        onProgress: (sliceProgress) => {
          const overallProgress = ((i * 100) + sliceProgress) / numSlices;
          onProgress?.(Math.min(99, overallProgress));
        }
      });

      blobs.push(blob);
      onSliceComplete?.(i + 1, numSlices, blob);
      
      console.log(`[Swizard Export] Slice ${i + 1} complete:`, {
        size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: blob.type
      });

      // Small delay between slices to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If only one slice, return it directly
    if (blobs.length === 1) {
      onProgress?.(100);
      return blobs[0];
    }

    // For multiple slices, try ZIP first
    try {
      console.log('[Swizard Export] Attempting ZIP creation...');
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
      stack: error.stack,
      phase: blobs.length > 0 ? `slice_${blobs.length}` : 'initial'
    });
    throw error;
  }
}