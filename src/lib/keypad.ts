import { NormalizedTap } from '../types';

// Standard 3x4 keypad layout in normalized [0,1] coordinates
// Columns: 0.167, 0.500, 0.833 (centers of 1/3 widths)
// Rows: 0.125, 0.375, 0.625, 0.875 (centers of 1/4 heights)

export const KEYPAD_ASPECT_RATIO = 0.75; // 3 cols / 4 rows

export const KEY_CENTERS: Record<number, NormalizedTap> = {
  1: { x: 1/6, y: 1/8 },
  2: { x: 3/6, y: 1/8 },
  3: { x: 5/6, y: 1/8 },
  4: { x: 1/6, y: 3/8 },
  5: { x: 3/6, y: 3/8 },
  6: { x: 5/6, y: 3/8 },
  7: { x: 1/6, y: 5/8 },
  8: { x: 3/6, y: 5/8 },
  9: { x: 5/6, y: 5/8 },
  0: { x: 3/6, y: 7/8 },
};

// Helper to get center by digit
export function getKeyCenter(digit: number): NormalizedTap {
  return KEY_CENTERS[digit];
}
