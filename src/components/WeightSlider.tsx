import React from 'react';

interface WeightSliderProps {
  heatmapWeight: number;
  onChange: (heatmapWeight: number) => void;
}

export const WeightSlider: React.FC<WeightSliderProps> = ({ heatmapWeight, onChange }) => {
  const frequencyWeight = 1 - heatmapWeight;

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
        <span>Frequency Bias</span>
        <span>Spatial Bias</span>
      </div>
      
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={heatmapWeight}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />

      <div className="flex justify-between text-xs font-mono text-slate-300">
        <span>{(frequencyWeight * 100).toFixed(0)}%</span>
        <span className="text-cyan-400">{(heatmapWeight * 100).toFixed(0)}%</span>
      </div>
      
      <p className="text-xs text-slate-500 text-center pt-1">
        Adjust balance between real-world stats and observed motion
      </p>
    </div>
  );
};
