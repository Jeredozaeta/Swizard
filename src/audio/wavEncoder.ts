export function encodeWav(channelData: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channelData.length;
  const numSamples = channelData[0].length;
  const bytesPerSample = 2; // 16-bit PCM
  
  // Calculate sizes
  const dataSize = numChannels * numSamples * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  // Create buffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, totalSize - 8, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, dataSize, true); // Subchunk2Size
  
  // Write interleaved audio data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += bytesPerSample;
    }
  }
  
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}