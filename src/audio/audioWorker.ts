// Audio processing worklet
class AudioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'gain',
      defaultValue: 1,
      minValue: 0,
      maxValue: 1
    }];
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    const output = outputs[0];
    const gain = parameters.gain;

    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < outputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i] * gain[i];
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);

// Constants for audio configuration
const SAMPLE_RATE = 48000;
const CHANNELS = 2;

// Maximum duration: 12 hours in seconds
const MAX_DURATION = 43200; // 12 hours * 60 minutes * 60 seconds

interface WaveformGenerator {
  (t: number, frequency: number): number;
}

const waveformGenerators: Record<string, WaveformGenerator> = {
  sine: (t: number, frequency: number) => 
    Math.sin(2 * Math.PI * frequency * t),
  
  square: (t: number, frequency: number) => 
    Math.sign(Math.sin(2 * Math.PI * frequency * t)),
  
  sawtooth: (t: number, frequency: number) => 
    2 * ((frequency * t) % 1) - 1,
  
  triangle: (t: number, frequency: number) => 
    2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1
};

interface AudioChannel {
  frequency: number;
  waveform: keyof typeof waveformGenerators;
  enabled: boolean;
}

// Clean up on termination
self.addEventListener('unload', () => {
  // No cleanup needed
});