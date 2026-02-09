# TODO — Implementation Plan

## Phase 0: Project Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS
- [x] Configure Vitest + React Testing Library
- [x] Set up ESLint with TypeScript rules
- [x] Configure `tsconfig.json` with strict mode
- [x] Create `src/types/index.ts` with shared type definitions
- [x] Source and validate `pin-frequency.csv`, place in `public/data/`

## Phase 1: Data Layer
- [x] Implement `src/data/pin-frequency.ts` (CSV loader with validation + caching)
- [x] Implement `src/lib/frequency.ts` (lookup, normalization, ranking functions)
- [x] Write tests: `tests/lib/frequency.test.ts`
  - [x] Test: loads all 10,000 PINs
  - [x] Test: no duplicate PINs
  - [x] Test: all counts are positive integers
  - [x] Test: `getFrequency` returns correct count for known PINs
  - [x] Test: `normalizeFrequency` preserves proportional relationships
  - [x] Test: `rankByFrequency` returns descending order

## Phase 2: Core Algorithm
- [x] Implement `src/lib/keypad.ts` (key center coordinates)
- [x] Implement `src/lib/normalize.ts` (center + scale tap coordinates)
- [x] Write tests: `tests/lib/normalize.test.ts`
  - [x] Test: taps spanning full screen normalize to full [0,1] range
  - [x] Test: taps in small area expand to fill keypad space
  - [x] Test: single-point degenerate case → all map to center
  - [x] Test: horizontal line degenerate case → vertical padding applied
  - [x] Test: vertical line degenerate case → horizontal padding applied
  - [x] Test: aspect ratio correction preserves keypad proportions
- [x] Implement `src/lib/heatmap.ts` (Gaussian digit probabilities)
- [x] Write tests: `tests/lib/heatmap.test.ts`
  - [x] Test: probabilities sum to 1.0 for any tap position
  - [x] Test: upper-left tap → digit 1 has highest probability
  - [x] Test: center tap → digit 5 has highest probability
  - [x] Test: bottom-center tap → digit 0 has highest probability
  - [x] Test: sigma parameter affects distribution spread
  - [x] Test: symmetry — mirrored positions produce mirrored probabilities
- [x] Implement `src/lib/candidates.ts` (candidate generation + heatmap ranking)
- [x] Write tests: `tests/lib/candidates.test.ts`
  - [x] Test: generates expected number of candidates (topK^4)
  - [x] Test: all candidates are valid 4-digit PINs
  - [x] Test: scores are products of per-position probabilities
  - [x] Test: results are sorted descending by score
  - [x] Test: top candidate matches the most likely digit per position
- [x] Implement `src/lib/composite.ts` (weighted composite scoring)
- [x] Write tests: `tests/lib/composite.test.ts`
  - [x] Test: weights (1.0, 0.0) produces same ranking as heatmap only
  - [x] Test: weights (0.0, 1.0) produces frequency-only ranking
  - [x] Test: high-frequency PIN overtakes low-frequency PIN when frequency weight is high
  - [x] Test: proportional frequency (9x count → 9x frequency weight)
  - [x] Test: frequency-filtered list uses top 25% of heatmap candidates

## Phase 3: UI Components
- [x] Implement `src/components/TapGrid.tsx` (blank grid capture surface)
  - [x] Grid paper background (CSS grid lines on dark background)
  - [x] Full viewport height on mobile
  - [x] Touch/pointer event capture
  - [x] `touch-action: none` to prevent browser gestures
- [x] Implement `src/components/TapIndicator.tsx` (visual tap feedback)
  - [x] Small semi-transparent dot at tap position
  - [x] Sequential numbering (1-4)
  - [x] Brief appear animation
- [x] Implement `src/hooks/useTapCapture.ts` (4-tap state machine)
  - [x] State: idle → tapping(1) → tapping(2) → tapping(3) → complete
  - [x] Reset capability
- [x] Implement `src/hooks/useAnalysis.ts` (pipeline orchestration)
  - [x] Triggers on 4-tap completion
  - [x] Calls normalize → heatmap → candidates → composite
  - [x] Returns AnalysisResult
- [x] Implement `src/components/ResultsPanel.tsx` (three ranked lists)
  - [x] Tab or accordion view for three lists
  - [x] Each entry: rank, PIN, score (formatted percentage)
  - [x] Visual indicator of confidence level
- [x] Implement `src/components/WeightSlider.tsx` (weight adjustment)
  - [x] Slider from 0 (pure frequency) to 1 (pure heatmap)
  - [x] Live re-ranking of composite list on change
  - [x] Label showing current weight split
- [x] Implement `src/components/SessionHistory.tsx` (previous attempts)
  - [x] List of past tap sequences with top result
- [x] Wire everything together in `src/App.tsx`
- [x] Write component tests: `tests/components/TapGrid.test.tsx`
  - [x] Test: renders grid without keypad digits
  - [x] Test: captures 4 tap positions
  - [x] Test: resets on "Try Again"
- [x] Write component tests: `tests/components/ResultsPanel.test.tsx`
  - [x] Test: renders three lists with correct labels
  - [x] Test: displays PIN candidates with scores
  - [x] Test: updates composite list when weights change

## Phase 4: Integration & Polish
- [x] Integration test: `tests/integration/full-pipeline.test.ts`
  - [x] Test: known 4-tap input → expected top candidates appear
  - [x] Test: all three lists have 10 entries
  - [x] Test: weight slider at extremes matches pure rankings
  - [x] Test: degenerate inputs (same spot, lines) handled gracefully
  - [x] Test: candidate scores are products of digit probabilities
  - [x] Test: heatmap probabilities sum to 1.0 per position
- [ ] Mobile viewport optimization
  - [ ] Test on 375px (iPhone SE), 390px (iPhone 14), 412px (Pixel) widths
  - [ ] Ensure no horizontal scroll
  - [ ] Verify touch targets ≥ 44x44px
- [ ] Accessibility
  - [ ] Sufficient color contrast (WCAG AA)
  - [ ] Screen reader labels for results
  - [ ] Keyboard navigation for non-touch users
- [ ] Performance verification
  - [ ] Analysis pipeline completes in <100ms on mobile
  - [ ] CSV loads in <200ms
  - [ ] No jank during tap capture

## Phase 5: Build & Deploy
- [x] Production build verification (`npm run build`)
- [x] All tests pass (`npm run test`)
- [x] TypeScript strict check passes (`npm run typecheck`)
- [x] ESLint clean (`npm run lint`)
- [ ] Configure deployment (GitHub Pages / Netlify / Vercel)
- [ ] Write deployment instructions in README

## Future Enhancements (Post-MVP)
- [ ] PWA support (offline via service worker)
- [ ] Variable PIN length (5-6 digit PINs)
- [ ] Adjustable sigma from the UI
- [ ] Export results (copy to clipboard, save as JSON)
- [ ] Swipe/drag pattern support (not just discrete taps)
- [ ] Landscape mode optimization
- [ ] Multi-attempt aggregation (combine multiple observations of same subject)
