import { describe, it, expect } from 'vitest';
import { getDigitProbabilities } from '../../src/lib/heatmap';

describe('Heatmap Logic', () => {
  it('probabilities sum to 1.0', () => {
    const tap = { x: 0.5, y: 0.5 };
    const probs = getDigitProbabilities(tap);
    const sum = probs.reduce((acc, curr) => acc + curr.p, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('upper-left tap (near 1) assigns highest probability to 1', () => {
    // Tap slightly offset from 1
    const tap = { x: 0.15, y: 0.15 }; 
    const probs = getDigitProbabilities(tap);
    
    expect(probs[0].digit).toBe(1);
    expect(probs[0].p).toBeGreaterThan(probs[1].p);
  });

  it('center tap assigns highest probability to 5', () => {
    const tap = { x: 0.5, y: 0.375 }; // Exact center of 5
    const probs = getDigitProbabilities(tap);
    
    expect(probs[0].digit).toBe(5);
    // Should be significantly higher than neighbors (prob is ~0.16)
    expect(probs[0].p).toBeGreaterThan(0.15); 
  });

  it('bottom-center tap assigns highest probability to 0', () => {
    const tap = { x: 0.5, y: 0.9 }; // Near 0
    const probs = getDigitProbabilities(tap);
    
    expect(probs[0].digit).toBe(0);
  });

  it('sigma parameter affects distribution spread', () => {
    const tap = { x: 0.5, y: 0.375 }; // Center of 5
    
    const sharpProbs = getDigitProbabilities(tap, 0.1); // Sharp
    const broadProbs = getDigitProbabilities(tap, 1.0); // Broad
    
    // Sharp distribution should have higher peak for 5
    const sharp5 = sharpProbs.find(p => p.digit === 5)!.p;
    const broad5 = broadProbs.find(p => p.digit === 5)!.p;
    
    expect(sharp5).toBeGreaterThan(broad5);
    
    // Broad distribution should have higher probability for distant keys (e.g., 9)
    const sharp9 = sharpProbs.find(p => p.digit === 9)!.p;
    const broad9 = broadProbs.find(p => p.digit === 9)!.p;
    
    expect(broad9).toBeGreaterThan(sharp9);
  });

  it('symmetry: mirrored positions produce mirrored probabilities', () => {
    // Tap left of center (near 4) vs Tap right of center (near 6)
    const leftTap = { x: 0.2, y: 0.375 };
    const rightTap = { x: 0.8, y: 0.375 };
    
    const leftProbs = getDigitProbabilities(leftTap);
    const rightProbs = getDigitProbabilities(rightTap);
    
    const p4_left = leftProbs.find(p => p.digit === 4)!.p;
    const p6_right = rightProbs.find(p => p.digit === 6)!.p;
    
    expect(p4_left).toBeCloseTo(p6_right);
  });

  it('matches example from docs', () => {
      // Tap at (0.2, 0.15)
      // Expected ordering: 1 > 4 > 2 > 5 > 7 > 3 > 8 > 6 > 0 > 9
      const tap = { x: 0.2, y: 0.15 };
      const probs = getDigitProbabilities(tap);
      
      const digits = probs.map(p => p.digit);
      
      // Check top 3 matches expectation
      expect(digits.slice(0, 3)).toEqual([1, 4, 2]);
      
      // Check last one is 9
      expect(digits[9]).toBe(9);
  });
});
