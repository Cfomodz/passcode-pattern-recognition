import React, { useRef, useEffect } from 'react';
import { TapPoint } from '../types';

interface TapGridProps {
  onTap: (point: TapPoint) => void;
  isActive: boolean;
  children?: React.ReactNode;
}

export const TapGrid: React.FC<TapGridProps> = ({ onTap, isActive, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive || !containerRef.current) return;
    
    // Prevent default to stop scrolling/zooming on mobile
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    onTap({ x, y });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Prevent default touch actions at the DOM level for better mobile support
    const preventDefault = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', preventDefault, { passive: false });
    
    return () => {
      el.removeEventListener('touchstart', preventDefault);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[60vh] md:h-[600px] bg-slate-900 overflow-hidden touch-none select-none border border-slate-700 rounded-lg shadow-inner cursor-crosshair"
      onPointerDown={handlePointerDown}
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}
      aria-label="Tap capture grid"
      role="button"
    >
      {/* Grid center lines for reference (subtle) */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-slate-700/30 pointer-events-none" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-slate-700/30 pointer-events-none" />
      
      {children}
    </div>
  );
};
