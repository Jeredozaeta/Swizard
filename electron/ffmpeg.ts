import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { app } from 'electron';

export const setupFfmpeg = () => {
  const ffmpegPath = process.env.NODE_ENV === 'development'
    ? require('ffmpeg-static')
    : path.join(process.resourcesPath, 'ffmpeg');
    
  ffmpeg.setFfmpegPath(ffmpegPath);
};

export const stitchAudioChunks = (
  chunks: string[],
  outputPath: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    
    // Add input files
    chunks.forEach(chunk => {
      command.input(chunk);
    });
    
    command
      .on('progress', progress => {
        onProgress(Math.round(progress.percent));
      })
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .mergeToFile(outputPath, './temp');
  });
};