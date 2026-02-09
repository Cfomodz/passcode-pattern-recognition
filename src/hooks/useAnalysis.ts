import { useState, useCallback } from 'react';
import type { TapPoint, AnalysisResult } from '../types';
import { normalizeTaps } from '../lib/normalize';
import { getDigitProbabilities } from '../lib/heatmap';
import { generateCandidates } from '../lib/candidates';
import { rankByComposite, rankByFilteredFrequency } from '../lib/composite';
import { loadFrequencyData } from '../data/pin-frequency';

export function useAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    taps: TapPoint[], 
    heatmapWeight: number
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Load Data
      const freqMap = await loadFrequencyData();

      // 2. Normalize
      const normalized = normalizeTaps(taps);

      // 3. Heatmap
      const tapAnalyses = normalized.map((tap, index) => ({
        position: index,
        probabilities: getDigitProbabilities(tap)
      }));

      // 4. Candidates (Spatial only first)
      const heatmapCandidates = generateCandidates(tapAnalyses);

      // 5. Composite Rankings
      const compositeRanking = rankByComposite(
        heatmapCandidates,
        freqMap,
        heatmapWeight
      );

      const frequencyRanking = rankByFilteredFrequency(
        heatmapCandidates,
        freqMap
      );

      return {
        heatmapRanking: heatmapCandidates, // Raw spatial ranking
        frequencyRanking,
        compositeRanking
      };

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, isAnalyzing, error };
}
