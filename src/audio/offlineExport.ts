import * as Tone from 'tone';
import { FrequencyChannel, AudioEffect } from '../types';

interface RenderOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
}

export async function renderOffline({ durationSeconds, frequencies, effects }: RenderOptions): Promise<Blob> {
  const sampleRate = 48000;
  const totalSamples = Math.ceil(durationSeconds * sampleRate);

  // Create offline context
  const offline = new Tone.OfflineContext(2, durationSeconds, sampleRate);
  Tone.setContext(offline);

  // Create master gain
  const masterGain = new Tone.Gain(0.8).toDestination();

  // Create oscillators for each enabled frequency
  const enabledFrequencies = frequencies.filter(f => f.enabled);
  enabledFrequencies.forEach(freq => {
    const osc = new Tone.Oscillator({
      type: freq.waveform,
      frequency: freq.frequency,
    }).connect(masterGain);
    
    osc.volume.value = -20 - (20 * Math.log10(enabledFrequencies.length)); // Adjust for multiple oscillators
    osc.start();
  });

  // Apply effects
  let currentNode: Tone.ToneAudioNode = masterGain;
  Object.entries(effects).forEach(([id, effect]) => {
    if (!effect.enabled) return;

    switch (id) {
      case 'tremolo':
        const tremolo = new Tone.Tremolo({
          frequency: effect.value,
          depth: 0.5,
        }).connect(currentNode);
        tremolo.start();
        currentNode = tremolo;
        break;

      case 'stereoPan':
        const panner = new Tone.AutoPanner({
          frequency: effect.value,
        }).connect(currentNode);
        panner.start();
        currentNode = panner;
        break;

      case 'phaser':
        const phaser = new Tone.Phaser({
          frequency: effect.value,
          octaves: 2,
          baseFrequency: 1000,
        }).connect(currentNode);
        currentNode = phaser;
        break;

      // Add other effects here...
    }
  });

  // Render audio
  console.log(`Starting offline render: ${durationSeconds}s at ${sampleRate}Hz`);
  const renderedBuffer = await offline.render();
  console.log('Render complete, converting to WAV');

  // Convert to WAV format
  const wavData = [];
  for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
    wavData.push(renderedBuffer.getChannelData(channel));
  }

  // Create WAV file
  const buffer = encodeWAV(wavData, sampleRate);
  return new Blob([buffer], { type: 'audio/wav' });
}

function encodeWAV(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const length = channels[0].length;
  const buffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  // Write interleaved audio data
  const offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      view.setInt16(offset + (i * numChannels + channel) * 2, sample * 0x7FFF, true);
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}