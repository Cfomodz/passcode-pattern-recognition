import { describe, it, expect } from 'vitest';
import { normalizeTaps } from '../../src/lib/normalize';
import type { TapPoint, GridBounds } from '../../src/types';

describe('Normalization Logic', () => {
  it('normalizes taps spanning full screen to [0,1]', () => {
    // Aspect ratio 0.75 means 300x400 is perfect fit
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 300, y: 400 }
    ];
    const normalized = normalizeTaps(taps);
    
    expect(normalized[0].x).toBeCloseTo(0);
    expect(normalized[0].y).toBeCloseTo(0);
    expect(normalized[1].x).toBeCloseTo(1);
    expect(normalized[1].y).toBeCloseTo(1);
  });

  it('handles single-point degenerate case (maps to center)', () => {
    const taps: TapPoint[] = [
      { x: 100, y: 100 },
      { x: 100, y: 100 }
    ];
    const normalized = normalizeTaps(taps);
    expect(normalized[0]).toEqual({ x: 0.5, y: 0.5 });
    expect(normalized[1]).toEqual({ x: 0.5, y: 0.5 });
  });

  it('pads height when input is too wide (preserve aspect ratio)', () => {
    // 300x300 square input (ratio 1.0 > 0.75)
    // Should pad height. Width stays 300. Target height = 300 / 0.75 = 400.
    // Original height 300 centered in 400.
    // Top (0) becomes (0 - (-50)) / 400 = 50/400 = 0.125
    // Bottom (300) becomes (300 - (-50)) / 400 = 350/400 = 0.875
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 300, y: 300 }
    ];
    const normalized = normalizeTaps(taps);
    
    expect(normalized[0].x).toBeCloseTo(0); // Width fills space
    expect(normalized[1].x).toBeCloseTo(1);
    
    expect(normalized[0].y).toBeCloseTo(0.125); // Height padded
    expect(normalized[1].y).toBeCloseTo(0.875);
  });

  it('pads width when input is too tall (preserve aspect ratio)', () => {
    // 150x400 input (ratio 0.375 < 0.75)
    // Should pad width. Height stays 400. Target width = 400 * 0.75 = 300.
    // Original width 150 centered in 300.
    // Left (0) becomes (0 - (-75)) / 300 = 0.25
    // Right (150) becomes (150 - (-75)) / 300 = 0.75
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 150, y: 400 }
    ];
    const normalized = normalizeTaps(taps);
    
    expect(normalized[0].y).toBeCloseTo(0); // Height fills space
    expect(normalized[1].y).toBeCloseTo(1);
    
    expect(normalized[0].x).toBeCloseTo(0.25); // Width padded
    expect(normalized[1].x).toBeCloseTo(0.75);
  });

  it('handles vertical line degenerate case', () => {
    // Vertical line at x=100, y=0 to 400
    // Width 0, Height 400.
    // Should set width to 10% of height = 40.
    // Then aspect ratio check: 40/400 = 0.1 < 0.75.
    // Pad width to 400 * 0.75 = 300.
    // Center of line is 100.
    // Normalized x should be 0.5 (since it's centered).
    const taps: TapPoint[] = [
      { x: 100, y: 0 },
      { x: 100, y: 400 }
    ];
    const normalized = normalizeTaps(taps);
    
    expect(normalized[0].x).toBeCloseTo(0.5);
    expect(normalized[1].x).toBeCloseTo(0.5);
    expect(normalized[0].y).toBeCloseTo(0);
    expect(normalized[1].y).toBeCloseTo(1);
  });

  it('handles horizontal line degenerate case', () => {
    // Horizontal line at y=100, x=0 to 300
    // Width 300, Height 0.
    // Should set height to 10% of width = 30.
    // Aspect ratio check: 300/30 = 10 > 0.75.
    // Pad height to 300 / 0.75 = 400.
    // Center y is 100.
    // Normalized y should be 0.5.
    const taps: TapPoint[] = [
      { x: 0, y: 100 },
      { x: 300, y: 100 }
    ];
    const normalized = normalizeTaps(taps);
    
    expect(normalized[0].y).toBeCloseTo(0.5);
    expect(normalized[1].y).toBeCloseTo(0.5);
    expect(normalized[0].x).toBeCloseTo(0);
    expect(normalized[1].x).toBeCloseTo(1);
  });
  
  it('correctly normalizes the worked example from docs', () => {
      // T1 = (80, 100)
      // T2 = (280, 100)
      // T3 = (120, 350)
      // T4 = (300, 350)
      // Bounding box: x=[80,300], y=[100,350] -> w=220, h=250
      // Aspect ratio: 0.88 > 0.75 -> pad height
      // Target height = 220 / 0.75 = 293.333
      // Adjusted y min = 100 - (293.333 - 250)/2 = 100 - 21.666 = 78.333
      
      const taps: TapPoint[] = [
          { x: 80, y: 100 },
          { x: 280, y: 100 },
          { x: 120, y: 350 },
          { x: 300, y: 350 }
      ];
      
      const normalized = normalizeTaps(taps);
      
      // N1: (80-80)/220 = 0, (100-78.333)/293.333 = 0.0738
      expect(normalized[0].x).toBeCloseTo(0.0, 3);
      expect(normalized[0].y).toBeCloseTo(0.074, 3);
      
      // N2: (280-80)/220 = 0.909
      expect(normalized[1].x).toBeCloseTo(0.909, 3);
      expect(normalized[1].y).toBeCloseTo(0.074, 3);
      
      // N3: (120-80)/220 = 0.182, (350-78.333)/293.333 = 0.926
      expect(normalized[2].x).toBeCloseTo(0.182, 3);
      expect(normalized[2].y).toBeCloseTo(0.926, 3);
      
      // N4: (300-80)/220 = 1.0
      expect(normalized[3].x).toBeCloseTo(1.0, 3);
      expect(normalized[3].y).toBeCloseTo(0.926, 3);
  });
});

