// Utility functions for secure random number generation

/**
 * Generate a secure random number between min and max (inclusive)
 */
export const getSecureRandomNumber = (min: number, max: number): number => {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxNum = Math.pow(256, bytesNeeded);
  const array = new Uint8Array(bytesNeeded);

  let randomNum;
  do {
    crypto.getRandomValues(array);
    randomNum = array.reduce((acc, byte, i) => acc + byte * Math.pow(256, i), 0);
  } while (randomNum >= maxNum - (maxNum % range));

  return min + (randomNum % range);
};

/**
 * Generate a secure random boolean with given probability
 */
export const getSecureRandomBool = (probability = 0.5): boolean => {
  const array = new Uint8Array(1);
  crypto.getRandomValues(array);
  return array[0] / 255 < probability;
};

/**
 * Securely shuffle an array using Fisher-Yates algorithm
 */
export const secureShuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomNumber(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};