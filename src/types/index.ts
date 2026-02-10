export interface TapPoint {
  x: number;
  y: number;
}

export interface GridBounds {
  readonly width: number;
  readonly height: number;
}

export interface NormalizedTap {
  x: number;
  y: number;
}

export interface DigitProbability {
  digit: number;
  p: number;
}

export interface TapAnalysis {
  position: number;
  probabilities: DigitProbability[];
}

export interface PinCandidate {
  pin: string;
  score: number;
}

export interface AnalysisResult {
  heatmapRanking: PinCandidate[];
  frequencyRanking: PinCandidate[];
  compositeRanking: PinCandidate[];
}
