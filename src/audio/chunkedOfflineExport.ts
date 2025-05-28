import { AudioContext, OfflineAudioContext } from 'standardized-audio-context';
import { FrequencyChannel, AudioEffect } from '../types';
import { buildToneGraph } from './buildToneGraph';
import { createWavHeader, float32ToInt16 } from './wavEncoder';
import { toast } from 'react-toastify';

interface ChunkedExportOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
  onProgress?: (percent: number) => void;
  sampleRate?: number;
}

export async function chunkedOfflineExport({
  durationSeconds,
  frequencies,
  effects,
  onProgress,
  sampleRate = 48000
}: ChunkedExportOptions): Promise<Blob> {
  console.log('[Swizard Export] Starting export:', { durationSeconds, sampleRate });

  const CHUNK_DURATION = 600; // 10 minute chunks
  const numChannels = 2;
  const numChunks = Math.ceil(durationSeconds / CHUNK_DURATION);
  const totalSamples = Math.ceil(durationSeconds * sampleRate);
  
  // Create WAV header first
  const headerBuffer = createWavHeader(totalSamples, numChannels, sampleRate);
  const chunkPcmBuffers: ArrayBuffer[] = [headerBuffer];
  
  // Progress update interval
  const progressInterval = setInterval(() => {
    console.log('[Swizard Export] Still processing...');
  }, 5000);

  try {
    // Process audio in chunks
    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * CHUNK_DURATION;
      const chunkDuration = Math.min(CHUNK_DURATION, durationSeconds - chunkStart);
      const samplesInChunk = Math.ceil(chunkDuration * sampleRate);

      console.log(`[Swizard Export] Processing chunk ${i + 1}/${numChunks}:`, {
        start: chunkStart,
        duration: chunkDuration,
        samples: samplesInChunk
      });

      // Create offline context for this chunk
      const ctx = new OfflineAudioContext(
        numChannels,
        samplesInChunk,
        sampleRate
      );

      // Build audio graph for this chunk
      const outputNode = buildToneGraph(ctx, frequencies, effects);
      outputNode.connect(ctx.destination);

      console.log(`[Swizard Export] Starting render for chunk ${i + 1}`);
      const renderStartTime = performance.now();
      
      // Set timeout for chunk rendering
      const chunkTimeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Chunk ${i + 1} render timed out after 60 seconds`));
        }, 60000);
      });

      // Race between rendering and timeout
      const renderedBuffer = await Promise.race([
        ctx.startRendering(),
        chunkTimeout
      ]);

      const renderTime = performance.now() - renderStartTime;
      console.log(`[Swizard Export] Chunk ${i + 1} rendered in ${renderTime.toFixed(2)}ms`);

      // Convert Float32Arrays to Int16Arrays and interleave
      const leftChannel = float32ToInt16(renderedBuffer.getChannelData(0));
      const rightChannel = float32ToInt16(renderedBuffer.getChannelData(1));
      
      // Interleave channels and create chunk buffer
      const interleavedBuffer = new Int16Array(samplesInChunk * 2);
      for (let j = 0; j < samplesInChunk; j++) {
        interleavedBuffer[j * 2] = leftChannel[j];
        interleavedBuffer[j * 2 + 1] = rightChannel[j];
      }
      
      // Store chunk buffer
      chunkPcmBuffers.push(interleavedBuffer.buffer);

      console.log(`[Swizard Export] Chunk ${i + 1} processed and stored`);

      // Report progress
      const progress = ((i + 1) / numChunks) * 100;
      onProgress?.(progress);
      console.log(`[Swizard Export] Progress: ${progress.toFixed(1)}%`);

      // Small delay between chunks to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    clearInterval(progressInterval);

    // Create final blob from all chunks
    console.log('[Swizard Export] Creating final WAV blob');
    const blob = new Blob(chunkPcmBuffers, { type: 'audio/wav' });
    
    console.log('[Swizard Export] Final blob size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

    if (blob.size === 0) {
      throw new Error('Empty blob generated');
    }

    // Create backup download link
    const url = URL.createObjectURL(blob);
    
    // Dispatch event for backup download
    const backupEvent = new CustomEvent('swizardExportComplete', { 
      detail: { url, size: blob.size } 
    });
    document.dispatchEvent(backupEvent);

    return blob;
  } catch (error) {
    console.error('[Swizard Export] Export error:', error);
    clearInterval(progressInterval);
    throw error;
  }
}