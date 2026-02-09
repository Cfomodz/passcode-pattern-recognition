import type { NormalizedTap, DigitProbability } from '../types';
import { KEY_CENTERS } from './keypad';

export const DEFAULT_SIGMA = 0.35;

/**
 * Calculates the probability of each digit for a given normalized tap position
 * using a Gaussian kernel.
 * 
 * @param tap The normalized tap position (x, y in [0, 1])
 * @param sigma The standard deviation of the Gaussian distribution (controls spread)
 * @returns Array of 10 DigitProbability objects, sorted by probability descending
 */
export function getDigitProbabilities(tap: NormalizedTap, sigma: number = DEFAULT_SIGMA): DigitProbability[] {
  const probabilities: DigitProbability[] = [];
  let sum = 0;

  // 1. Calculate raw Gaussian scores
  for (let digit = 0; digit <= 9; digit++) {
    const center = KEY_CENTERS[digit];
    
    // Euclidean distance squared
    const dx = tap.x - center.x;
    const dy = tap.y - center.y;
    const distSq = dx * dx + dy * dy;
    
    // Gaussian kernel: exp(-d^2 / (2 * sigma^2))
    const raw = Math.exp(-distSq / (2 * sigma * sigma));
    
    probabilities.push({ digit, p: raw });
    sum += raw;
  }

  // 2. Normalize to sum to 1.0
  if (sum > 0) {
    for (const prob of probabilities) {
      prob.p /= sum;
    }
  } else {
    // Should theoretically not happen with Gaussian unless sigma is tiny and distance huge
    // Fallback: uniform distribution
    const uniform = 1.0 / 10;
    for (const prob of probabilities) {
      prob.p = uniform;
    }
  }

  // 3. Sort descending
  return probabilities.sort((a, b) => b.p - a.p);
}
