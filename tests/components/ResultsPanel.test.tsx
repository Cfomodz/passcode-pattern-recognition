import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsPanel } from '../../src/components/ResultsPanel';
import { AnalysisResult } from '../../src/types';

describe('ResultsPanel', () => {
  const mockResults: AnalysisResult = {
    heatmapRanking: [{ pin: '1234', score: 0.9 }],
    frequencyRanking: [{ pin: '1111', score: 500 }],
    compositeRanking: [{ pin: '0000', score: 0.85 }]
  };

  it('renders composite list by default', () => {
    render(<ResultsPanel results={mockResults} heatmapWeight={0.5} frequencyWeight={0.5} />);
    
    expect(screen.getByText('Composite Ranking')).toBeInTheDocument();
    expect(screen.getByText('0000')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(<ResultsPanel results={mockResults} heatmapWeight={0.5} frequencyWeight={0.5} />);
    
    const spatialTab = screen.getByText('Spatial');
    fireEvent.click(spatialTab);
    
    expect(await screen.findByText('Spatial Heatmap')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('displays scores correctly', () => {
    render(<ResultsPanel results={mockResults} heatmapWeight={0.5} frequencyWeight={0.5} />);
    
    // 0.85 * 100 = 85.0%
    expect(screen.getByText('85.0%')).toBeInTheDocument();
  });
});
