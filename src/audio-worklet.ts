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