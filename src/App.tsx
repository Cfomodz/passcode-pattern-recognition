import { useState, useEffect, useCallback, useRef } from 'react';
import { TapGrid } from './components/TapGrid';
import { TapIndicator } from './components/TapIndicator';
import { ResultsPanel } from './components/ResultsPanel';
import { WeightSlider } from './components/WeightSlider';
import { SessionHistory } from './components/SessionHistory';
import { useTapCapture } from './hooks/useTapCapture';
import { useAnalysis } from './hooks/useAnalysis';
import type { AnalysisResult, PinCandidate } from './types';

function App() {
  const { taps, gridBounds, addTap, reset: resetTaps, isComplete } = useTapCapture();
  const { analyze, isAnalyzing, error } = useAnalysis();
  const resultsRef = useRef<HTMLElement>(null);

  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [heatmapWeight, setHeatmapWeight] = useState(0.5);
  const [history, setHistory] = useState<Array<{ id: number; timestamp: Date; topCandidate: PinCandidate }>>([]);

  const runAnalysis = useCallback(async (weight: number) => {
    const res = await analyze(taps, weight, gridBounds);
    if (res) {
      setResults(res);
    }
  }, [analyze, taps, gridBounds]);

  // Auto-analyze when taps complete
  useEffect(() => {
    if (isComplete && !results) {
      runAnalysis(heatmapWeight);
    }
  }, [isComplete, results, heatmapWeight, runAnalysis]);

  // Scroll to results when they appear
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  // Re-run analysis if weights change and we already have results
  useEffect(() => {
    if (results && isComplete) {
      runAnalysis(heatmapWeight);
    }
    // Only re-trigger on weight change, not on results/isComplete/runAnalysis updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapWeight]);

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
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Cfomodz/passcode-pattern-recognition"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="View source on GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
            <div className="text-xs font-mono text-slate-500">v0.1.0</div>
          </div>
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
          <section ref={resultsRef} className="space-y-6 animate-slide-up">
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
