import { useState, useCallback } from 'react';
import type { TapPoint, GridBounds } from '../types';

interface UseTapCaptureResult {
  taps: TapPoint[];
  gridBounds: GridBounds | null;
  addTap: (point: TapPoint, gridBounds: GridBounds) => void;
  reset: () => void;
  isComplete: boolean;
  tapCount: number;
}

export function useTapCapture(maxTaps: number = 4): UseTapCaptureResult {
  const [taps, setTaps] = useState<TapPoint[]>([]);
  const [gridBounds, setGridBounds] = useState<GridBounds | null>(null);

  const addTap = useCallback((point: TapPoint, bounds: GridBounds) => {
    setTaps(prev => {
      if (prev.length >= maxTaps) return prev;
      return [...prev, point];
    });
    setGridBounds(bounds);
  }, [maxTaps]);

  const reset = useCallback(() => {
    setTaps([]);
    setGridBounds(null);
  }, []);

  return {
    taps,
    gridBounds,
    addTap,
    reset,
    isComplete: taps.length === maxTaps,
    tapCount: taps.length
  };
}
