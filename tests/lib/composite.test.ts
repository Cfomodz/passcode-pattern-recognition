import { describe, it, expect } from 'vitest';
import { rankByFilteredFrequency, rankByComposite } from '../../src/lib/composite';
import type { PinCandidate } from '../../src/types';

describe('Composite Scoring', () => {
  // Mock data
  const mockCandidates: PinCandidate[] = [
    { pin: '1111', score: 0.9 }, // High heatmap, Low freq
    { pin: '2222', score: 0.8 }, // High heatmap, Medium freq
    { pin: '3333', score: 0.5 }, // Med heatmap, High freq
    { pin: '4444', score: 0.1 }, // Low heatmap, Very High freq
  ];

  const mockFrequencyMap = new Map<string, number>([
    ['1111', 10],
    ['2222', 50],
    ['3333', 100],
    ['4444', 1000],
  ]);

  describe('rankByFilteredFrequency', () => {
    it('filters top % of heatmap candidates then sorts by frequency', () => {
      // Top 50% of 4 candidates = top 2 ('1111', '2222')
      // Frequencies: '1111': 10, '2222': 50
      // Expected order: '2222', '1111'
      
      const ranked = rankByFilteredFrequency(mockCandidates, mockFrequencyMap, 0.5);
      
      expect(ranked).toHaveLength(2);
      expect(ranked[0].pin).toBe('2222');
      expect(ranked[1].pin).toBe('1111');
    });

    it('ignores high frequency items if they are not in the top % heatmap', () => {
      // '4444' has huge frequency (1000) but lowest heatmap score (0.1)
      // With 50% filter, it should be excluded
      
      const ranked = rankByFilteredFrequency(mockCandidates, mockFrequencyMap, 0.5);
      const pins = ranked.map(c => c.pin);
      
      expect(pins).not.toContain('4444');
    });
  });

  describe('rankByComposite', () => {
    it('weights (1.0, 0.0) produces same ranking as heatmap only', () => {
      const ranked = rankByComposite(mockCandidates, mockFrequencyMap, 1.0);
      
      expect(ranked[0].pin).toBe('1111');
      expect(ranked[1].pin).toBe('2222');
      expect(ranked[2].pin).toBe('3333');
      expect(ranked[3].pin).toBe('4444');
    });

    it('weights (0.0, 1.0) produces frequency-only ranking', () => {
      const ranked = rankByComposite(mockCandidates, mockFrequencyMap, 0.0);
      
      // Expected freq order: 4444 (1000) > 3333 (100) > 2222 (50) > 1111 (10)
      expect(ranked[0].pin).toBe('4444');
      expect(ranked[1].pin).toBe('3333');
      expect(ranked[2].pin).toBe('2222');
      expect(ranked[3].pin).toBe('1111');
    });

    it('high-frequency PIN overtakes low-frequency PIN when frequency weight is high', () => {
      // '3333' (score 0.5, freq 100) vs '2222' (score 0.8, freq 50)
      // Max heatmap: 0.9. Max freq: 1000.
      
      // Normalized values:
      // '2222': H=0.8/0.9=0.88, F=50/1000=0.05
      // '3333': H=0.5/0.9=0.55, F=100/1000=0.10
      
      // If we weight frequency heavily, say wH=0.1 (wF=0.9)
      // '2222': (0.88*0.1) + (0.05*0.9) = 0.088 + 0.045 = 0.133
      // '3333': (0.55*0.1) + (0.10*0.9) = 0.055 + 0.090 = 0.145
      // 3333 should win
      
      const ranked = rankByComposite(mockCandidates, mockFrequencyMap, 0.1);
      
      const idx2222 = ranked.findIndex(c => c.pin === '2222');
      const idx3333 = ranked.findIndex(c => c.pin === '3333');
      
      expect(idx3333).toBeLessThan(idx2222);
    });

    it('proportional frequency (9x count -> 9x frequency weight)', () => {
        // This tests that we are using linear normalization, not rank-based
        const candidates: PinCandidate[] = [
            { pin: 'A', score: 1.0 },
            { pin: 'B', score: 1.0 } // Same heatmap score
        ];
        const freqMap = new Map([
            ['A', 900],
            ['B', 100]
        ]);
        
        // Max freq = 900.
        // Norm A = 1.0. Norm B = 0.11.
        // Ratio is ~9.
        
        // If we use pure frequency (wH=0), score A should be ~9x score B
        const ranked = rankByComposite(candidates, freqMap, 0.0);
        
        const scoreA = ranked.find(c => c.pin === 'A')!.score;
        const scoreB = ranked.find(c => c.pin === 'B')!.score;
        
        expect(scoreA).toBeCloseTo(1.0);
        expect(scoreB).toBeCloseTo(100/900);
        expect(scoreA / scoreB).toBeCloseTo(9.0);
    });
  });
});
