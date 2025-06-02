import * as Tone from 'tone';
import { FrequencyChannel, AudioEffect } from '../types';
import { encodeWav } from './wavEncoder';

interface RenderOptions {
  durationSeconds: number;
  frequencies: FrequencyChannel[];
  effects: Record<string, AudioEffect>;
}

export async function renderOffline({ durationSeconds, frequencies, effects }: RenderOptions): Promise<Blob> {
  console.log('Starting offline render:', { durationSeconds, frequencies, effects });
  
  const sampleRate = 48000;
  const channels = 2; // Stereo output
  
  // Create offline context
  const offline = new Tone.OfflineContext(channels, durationSeconds, sampleRate);
  Tone.setContext(offline);
  
  try {
    // Create master gain and compressor
    const masterCompressor = new Tone.Compressor({
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25
    }).toDestination();
    
    const masterGain = new Tone.Gain(0.8).connect(masterCompressor);

    // Create and connect oscillators
    const enabledFrequencies = frequencies.filter(f => f.enabled);
    console.log('Setting up oscillators:', enabledFrequencies.length);
    
    enabledFrequencies.forEach(freq => {
      const osc = new Tone.Oscillator({
        type: freq.waveform,
        frequency: freq.frequency,
      }).connect(masterGain);
      
      // Normalize volume based on number of oscillators
      const normalizedVolume = -12 - (6 * Math.log10(enabledFrequencies.length));
      osc.volume.value = normalizedVolume;
      
      osc.start(0);
      console.log(`Oscillator created: ${freq.frequency}Hz ${freq.waveform}`);
    });

    // Apply effects chain
    let effectInput = masterGain;
    
    // Process each enabled effect
    Object.entries(effects).forEach(([id, effect]) => {
      if (!effect.enabled) return;
      
      console.log(`Applying effect: ${id}`, effect);
      
      switch (id) {
        case 'tremolo': {
          const tremolo = new Tone.Tremolo({
            frequency: effect.value,
            depth: 0.7,
            spread: 180
          }).connect(effectInput);
          tremolo.start();
          effectInput = tremolo;
          break;
        }
        
        case 'stereoPan': {
          const panner = new Tone.AutoPanner({
            frequency: effect.value,
            depth: 1
          }).connect(effectInput);
          panner.start();
          effectInput = panner;
          break;
        }
        
        case 'phaser': {
          const phaser = new Tone.Phaser({
            frequency: effect.value,
            octaves: 3,
            stages: 12,
            Q: 10,
            baseFrequency: 350
          }).connect(effectInput);
          effectInput = phaser;
          break;
        }
        
        case 'amplitudeMod': {
          const am = new Tone.AMOscillator({
            frequency: effect.value,
            type: 'sine',
            modulationType: 'square'
          }).connect(effectInput);
          am.start();
          effectInput = am;
          break;
        }
        
        case 'pan360': {
          const rotator = new Tone.AutoPanner({
            frequency: effect.value,
            depth: 1,
            type: 'sine'
          }).connect(effectInput);
          rotator.start();
          effectInput = rotator;
          break;
        }
        
        case 'isoPulses': {
          const pulseGain = new Tone.Gain().connect(effectInput);
          const lfo = new Tone.LFO({
            frequency: effect.value,
            min: 0,
            max: 1,
            type: 'square'
          }).connect(pulseGain.gain);
          lfo.start();
          effectInput = pulseGain;
          break;
        }
        
        case 'chorus': {
          const chorus = new Tone.Chorus({
            frequency: effect.value,
            delayTime: 3.5,
            depth: 0.7,
            spread: 180
          }).connect(effectInput);
          chorus.start();
          effectInput = chorus;
          break;
        }
        
        case 'reverb': {
          const reverb = new Tone.Reverb({
            decay: effect.value / 30,
            preDelay: 0.01
          }).connect(effectInput);
          effectInput = reverb;
          break;
        }
      }
    });

    console.log('Starting render process...');
    const renderedBuffer = await offline.render();
    console.log('Render complete:', { 
      duration: renderedBuffer.duration,
      channels: renderedBuffer.numberOfChannels,
      length: renderedBuffer.length
    });

    // Extract channel data
    const channelData: Float32Array[] = [];
    for (let i = 0; i < renderedBuffer.numberOfChannels; i++) {
      channelData.push(renderedBuffer.getChannelData(i));
    }

    // Encode WAV file
    const wavBuffer = encodeWav(channelData, sampleRate);
    console.log('WAV encoding complete:', wavBuffer.byteLength, 'bytes');

    // Create and return blob
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (error) {
    console.error('Render error:', error);
    throw new Error(`Failed to render audio: ${error.message}`);
  }
}