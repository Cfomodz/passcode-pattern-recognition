import { useState, useCallback } from 'react';
import type { TapPoint } from '../types';

interface UseTapCaptureResult {
  taps: TapPoint[];
  addTap: (point: TapPoint) => void;
  reset: () => void;
  isComplete: boolean;
  tapCount: number;
}

export function useTapCapture(maxTaps: number = 4): UseTapCaptureResult {
  const [taps, setTaps] = useState<TapPoint[]>([]);

  const addTap = useCallback((point: TapPoint) => {
    setTaps(prev => {
      if (prev.length >= maxTaps) return prev;
      return [...prev, point];
    });
  }, [maxTaps]);

  const reset = useCallback(() => {
    setTaps([]);
  }, []);

  return {
    taps,
    addTap,
    reset,
    isComplete: taps.length === maxTaps,
    tapCount: taps.length
  };
}