describe('Grid-relative Normalization', () => {
  const grid: GridBounds = { width: 375, height: 500 };

  it('normalizes taps relative to grid dimensions', () => {
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 375, y: 500 }
    ];
    const normalized = normalizeTaps(taps, grid);

    expect(normalized[0].x).toBeCloseTo(0);
    expect(normalized[0].y).toBeCloseTo(0);
    expect(normalized[1].x).toBeCloseTo(1);
    expect(normalized[1].y).toBeCloseTo(1);
  });

  it('preserves absolute position within the grid', () => {
    // Tap at the center of the grid
    const taps: TapPoint[] = [
      { x: 187.5, y: 250 }
    ];
    const normalized = normalizeTaps(taps, grid);

    expect(normalized[0].x).toBeCloseTo(0.5);
    expect(normalized[0].y).toBeCloseTo(0.5);
  });

  it('should produce different results for 1235 vs 4568 patterns (issue #12)', () => {
    // KEY_CENTERS: 1=(1/6, 1/8), 2=(3/6, 1/8), 3=(5/6, 1/8), 5=(3/6, 3/8)
    //              4=(1/6, 3/8), 5=(3/6, 3/8), 6=(5/6, 3/8), 8=(3/6, 5/8)
    //
    // Simulate user tapping at proportional positions for each PIN

    // 1235: taps in upper region of grid
    const taps1235: TapPoint[] = [
      { x: grid.width * (1/6), y: grid.height * (1/8) },  // key 1
      { x: grid.width * (3/6), y: grid.height * (1/8) },  // key 2
      { x: grid.width * (5/6), y: grid.height * (1/8) },  // key 3
      { x: grid.width * (3/6), y: grid.height * (3/8) },  // key 5
    ];

    // 4568: taps in middle region of grid
    const taps4568: TapPoint[] = [
      { x: grid.width * (1/6), y: grid.height * (3/8) },  // key 4
      { x: grid.width * (3/6), y: grid.height * (3/8) },  // key 5
      { x: grid.width * (5/6), y: grid.height * (3/8) },  // key 6
      { x: grid.width * (3/6), y: grid.height * (5/8) },  // key 8
    ];

    const norm1235 = normalizeTaps(taps1235, grid);
    const norm4568 = normalizeTaps(taps4568, grid);

    // Y coordinates should be different: 1235 is in the upper region, 4568 in the middle
    // First tap Y: 1/8 = 0.125 for 1235, 3/8 = 0.375 for 4568
    expect(norm1235[0].y).toBeCloseTo(1/8);
    expect(norm4568[0].y).toBeCloseTo(3/8);
    expect(norm1235[0].y).not.toBeCloseTo(norm4568[0].y);

    // Last tap Y: 3/8 = 0.375 for 1235, 5/8 = 0.625 for 4568
    expect(norm1235[3].y).toBeCloseTo(3/8);
    expect(norm4568[3].y).toBeCloseTo(5/8);
    expect(norm1235[3].y).not.toBeCloseTo(norm4568[3].y);
  });

  it('falls back to bounding-box normalization when gridBounds is omitted', () => {
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 300, y: 400 }
    ];
    // Without gridBounds, should use legacy bounding-box behavior
    const normalized = normalizeTaps(taps);
    expect(normalized[0].x).toBeCloseTo(0);
    expect(normalized[0].y).toBeCloseTo(0);
    expect(normalized[1].x).toBeCloseTo(1);
    expect(normalized[1].y).toBeCloseTo(1);
  });

  it('falls back to bounding-box normalization when gridBounds has zero dimensions', () => {
    const taps: TapPoint[] = [
      { x: 0, y: 0 },
      { x: 300, y: 400 }
    ];
    const zeroBounds: GridBounds = { width: 0, height: 0 };
    const normalized = normalizeTaps(taps, zeroBounds);
    // Should use legacy bounding-box behavior
    expect(normalized[0].x).toBeCloseTo(0);
    expect(normalized[0].y).toBeCloseTo(0);
    expect(normalized[1].x).toBeCloseTo(1);
    expect(normalized[1].y).toBeCloseTo(1);
  });
});
