import { AudioEffect } from '../types';

export function buildToneGraph(ctx: BaseAudioContext, frequencies: number[], effects: AudioEffect[]): AudioNode {
  // Create oscillators for each frequency
  const oscillators = frequencies.map(freq => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.start();
    return osc;
  });

  // Create main gain node
  const mainGain = ctx.createGain();
  mainGain.gain.value = 0.5; // Prevent clipping

  // Connect oscillators to gain
  oscillators.forEach(osc => osc.connect(mainGain));

  // Apply effects if any
  let currentNode: AudioNode = mainGain;
  effects.forEach(effect => {
    if (effect.enabled) {
      // Add effect processing here
      // This is a simplified example
      const gainNode = ctx.createGain();
      gainNode.gain.value = effect.value;
      currentNode.connect(gainNode);
      currentNode = gainNode;
    }
  });

  return currentNode;
}