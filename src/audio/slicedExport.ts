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
  console.log('Starting sliced export:', { durationSeconds });

  const SLICE_DURATION = 2400; // 40 minutes per slice
  const numSlices = Math.ceil(durationSeconds / SLICE_DURATION);
  const blobs: Blob[] = [];

  try {
    for (let i = 0; i < numSlices; i++) {
      const sliceStart = i * SLICE_DURATION;
      const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

      console.log(`Rendering slice ${i + 1}/${numSlices}:`, { sliceDuration });

      const blob = await chunkedOfflineExport({
        durationSeconds: sliceDuration,
        frequencies,
        effects,
        onProgress: (sliceProgress) => {
          const overallProgress = ((i * 100) + sliceProgress) / numSlices;
          onProgress?.(overallProgress);
        }
      });

      blobs.push(blob);
      onSliceComplete?.(i + 1, numSlices);
      console.log(`Slice ${i + 1} complete:`, { size: blob.size });
    }

    // If we have multiple slices, create a ZIP file
    if (blobs.length > 1) {
      console.log('Creating ZIP archive for multiple slices');
      const zip = new JSZip();
      
      blobs.forEach((blob, index) => {
        zip.file(`swizard-part${index + 1}.wav`, blob);
      });

      return await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // No compression for audio files
        comment: 'Created with Swizard'
      });
    }

    // Single file, return as is
    return blobs[0];
  } catch (error) {
    console.error('Sliced export error:', error);
    throw error;
  }
}