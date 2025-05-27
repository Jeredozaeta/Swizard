import { AudioContext, OfflineAudioContext } from 'standardized-audio-context';
import { FrequencyChannel, AudioEffect } from '../types';
import { buildToneGraph } from './buildToneGraph';
import { encodeWav } from './wavEncoder';

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
  console.log('Starting chunked export:', { durationSeconds, sampleRate });

  const CHUNK_DURATION = 120; // 2 minutes per chunk
  const numChannels = 2; // Stereo output
  const numChunks = Math.ceil(durationSeconds / CHUNK_DURATION);
  
  // Pre-allocate buffers for the entire duration
  const leftChannel = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  const rightChannel = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  
  try {
    // Process audio in chunks
    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * CHUNK_DURATION;
      const chunkDuration = Math.min(CHUNK_DURATION, durationSeconds - chunkStart);
      const samplesInChunk = Math.ceil(chunkDuration * sampleRate);
      
      console.log(`Processing chunk ${i + 1}/${numChunks}:`, {
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

      // Render chunk
      const renderedBuffer = await ctx.startRendering();
      
      // Copy chunk data to main buffers
      const startIndex = Math.floor(chunkStart * sampleRate);
      const chunkLeft = renderedBuffer.getChannelData(0);
      const chunkRight = renderedBuffer.getChannelData(1);
      
      leftChannel.set(chunkLeft, startIndex);
      rightChannel.set(chunkRight, startIndex);

      // Report progress
      const progress = ((i + 1) / numChunks) * 100;
      onProgress?.(progress);
      
      console.log(`Chunk ${i + 1} complete:`, {
        startIndex,
        samplesWritten: chunkLeft.length
      });

      // Small delay to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('All chunks processed, encoding WAV...');

    // Encode final WAV file
    const wavBuffer = encodeWav([leftChannel, rightChannel], sampleRate);
    
    console.log('WAV encoding complete:', {
      size: wavBuffer.byteLength,
      duration: durationSeconds,
      sampleRate
    });

    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (error) {
    console.error('Chunked export error:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
}