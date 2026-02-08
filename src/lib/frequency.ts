import { PinCandidate } from '../types';

/**
 * Look up the raw frequency count for a given PIN.
 */
export function getFrequency(pin: string, frequencyMap: Map<string, number>): number {
  return frequencyMap.get(pin) || 0;
}

/**
 * Normalize a frequency count relative to a maximum count.
 * Returns a value in [0, 1].
 */
export function normalizeFrequency(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return count / maxCount;
}

/**
 * Rank a list of PINs by their frequency in descending order.
 * Returns PinCandidate objects with the raw count as the score.
 */
export function rankByFrequency(pins: string[], frequencyMap: Map<string, number>): PinCandidate[] {
  return pins
    .map(pin => ({
      pin,
      score: getFrequency(pin, frequencyMap)
    }))
    .sort((a, b) => b.score - a.score);
}
