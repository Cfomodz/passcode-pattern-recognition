import type { PinCandidate, TapAnalysis } from '../types';

export const DEFAULT_TOP_K = 4;

/**
 * Generates PIN candidates based on the heatmap probabilities.
 * 
 * 1. Selects top K digits for each position.
 * 2. Generates all combinations (K^4).
 * 3. Scores each candidate as the product of its digit probabilities.
 * 4. Returns ranked list.
 */
export function generateCandidates(
  analyses: TapAnalysis[],
  topK: number = DEFAULT_TOP_K
): PinCandidate[] {
  if (analyses.length !== 4) {
    return [];
  }

  // 1. Select top K digits per position
  const topDigitsPerPos = analyses.map(analysis => 
    analysis.probabilities.slice(0, topK)
  );

  // 2. Generate Cartesian product
  const candidates: PinCandidate[] = [];

  // We know it's exactly 4 positions, so we can use nested loops or recursion.
  // Recursion is cleaner for variable length, but nested loops are fine for fixed 4.
  // Let's use a recursive helper to be generic-ish (though we enforce 4 above).
  
  function backtrack(index: number, currentPin: string, currentScore: number) {
    if (index === 4) {
      candidates.push({ pin: currentPin, score: currentScore });
      return;
    }

    const possibleDigits = topDigitsPerPos[index];
    for (const { digit, p } of possibleDigits) {
      backtrack(
        index + 1,
        currentPin + digit.toString(),
        currentScore * p
      );
    }
  }

  backtrack(0, "", 1.0);

  // 3. Sort descending by score
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Helper to create a pure heatmap ranking (List 1).
 * Just takes the generated candidates and returns top N.
 */
export function rankByHeatmap(candidates: PinCandidate[], limit: number = 10): PinCandidate[] {
  return candidates.slice(0, limit);
}
