import { AudioContext, OfflineAudioContext } from 'standardized-audio-context';
import { FrequencyChannel, AudioEffect } from '../types';
import { buildToneGraph } from './buildToneGraph';
import { encodeWav } from './wavEncoder';
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
  console.log('⏱ Starting export:', { durationSeconds, sampleRate });

  const CHUNK_DURATION = 120; // 2 minutes per chunk
  const numChannels = 2; // Stereo output
  const numChunks = Math.ceil(durationSeconds / CHUNK_DURATION);
  
  // Pre-allocate buffers for the entire duration
  const leftChannel = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  const rightChannel = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  
  // Set timeout for long-running exports
  const timeoutId = setTimeout(() => {
    console.error('⛔️ Export timeout — check buffer or promise');
    throw new Error('Export timed out after 30 seconds');
  }, 30000);
  
  try {
    // Process audio in chunks
    for (let i = 0; i < numChunks; i++) {
      const chunkStart = i * CHUNK_DURATION;
      const chunkDuration = Math.min(CHUNK_DURATION, durationSeconds - chunkStart);
      const samplesInChunk = Math.ceil(chunkDuration * sampleRate);

      console.log(`🎵 Processing chunk ${i + 1}/${numChunks}:`, {
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

      console.log('⏱ Starting render for chunk', i + 1);
      const renderedBuffer = await ctx.startRendering();
      console.log('✅ Render complete for chunk', i + 1);
      
      // Copy chunk data to main buffers
      const startIndex = Math.floor(chunkStart * sampleRate);
      const chunkLeft = renderedBuffer.getChannelData(0);
      const chunkRight = renderedBuffer.getChannelData(1);
      
      leftChannel.set(chunkLeft, startIndex);
      rightChannel.set(chunkRight, startIndex);

      console.log(`🧠 Frames processed: ${startIndex + chunkLeft.length}`);

      // Report progress
      const progress = ((i + 1) / numChunks) * 100;
      onProgress?.(progress);

      // Small delay to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Clear timeout since processing completed
    clearTimeout(timeoutId);

    console.log('🎛 Encoding WAV file');
    const wavBuffer = encodeWav([leftChannel, rightChannel], sampleRate);
    
    console.log('WAV buffer size:', wavBuffer.byteLength, 'bytes');

    if (wavBuffer.byteLength === 0) {
      throw new Error('Empty WAV buffer generated');
    }

    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    console.log('Final blob:', {
      size: blob.size,
      type: blob.type
    });

    if (blob.size === 0) {
      throw new Error('Empty blob generated');
    }

    // Create backup download link
    const url = URL.createObjectURL(blob);
    toast.info(
      <a href={url} download={`swizard-${Date.now()}.wav`} className="text-blue-400 hover:text-blue-300">
        Click here if download doesn't start automatically
      </a>,
      { autoClose: 10000 }
    );

    return blob;
  } catch (error) {
    console.error('Export error:', error);
    clearTimeout(timeoutId);
    throw error;
  }
}