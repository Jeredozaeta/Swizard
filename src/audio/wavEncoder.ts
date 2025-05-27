// WAV file encoder for audio export
export function encodeWav(chData: Float32Array[], sampleRate: number): ArrayBuffer {
  const numCh = chData.length;
  const numFrames = chData[0].length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  const writeStr = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); };
  const write32 = (v: number) => { view.setUint32(offset, v, true); offset += 4; };
  const write16 = (v: number) => { view.setUint16(offset, v, true); offset += 2; };

  // Write WAV header
  writeStr('RIFF');          write32(36 + dataSize);
  writeStr('WAVEfmt ');      write32(16);           write16(1);
  write16(numCh);            write32(sampleRate);   write32(byteRate);
  write16(blockAlign);       write16(16);
  writeStr('data');          write32(dataSize);

  // Write audio data
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.round(clamp(chData[ch][i]) * 0x7FFF);
      view.setInt16(offset, s, true); offset += 2;
    }
  }

  return buffer;
}