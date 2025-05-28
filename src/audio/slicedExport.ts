import { FrequencyChannel, AudioEffect } from '../types';
import { chunkedOfflineExport } from './chunkedOfflineExport';
import JSZip from 'jszip';

interface SlicedExportOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
  onProgress?: (percent: number) => void;
  onSliceComplete?: (sliceIndex: number, totalSlices: number) => void;
}

export async function slicedExport({
  durationSeconds,
  frequencies,
  effects,
  onProgress,
  onSliceComplete
}: SlicedExportOptions): Promise<Blob> {
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
          onProgress?.(Math.min(99, overallProgress)); // Keep at 99% until ZIP is complete
        }
      });

      blobs.push(blob);
      onSliceComplete?.(i + 1, numSlices);
      
      console.log(`[Swizard Export] Slice ${i + 1} complete:`, {
        size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        type: blob.type
      });

      // Small delay between slices to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If we have multiple slices, create a ZIP file
    if (blobs.length > 1) {
      console.log('[Swizard Export] Creating ZIP archive:', {
        numFiles: blobs.length,
        totalSize: (blobs.reduce((acc, blob) => acc + blob.size, 0) / 1024 / 1024).toFixed(2) + ' MB'
      });

      const zip = new JSZip();
      
      blobs.forEach((blob, index) => {
        const fileName = `swizard-part${(index + 1).toString().padStart(2, '0')}.wav`;
        zip.file(fileName, blob);
        console.log(`[Swizard Export] Added to ZIP: ${fileName}`);
      });

      console.log('[Swizard Export] Generating final ZIP file...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // No compression for audio files
        comment: 'Created with Swizard - https://realsoundwizard.com'
      });

      console.log('[Swizard Export] ZIP creation complete:', {
        size: (zipBlob.size / 1024 / 1024).toFixed(2) + ' MB',
        compressionRatio: (zipBlob.size / blobs.reduce((acc, blob) => acc + blob.size, 0)).toFixed(2)
      });

      onProgress?.(100); // Finally update to 100%
      return zipBlob;
    }

    // Single file, return as is
    onProgress?.(100);
    return blobs[0];
  } catch (error) {
    console.error('[Swizard Export] Export error:', {
      message: error.message,
      stack: error.stack,
      phase: blobs.length > 0 ? `slice_${blobs.length}` : 'initial'
    });
    throw error;
  }
}