import React from 'react';
import { PinCandidate, AnalysisResult } from '../types';

interface ResultsPanelProps {
  results: AnalysisResult;
  heatmapWeight: number;
  frequencyWeight: number;
}

const ScoreBadge: React.FC<{ score: number; type: 'percent' | 'raw' }> = ({ score, type }) => {
  const formatted = type === 'percent' 
    ? `${(score * 100).toFixed(1)}%`
    : score.toFixed(0);
    
  let color = 'bg-slate-700 text-slate-300';
  if (type === 'percent') {
    if (score > 0.1) color = 'bg-green-900 text-green-300';
    else if (score > 0.01) color = 'bg-yellow-900 text-yellow-300';
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${color} font-mono`}>
      {formatted}
    </span>
  );
};

const CandidateList: React.FC<{ 
  title: string; 
  candidates: PinCandidate[]; 
  scoreType: 'percent' | 'raw';
  description: string;
}> = ({ title, candidates, scoreType, description }) => (
  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div className="mb-3">
      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </div>
    
    <div className="space-y-2">
      {candidates.slice(0, 10).map((c, i) => (
        <div key={c.pin} className="flex items-center justify-between bg-slate-700/30 p-2 rounded hover:bg-slate-700/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-mono w-4 text-right">{i + 1}</span>
            <span className="text-lg font-mono font-bold text-white tracking-widest">{c.pin}</span>
          </div>
          <ScoreBadge score={c.score} type={scoreType} />
        </div>
      ))}
      {candidates.length === 0 && (
        <div className="text-center text-slate-500 py-4 italic text-sm">
          No candidates found
        </div>
      )}
    </div>
  </div>
);

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, heatmapWeight, frequencyWeight }) => {
  const [activeTab, setActiveTab] = React.useState<'composite' | 'spatial' | 'frequency'>('composite');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
        {[
          { id: 'composite', label: 'Composite' },
          { id: 'spatial', label: 'Spatial' },
          { id: 'frequency', label: 'Frequency' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id 
                ? 'bg-cyan-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'composite' && (
          <CandidateList 
            title="Composite Ranking" 
            candidates={results.compositeRanking}
            scoreType="percent"
            description={`Weighted blend: ${(heatmapWeight * 100).toFixed(0)}% Spatial + ${(frequencyWeight * 100).toFixed(0)}% Frequency`}
          />
        )}
        
        {activeTab === 'spatial' && (
          <CandidateList 
            title="Spatial Heatmap" 
            candidates={results.heatmapRanking}
            scoreType="percent"
            description="Based purely on tap position relative to key centers"
          />
        )}

        {activeTab === 'frequency' && (
          <CandidateList 
            title="Frequency Filtered" 
            candidates={results.frequencyRanking}
            scoreType="raw"
            description="Top spatial matches re-sorted by real-world popularity"
          />
        )}
      </div>
    </div>
  );
};
