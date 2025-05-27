import { FrequencyChannel, AudioEffect } from '../types';
import { chunkedOfflineExport } from './chunkedOfflineExport';

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
}: SlicedExportOptions): Promise<Blob[]> {
  console.log('Starting sliced export:', { durationSeconds });

  const SLICE_DURATION = 7200; // 2 hours per slice
  const numSlices = Math.ceil(durationSeconds / SLICE_DURATION);
  const blobs: Blob[] = [];

  for (let i = 0; i < numSlices; i++) {
    const sliceStart = i * SLICE_DURATION;
    const sliceDuration = Math.min(SLICE_DURATION, durationSeconds - sliceStart);

    console.log(`Rendering slice ${i + 1}/${numSlices}:`, { sliceDuration });

    try {
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

    } catch (error) {
      console.error(`Error rendering slice ${i + 1}:`, error);
      throw error;
    }
  }

  return blobs;
}