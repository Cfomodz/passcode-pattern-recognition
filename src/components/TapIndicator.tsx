import React, { useEffect, useState } from 'react';
import { TapPoint } from '../types';

interface TapIndicatorProps {
  point: TapPoint;
  index: number; // 0-based index
}

export const TapIndicator: React.FC<TapIndicatorProps> = ({ point, index }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger transition
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  return (
    <div
      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-200 font-bold pointer-events-none transition-all duration-300 ease-out ${
        isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
      }`}
      style={{
        left: point.x,
        top: point.y,
      }}
    >
      {index + 1}
    </div>
  );
};
