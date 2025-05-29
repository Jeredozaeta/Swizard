import { promises as fs } from 'fs';
import * as path from 'path';

export const checkDiskSpace = async (filePath: string): Promise<{
  available: number;
  total: number;
}> => {
  try {
    const dir = path.dirname(filePath);
    const stats = await fs.statfs(dir);
    
    return {
      available: stats.bavail * stats.bsize,
      total: stats.blocks * stats.bsize
    };
  } catch (error) {
    console.error('Error checking disk space:', error);
    throw error;
  }
};

export const ensureTempDirectory = async () => {
  const tempDir = path.join(app.getPath('temp'), 'swizard');
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
};

export const cleanupTempFiles = async (files: string[]) => {
  await Promise.all(
    files.map(file => 
      fs.unlink(file).catch(err => 
        console.error(`Failed to delete temp file ${file}:`, err)
      )
    )
  );
};