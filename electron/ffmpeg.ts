import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { app } from 'electron';
import { ensureTempDirectory, cleanupTempFiles } from './utils';

export const setupFfmpeg = () => {
  const ffmpegPath = process.env.NODE_ENV === 'development'
    ? require('ffmpeg-static')
    : path.join(process.resourcesPath, 'ffmpeg');
    
  ffmpeg.setFfmpegPath(ffmpegPath);
};

export const exportWithFfmpeg = async (
  chunks: ArrayBuffer[],
  outputPath: string,
  format: 'wav' | 'mp4',
  background?: {
    type: 'image' | 'video';
    path: string;
  },
  onProgress: (progress: number) => void
): Promise<void> => {
  const tempDir = await ensureTempDirectory();
  const tempFiles: string[] = [];

  try {
    // Write chunks to temp files
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = path.join(tempDir, `chunk_${i}.wav`);
      await fs.writeFile(chunkPath, Buffer.from(chunks[i]));
      tempFiles.push(chunkPath);
    }

    // Create concat file
    const concatFile = path.join(tempDir, 'concat.txt');
    const concatContent = tempFiles.map(f => `file '${f}'`).join('\n');
    await fs.writeFile(concatFile, concatContent);
    tempFiles.push(concatFile);

    // Create intermediate audio file
    const audioFile = path.join(tempDir, 'audio.wav');
    tempFiles.push(audioFile);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .output(audioFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    if (format === 'wav') {
      // Just copy the audio file
      await fs.copyFile(audioFile, outputPath);
    } else {
      // Create MP4 with background
      const command = ffmpeg();

      if (background) {
        if (background.type === 'image') {
          command
            .input(background.path)
            .loop();
        } else {
          command
            .input(background.path)
            .inputOptions(['-stream_loop', '-1']);
        }
      } else {
        // Create black background
        command
          .input('color=c=black:s=1920x1080:r=30')
          .inputOptions(['-f', 'lavfi']);
      }

      command
        .input(audioFile)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest'
        ])
        .on('progress', progress => {
          onProgress(Math.round(progress.percent));
        })
        .on('end', () => {
          cleanupTempFiles(tempFiles);
          resolve();
        })
        .on('error', err => {
          cleanupTempFiles(tempFiles);
          reject(err);
        })
        .save(outputPath);
    }
  } catch (error) {
    await cleanupTempFiles(tempFiles);
    throw error;
  }
};