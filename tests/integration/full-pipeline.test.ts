import { describe, it, expect } from 'vitest';
import type { TapPoint, TapAnalysis } from '../../src/types';
import { normalizeTaps } from '../../src/lib/normalize';
import { getDigitProbabilities } from '../../src/lib/heatmap';
import { generateCandidates, rankByHeatmap } from '../../src/lib/candidates';
import { rankByComposite, rankByFilteredFrequency } from '../../src/lib/composite';

/**
 * Integration test for the full analysis pipeline.
 *
 * Simulates what useAnalysis does: normalize → heatmap → candidates → rankings.
 * Uses a mock frequency map to avoid CSV loading in tests.
 */

// Build a frequency map where common PINs have high counts
function buildMockFrequencyMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < 10000; i++) {
    const pin = i.toString().padStart(4, '0');
    // Make "1234" extremely common, "1111" next, then decrease
    if (pin === '1234') map.set(pin, 10000);
    else if (pin === '1111') map.set(pin, 8000);
    else if (pin === '0000') map.set(pin, 7000);
    else if (pin === '1212') map.set(pin, 6000);
    else if (pin === '7777') map.set(pin, 5000);
    else map.set(pin, Math.max(1, 100 - i));
  }
  return map;
}

/**
 * Runs the full analysis pipeline (same logic as useAnalysis hook).
 */
function runPipeline(
  taps: TapPoint[],
  frequencyMap: Map<string, number>,
  heatmapWeight: number = 0.5
) {
  // 1. Normalize
  const normalized = normalizeTaps(taps);

  // 2. Heatmap probabilities per position
  const tapAnalyses: TapAnalysis[] = normalized.map((tap, index) => ({
    position: index,
    probabilities: getDigitProbabilities(tap)
  }));

  // 3. Generate candidates
  const heatmapCandidates = generateCandidates(tapAnalyses);

  // 4. Three rankings
  const heatmapRanking = rankByHeatmap(heatmapCandidates, 10);
  const frequencyRanking = rankByFilteredFrequency(heatmapCandidates, frequencyMap);
  const compositeRanking = rankByComposite(heatmapCandidates, frequencyMap, heatmapWeight);

  return {
    heatmapRanking,
    frequencyRanking,
    compositeRanking,
    allCandidates: heatmapCandidates,
    tapAnalyses,
    normalized
  };
}

