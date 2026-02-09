import { describe, it, expect } from 'vitest';
import { generateCandidates, rankByHeatmap } from '../../src/lib/candidates';
import { TapAnalysis } from '../../src/types';

describe('Candidate Generation', () => {
  // Helper to create mock analysis
  const createMockAnalysis = (position: number, topDigit: number): TapAnalysis => ({
    position,
    probabilities: [
      { digit: topDigit, p: 0.5 },
      { digit: (topDigit + 1) % 10, p: 0.3 },
      { digit: (topDigit + 2) % 10, p: 0.1 },
      { digit: (topDigit + 3) % 10, p: 0.05 },
      { digit: (topDigit + 4) % 10, p: 0.01 },
      // ... others negligible
    ]
  });

  const mockAnalyses: TapAnalysis[] = [
    createMockAnalysis(0, 1), // Top: 1
    createMockAnalysis(1, 2), // Top: 2
    createMockAnalysis(2, 3), // Top: 3
    createMockAnalysis(3, 4), // Top: 4
  ];

  it('generates expected number of candidates (topK^4)', () => {
    const topK = 2;
    const candidates = generateCandidates(mockAnalyses, topK);
    expect(candidates).toHaveLength(topK ** 4); // 2^4 = 16
  });

  it('all candidates are valid 4-digit PINs', () => {
    const candidates = generateCandidates(mockAnalyses, 2);
    candidates.forEach(c => {
      expect(c.pin).toMatch(/^\d{4}$/);
    });
  });

  it('scores are products of per-position probabilities', () => {
    const candidates = generateCandidates(mockAnalyses, 1); // Only top 1 per pos
    // Should be 1 candidate: "1234"
    // Score: 0.5 * 0.5 * 0.5 * 0.5 = 0.0625
    
    expect(candidates).toHaveLength(1);
    expect(candidates[0].pin).toBe('1234');
    expect(candidates[0].score).toBeCloseTo(0.5 * 0.5 * 0.5 * 0.5);
  });

  it('results are sorted descending by score', () => {
    const candidates = generateCandidates(mockAnalyses, 2);
    
    for (let i = 0; i < candidates.length - 1; i++) {
      expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score);
    }
  });

  it('top candidate matches the most likely digit per position', () => {
    const candidates = generateCandidates(mockAnalyses);
    expect(candidates[0].pin).toBe('1234');
  });

  it('rankByHeatmap limits results', () => {
    const candidates = generateCandidates(mockAnalyses, 2); // 16 candidates
    const ranked = rankByHeatmap(candidates, 5);
    expect(ranked).toHaveLength(5);
    expect(ranked[0].score).toBeGreaterThan(ranked[4].score);
  });

  it('returns empty list if input is not 4 positions', () => {
    const candidates = generateCandidates(mockAnalyses.slice(0, 3));
    expect(candidates).toHaveLength(0);
  });
});
