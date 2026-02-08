# TODO — Implementation Plan

## Phase 0: Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Configure Vitest + React Testing Library
- [ ] Set up ESLint with TypeScript rules
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Create `src/types/index.ts` with shared type definitions
- [x] Source and validate `pin-frequency.csv`, place in `public/data/`

## Phase 1: Data Layer
- [ ] Implement `src/data/pin-frequency.ts` (CSV loader with validation + caching)
- [ ] Implement `src/lib/frequency.ts` (lookup, normalization, ranking functions)
- [ ] Write tests: `tests/lib/frequency.test.ts`
  - [ ] Test: loads all 10,000 PINs
  - [ ] Test: no duplicate PINs
  - [ ] Test: all counts are positive integers
  - [ ] Test: `getFrequency` returns correct count for known PINs
  - [ ] Test: `normalizeFrequency` preserves proportional relationships
  - [ ] Test: `rankByFrequency` returns descending order

## Phase 2: Core Algorithm
- [ ] Implement `src/lib/keypad.ts` (key center coordinates)
- [ ] Implement `src/lib/normalize.ts` (center + scale tap coordinates)
- [ ] Write tests: `tests/lib/normalize.test.ts`
  - [ ] Test: taps spanning full screen normalize to full [0,1] range
  - [ ] Test: taps in small area expand to fill keypad space
  - [ ] Test: single-point degenerate case → all map to center
  - [ ] Test: horizontal line degenerate case → vertical padding applied
  - [ ] Test: vertical line degenerate case → horizontal padding applied
  - [ ] Test: aspect ratio correction preserves keypad proportions
- [ ] Implement `src/lib/heatmap.ts` (Gaussian digit probabilities)
- [ ] Write tests: `tests/lib/heatmap.test.ts`
  - [ ] Test: probabilities sum to 1.0 for any tap position
  - [ ] Test: upper-left tap → digit 1 has highest probability
  - [ ] Test: center tap → digit 5 has highest probability
  - [ ] Test: bottom-center tap → digit 0 has highest probability
  - [ ] Test: sigma parameter affects distribution spread
  - [ ] Test: symmetry — mirrored positions produce mirrored probabilities
- [ ] Implement `src/lib/candidates.ts` (candidate generation + heatmap ranking)
- [ ] Write tests: `tests/lib/candidates.test.ts`
  - [ ] Test: generates expected number of candidates (topK^4)
  - [ ] Test: all candidates are valid 4-digit PINs
  - [ ] Test: scores are products of per-position probabilities
  - [ ] Test: results are sorted descending by score
  - [ ] Test: top candidate matches the most likely digit per position
- [ ] Implement `src/lib/composite.ts` (weighted composite scoring)
- [ ] Write tests: `tests/lib/composite.test.ts`
  - [ ] Test: weights (1.0, 0.0) produces same ranking as heatmap only
  - [ ] Test: weights (0.0, 1.0) produces frequency-only ranking
  - [ ] Test: high-frequency PIN overtakes low-frequency PIN when frequency weight is high
  - [ ] Test: proportional frequency (9x count → 9x frequency weight)
  - [ ] Test: frequency-filtered list uses top 25% of heatmap candidates

## Phase 3: UI Components
- [ ] Implement `src/components/TapGrid.tsx` (blank grid capture surface)
  - [ ] Grid paper background (CSS grid lines on dark background)
  - [ ] Full viewport height on mobile
  - [ ] Touch/pointer event capture
  - [ ] `touch-action: none` to prevent browser gestures
- [ ] Implement `src/components/TapIndicator.tsx` (visual tap feedback)
  - [ ] Small semi-transparent dot at tap position
  - [ ] Sequential numbering (1-4)
  - [ ] Brief appear animation
- [ ] Implement `src/hooks/useTapCapture.ts` (4-tap state machine)
  - [ ] State: idle → tapping(1) → tapping(2) → tapping(3) → complete
  - [ ] Debounce: ignore taps within 100ms
  - [ ] Reset capability
- [ ] Implement `src/hooks/useAnalysis.ts` (pipeline orchestration)
  - [ ] Triggers on 4-tap completion
  - [ ] Calls normalize → heatmap → candidates → composite
  - [ ] Returns AnalysisResult
- [ ] Implement `src/components/ResultsPanel.tsx` (three ranked lists)
  - [ ] Tab or accordion view for three lists
  - [ ] Each entry: rank, PIN, score (formatted percentage)
  - [ ] Visual indicator of confidence level
- [ ] Implement `src/components/WeightSlider.tsx` (weight adjustment)
  - [ ] Slider from 0 (pure frequency) to 1 (pure heatmap)
  - [ ] Live re-ranking of composite list on change
  - [ ] Label showing current weight split
- [ ] Implement `src/components/SessionHistory.tsx` (previous attempts)
  - [ ] List of past tap sequences with top result
  - [ ] Tap to expand and see full results
- [ ] Wire everything together in `src/App.tsx`
- [ ] Write component tests: `tests/components/TapGrid.test.tsx`
  - [ ] Test: renders grid without keypad digits
  - [ ] Test: captures 4 tap positions
  - [ ] Test: resets on "Try Again"
- [ ] Write component tests: `tests/components/ResultsPanel.test.tsx`
  - [ ] Test: renders three lists with correct labels
  - [ ] Test: displays PIN candidates with scores
  - [ ] Test: updates composite list when weights change

## Phase 4: Integration & Polish
- [ ] Integration test: `tests/integration/full-pipeline.test.ts`
  - [ ] Test: known 4-tap input → expected top candidates appear
  - [ ] Test: all three lists have 10 entries
  - [ ] Test: weight slider at extremes matches pure rankings
  - [ ] Test: session history records multiple attempts
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
- [ ] Production build verification (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript strict check passes (`npm run typecheck`)
- [ ] ESLint clean (`npm run lint`)
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