describe('Full Pipeline Integration', () => {
  const frequencyMap = buildMockFrequencyMap();

  describe('known 4-tap input produces expected results', () => {
    // Simulate tapping in upper-left, upper-right, lower-left, lower-right
    // on a 300x400 grid (matching keypad aspect ratio 0.75)
    // This should map to digits: 1, 3, 7, 9
    const cornerTaps: TapPoint[] = [
      { x: 10, y: 10 },    // upper-left → digit 1
      { x: 290, y: 10 },   // upper-right → digit 3
      { x: 10, y: 390 },   // lower-left → digit 7
      { x: 290, y: 390 },  // lower-right → digit 9
    ];

    it('should produce "1379" as the top heatmap candidate for corner taps', () => {
      const result = runPipeline(cornerTaps, frequencyMap);
      expect(result.heatmapRanking[0].pin).toBe('1379');
    });

    it('should normalize corner taps to near-corner positions in [0,1] space', () => {
      const result = runPipeline(cornerTaps, frequencyMap);

      // Upper-left should be near (0, 0)
      expect(result.normalized[0].x).toBeLessThan(0.1);
      expect(result.normalized[0].y).toBeLessThan(0.1);

      // Lower-right should be near (1, 1)
      expect(result.normalized[3].x).toBeGreaterThan(0.9);
      expect(result.normalized[3].y).toBeGreaterThan(0.9);
    });

    it('should assign digit 1 highest probability for upper-left tap', () => {
      const result = runPipeline(cornerTaps, frequencyMap);
      expect(result.tapAnalyses[0].probabilities[0].digit).toBe(1);
    });

    it('should assign digit 9 highest probability for lower-right tap', () => {
      const result = runPipeline(cornerTaps, frequencyMap);
      expect(result.tapAnalyses[3].probabilities[0].digit).toBe(9);
    });
  });

  describe('center-column taps map to center digits', () => {
    // Simulate tapping in center column: 2, 5, 8, 0
    // Taps at horizontal center, at 4 vertical positions
    const centerTaps: TapPoint[] = [
      { x: 150, y: 25 },   // center-top → digit 2
      { x: 150, y: 150 },  // center-middle → digit 5
      { x: 150, y: 275 },  // center-lower → digit 8
      { x: 150, y: 375 },  // center-bottom → digit 0
    ];

    it('should produce "2580" as the top heatmap candidate', () => {
      const result = runPipeline(centerTaps, frequencyMap);
      expect(result.heatmapRanking[0].pin).toBe('2580');
    });
  });

  describe('all three ranking lists have correct structure', () => {
    const taps: TapPoint[] = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 50, y: 200 },
      { x: 150, y: 200 },
    ];

    it('should have exactly 10 entries in each ranking list', () => {
      const result = runPipeline(taps, frequencyMap);

      expect(result.heatmapRanking).toHaveLength(10);
      expect(result.frequencyRanking).toHaveLength(10);
      expect(result.compositeRanking).toHaveLength(10);
    });

    it('should produce valid 4-digit PINs in all lists', () => {
      const result = runPipeline(taps, frequencyMap);

      const allPins = [
        ...result.heatmapRanking,
        ...result.frequencyRanking,
        ...result.compositeRanking
      ];

      for (const candidate of allPins) {
        expect(candidate.pin).toMatch(/^\d{4}$/);
        expect(candidate.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have heatmap results sorted descending by score', () => {
      const result = runPipeline(taps, frequencyMap);

      for (let i = 0; i < result.heatmapRanking.length - 1; i++) {
        expect(result.heatmapRanking[i].score).toBeGreaterThanOrEqual(
          result.heatmapRanking[i + 1].score
        );
      }
    });

    it('should have composite results sorted descending by score', () => {
      const result = runPipeline(taps, frequencyMap);

      for (let i = 0; i < result.compositeRanking.length - 1; i++) {
        expect(result.compositeRanking[i].score).toBeGreaterThanOrEqual(
          result.compositeRanking[i + 1].score
        );
      }
    });

    it('should have frequency results sorted descending by score', () => {
      const result = runPipeline(taps, frequencyMap);

      for (let i = 0; i < result.frequencyRanking.length - 1; i++) {
        expect(result.frequencyRanking[i].score).toBeGreaterThanOrEqual(
          result.frequencyRanking[i + 1].score
        );
      }
    });
  });

  describe('weight slider extremes match pure rankings', () => {
    const taps: TapPoint[] = [
      { x: 50, y: 50 },
      { x: 250, y: 50 },
      { x: 50, y: 350 },
      { x: 250, y: 350 },
    ];

    it('should produce heatmap-only ranking when heatmapWeight is 1.0', () => {
      const result = runPipeline(taps, frequencyMap, 1.0);

      // With weight=1.0, composite should rank same as heatmap
      const compositePins = result.compositeRanking.map(c => c.pin);
      const heatmapPins = result.heatmapRanking.map(c => c.pin);

      expect(compositePins).toEqual(heatmapPins);
    });

    it('should favor high-frequency PINs when heatmapWeight is 0.0', () => {
      const result = runPipeline(taps, frequencyMap, 0.0);

      // With weight=0.0, the most common PINs among candidates should rise to the top.
      // "1234" has freq 10000 — if it's a candidate, it should be #1 composite.
      // If not a candidate, the highest-frequency candidate should be first.
      const topComposite = result.compositeRanking[0];
      const topFreq = frequencyMap.get(topComposite.pin) ?? 0;

      // The top composite candidate should have a higher frequency than most other candidates
      for (let i = 1; i < result.compositeRanking.length; i++) {
        const freq = frequencyMap.get(result.compositeRanking[i].pin) ?? 0;
        expect(topFreq).toBeGreaterThanOrEqual(freq);
      }
    });

    it('should produce different composite scores when weight changes', () => {
      const halfWeight = runPipeline(taps, frequencyMap, 0.5);
      const pureHeatmap = runPipeline(taps, frequencyMap, 1.0);

      // With different weights, the composite scores should differ
      const halfScores = halfWeight.compositeRanking.map(c => c.score);
      const pureScores = pureHeatmap.compositeRanking.map(c => c.score);

      // At least some scores should differ between the two weight settings
      const anyDifferent = halfScores.some((score, i) =>
        Math.abs(score - pureScores[i]) > 0.001
      );
      expect(anyDifferent).toBe(true);
    });
  });

  describe('candidate generation properties', () => {
    const taps: TapPoint[] = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 50, y: 200 },
      { x: 150, y: 200 },
    ];

    it('should generate exactly topK^4 candidates (default 256)', () => {
      const result = runPipeline(taps, frequencyMap);
      expect(result.allCandidates).toHaveLength(256); // 4^4
    });

    it('should have heatmap probabilities that sum to 1.0 for each position', () => {
      const result = runPipeline(taps, frequencyMap);

      for (const analysis of result.tapAnalyses) {
        const sum = analysis.probabilities.reduce((acc, p) => acc + p.p, 0);
        expect(sum).toBeCloseTo(1.0);
      }
    });

    it('should produce candidate scores as products of digit probabilities', () => {
      const result = runPipeline(taps, frequencyMap);
      const topCandidate = result.allCandidates[0];

      // Verify score is the product of top-digit probabilities per position
      let expectedScore = 1.0;
      for (let pos = 0; pos < 4; pos++) {
        const digit = parseInt(topCandidate.pin[pos], 10);
        const prob = result.tapAnalyses[pos].probabilities.find(p => p.digit === digit);
        expect(prob).toBeDefined();
        expectedScore *= prob!.p;
      }

      expect(topCandidate.score).toBeCloseTo(expectedScore);
    });
  });

  describe('degenerate input handling', () => {
    it('should handle all taps in the same spot gracefully', () => {
      const sameTaps: TapPoint[] = [
        { x: 200, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 200 },
      ];

      const result = runPipeline(sameTaps, frequencyMap);

      // Should still produce valid results
      expect(result.heatmapRanking).toHaveLength(10);
      expect(result.compositeRanking).toHaveLength(10);
      expect(result.frequencyRanking).toHaveLength(10);

      // All taps map to center → digit 5 should be most likely for each
      // So top PIN should be "5555"
      expect(result.heatmapRanking[0].pin).toBe('5555');
    });

    it('should handle taps in a horizontal line', () => {
      const lineTaps: TapPoint[] = [
        { x: 0, y: 200 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 300, y: 200 },
      ];

      const result = runPipeline(lineTaps, frequencyMap);

      expect(result.heatmapRanking).toHaveLength(10);
      expect(result.compositeRanking).toHaveLength(10);

      // All PINs should be valid
      for (const c of result.heatmapRanking) {
        expect(c.pin).toMatch(/^\d{4}$/);
      }
    });

    it('should handle taps in a vertical line', () => {
      const lineTaps: TapPoint[] = [
        { x: 150, y: 0 },
        { x: 150, y: 133 },
        { x: 150, y: 266 },
        { x: 150, y: 400 },
      ];

      const result = runPipeline(lineTaps, frequencyMap);

      expect(result.heatmapRanking).toHaveLength(10);
      expect(result.compositeRanking).toHaveLength(10);
    });
  });
});
