import { useState, useEffect } from 'react';
import { TapGrid } from './components/TapGrid';
import { TapIndicator } from './components/TapIndicator';
import { ResultsPanel } from './components/ResultsPanel';
import { WeightSlider } from './components/WeightSlider';
import { SessionHistory } from './components/SessionHistory';
import { useTapCapture } from './hooks/useTapCapture';
import { useAnalysis } from './hooks/useAnalysis';
import { AnalysisResult, PinCandidate } from './types';

function App() {
  const { taps, addTap, reset: resetTaps, isComplete } = useTapCapture();
  const { analyze, isAnalyzing, error } = useAnalysis();
  
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [heatmapWeight, setHeatmapWeight] = useState(0.5);
  const [history, setHistory] = useState<Array<{ id: number; timestamp: Date; topCandidate: PinCandidate }>>([]);

  // Auto-analyze when taps complete
  useEffect(() => {
    if (isComplete && !results) {
      runAnalysis(heatmapWeight);
    }
  }, [isComplete]);

  // Re-run analysis if weights change and we already have results
  useEffect(() => {
    if (results && isComplete) {
      runAnalysis(heatmapWeight);
    }
  }, [heatmapWeight]);

  const runAnalysis = async (weight: number) => {
    const res = await analyze(taps, weight);
    if (res) {
      setResults(res);
      // Only add to history if it's a fresh analysis (not just weight adjustment)
      // Determining "fresh" is tricky with effects. Simplification: Just update current view.
      // History should probably be added only on first completion.
    }
  };

  // Add to history only once when results first arrive
  useEffect(() => {
    if (results && history.every(h => h.topCandidate.pin !== results.compositeRanking[0].pin)) {
        // This is a naive check to avoid dupes on weight slide
        // Better logic: track session ID
    }
  }, [results]);
  
  const handleReset = () => {
    // Save to history before resetting if we have a result
    if (results && results.compositeRanking.length > 0) {
      setHistory(prev => [{
        id: Date.now(),
        timestamp: new Date(),
        topCandidate: results.compositeRanking[0]
      }, ...prev]);
    }
    
    resetTaps();
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-white pb-20">
      
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            PatternRecon
          </h1>
          <div className="text-xs font-mono text-slate-500">v0.1.0</div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* State: Capture */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {isComplete ? 'Pattern Captured' : 'Enter Pattern'}
            </h2>
            <div className="text-xs font-mono text-cyan-400">
              {taps.length} / 4
            </div>
          </div>

          <div className="relative">
            <TapGrid onTap={addTap} isActive={!isComplete && !isAnalyzing}>
              {taps.map((p, i) => (
                <TapIndicator key={i} point={p} index={i} />
              ))}
            </TapGrid>
            
            {/* Overlay for loading/complete state */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="animate-pulse text-cyan-400 font-mono">Analyzing...</div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
             <button
              onClick={handleReset}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                isComplete 
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {isComplete ? 'New Pattern' : 'Reset'}
            </button>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
            Error: {error}
          </div>
        )}

        {/* State: Results */}
        {results && (
          <section className="space-y-6 animate-slide-up">
            <WeightSlider 
              heatmapWeight={heatmapWeight} 
              onChange={setHeatmapWeight} 
            />
            
            <ResultsPanel 
              results={results} 
              heatmapWeight={heatmapWeight}
              frequencyWeight={1 - heatmapWeight}
            />
          </section>
        )}

        <SessionHistory history={history} />
      </main>
    </div>
  );
}

export default App;
