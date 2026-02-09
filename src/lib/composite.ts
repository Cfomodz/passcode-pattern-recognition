import type { PinCandidate } from '../types';
import { getFrequency, normalizeFrequency } from './frequency';

export const DEFAULT_WEIGHT_HEATMAP = 0.5;
export const DEFAULT_WEIGHT_FREQUENCY = 0.5;
export const DEFAULT_FILTER_PCT = 0.25;

/**
 * List 2: Frequency-Filtered
 * 
 * 1. Take top 25% of candidates by heatmap score.
 * 2. Sort them by raw frequency count.
 */
export function rankByFilteredFrequency(
  candidates: PinCandidate[],
  frequencyMap: Map<string, number>,
  filterPct: number = DEFAULT_FILTER_PCT,
  limit: number = 10
): PinCandidate[] {
  if (candidates.length === 0) return [];

  // 1. Filter top N%
  const cutoffIndex = Math.ceil(candidates.length * filterPct);
  const topCandidates = candidates.slice(0, cutoffIndex);

  // 2. Sort by frequency
  // Note: We return the frequency count as the score for this list,
  // because the user wants to see "most popular PINs" among the plausible ones.
  const ranked = topCandidates.map(c => ({
    pin: c.pin,
    score: getFrequency(c.pin, frequencyMap)
  })).sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}

/**
 * List 3: Weighted Composite
 * 
 * 1. Normalize heatmap scores (0..1 relative to max in set).
 * 2. Normalize frequency counts (0..1 relative to max in set).
 * 3. Combine: score = (normHeatmap * wH) + (normFreq * wF).
 */
export function rankByComposite(
  candidates: PinCandidate[],
  frequencyMap: Map<string, number>,
  weightHeatmap: number = DEFAULT_WEIGHT_HEATMAP,
  limit: number = 10
): PinCandidate[] {
  if (candidates.length === 0) return [];
  
  const weightFrequency = 1.0 - weightHeatmap;

  // Find max values for normalization
  const maxHeatmapScore = Math.max(...candidates.map(c => c.score));
  
  // We only care about frequencies for the candidates we have
  const frequencies = candidates.map(c => getFrequency(c.pin, frequencyMap));
  const maxFrequency = Math.max(...frequencies);

  // Compute composite scores
  const compositeCandidates = candidates.map((c, i) => {
    // Normalize heatmap (safe div by 0 check)
    const normHeatmap = maxHeatmapScore > 0 ? c.score / maxHeatmapScore : 0;
    
    // Normalize frequency
    const rawFreq = frequencies[i];
    const normFreq = normalizeFrequency(rawFreq, maxFrequency);

    // Composite
    const compositeScore = (normHeatmap * weightHeatmap) + (normFreq * weightFrequency);

    return {
      pin: c.pin,
      score: compositeScore
    };
  });

  // Sort descending
  return compositeCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
