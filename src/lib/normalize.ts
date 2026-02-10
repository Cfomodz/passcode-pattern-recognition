import type { TapPoint, NormalizedTap, GridBounds } from '../types';
import { KEYPAD_ASPECT_RATIO } from './keypad';

/**
 * Normalizes a sequence of tap points to the [0, 1] coordinate space.
 *
 * When gridBounds is provided, normalizes relative to the grid dimensions,
 * preserving absolute tap position within the grid. This is the primary mode
 * used by the UI.
 *
 * When gridBounds is omitted, falls back to bounding-box normalization
 * (legacy behavior), which only preserves relative tap positions.
 */
export function normalizeTaps(taps: TapPoint[], gridBounds?: GridBounds): NormalizedTap[] {
  if (taps.length === 0) return [];

  // Grid-relative normalization: preserves absolute position
  if (gridBounds && gridBounds.width > 0 && gridBounds.height > 0) {
    return taps.map(tap => ({
      x: tap.x / gridBounds.width,
      y: tap.y / gridBounds.height
    }));
  }

  // Fallback: bounding-box normalization (legacy)
  return normalizeTapsByBoundingBox(taps);
}

/**
 * Legacy bounding-box normalization. Normalizes taps relative to their own
 * bounding box with aspect ratio correction. This loses absolute position
 * information — patterns with the same shape but different positions
 * (e.g., 1235 vs 4568) produce identical results.
 */
function normalizeTapsByBoundingBox(taps: TapPoint[]): NormalizedTap[] {
  // 1. Compute bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const tap of taps) {
    minX = Math.min(minX, tap.x);
    maxX = Math.max(maxX, tap.x);
    minY = Math.min(minY, tap.y);
    maxY = Math.max(maxY, tap.y);
  }

  let width = maxX - minX;
  let height = maxY - minY;

  // 2. Handle degenerate cases

  // All taps in same spot
  if (width === 0 && height === 0) {
    return taps.map(() => ({ x: 0.5, y: 0.5 }));
  }

  // Vertical line (width 0) or Horizontal line (height 0)
  // or very small dimensions relative to the other
  // "Apply a minimum dimension threshold: if either dimension < 10% of the other, clamp to 10%"

  // First handle absolute zeros to avoid division by zero or weird logic
  // If width is 0, the points are all on a vertical line at minX.
  // We want to expand the box to be centered on minX.
  if (width === 0) {
      const targetWidth = height * 0.1;
      minX = minX - targetWidth / 2;
      width = targetWidth;
  }

  if (height === 0) {
      const targetHeight = width * 0.1;
      minY = minY - targetHeight / 2;
      height = targetHeight;
  }

  // Now apply the 10% rule for non-zero but small dimensions
  if (width < height * 0.1) {
    const targetWidth = height * 0.1;
    const center = minX + width / 2;
    minX = center - targetWidth / 2;
    width = targetWidth;
  }

  if (height < width * 0.1) {
    const targetHeight = width * 0.1;
    const center = minY + height / 2;
    minY = center - targetHeight / 2;
    height = targetHeight;
  }

  // 3. Compute aspect ratio correction
  // Keypad aspect ratio = 0.75 (width / height)
  // We want the bounding box of the taps to map to a region with this aspect ratio

  const currentAspectRatio = width / height;

  let adjustedWidth = width;
  let adjustedHeight = height;
  let adjustedMinX = minX;
  let adjustedMinY = minY;

  if (currentAspectRatio > KEYPAD_ASPECT_RATIO) {
    // Too wide: pad height
    // targetHeight = width / 0.75
    const targetHeight = width / KEYPAD_ASPECT_RATIO;
    const padding = targetHeight - height;
    adjustedHeight = targetHeight;
    adjustedMinY = minY - padding / 2;
  } else {
    // Too tall: pad width
    // targetWidth = height * 0.75
    const targetWidth = height * KEYPAD_ASPECT_RATIO;
    const padding = targetWidth - width;
    adjustedWidth = targetWidth;
    adjustedMinX = minX - padding / 2;
  }

  // 4. Normalize to [0, 1]
  return taps.map(tap => ({
    x: (tap.x - adjustedMinX) / adjustedWidth,
    y: (tap.y - adjustedMinY) / adjustedHeight
  }));
}
