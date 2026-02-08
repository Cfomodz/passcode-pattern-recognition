# Test Plan

## Overview

This document defines the comprehensive test strategy for the Passcode Pattern Recognition app. Tests are organized by layer and include specific test cases with expected inputs and outputs.

## Test Infrastructure

- **Framework**: Vitest (Vite-native, Jest-compatible API)
- **Component testing**: React Testing Library (`@testing-library/react`)
- **User event simulation**: `@testing-library/user-event` + `fireEvent` for pointer events
- **Coverage target**: >90% line coverage for `src/lib/`, >80% for components
- **CI**: All tests must pass before merge

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        'src/lib/': { lines: 90 },
      },
    },
  },
});
```

---

## Unit Tests: `src/lib/`

### `tests/lib/normalize.test.ts`

| # | Test Case | Input | Expected Output |
|---|-----------|-------|-----------------|
| N1 | Full-screen spread normalizes to full range | Taps at 4 corners of a 375x812 screen | Normalized coords near (0,0), (1,0), (0,1), (1,1) |
| N2 | Small-area taps expand to fill keypad space | Taps within 50x50px area in center of screen | Normalized coords spanning [0,1] on both axes |
| N3 | Single-point degenerate case | All 4 taps at (200, 400) | All normalized to (0.5, 0.5) |
| N4 | Horizontal line degenerate case | Taps at (100,300), (200,300), (300,300), (350,300) | X normalized across range; Y centered with padding |
| N5 | Vertical line degenerate case | Taps at (200,100), (200,200), (200,400), (200,600) | Y normalized across range; X centered with padding |
| N6 | Aspect ratio correction | Taps forming a square 200x200 area | Keypad aspect (3:4) applied — width padded or height padded to match |
| N7 | Preserves relative positions | Tap A is left of Tap B in raw coords | Tap A has lower x than Tap B after normalization |
| N8 | Handles negative-ish coordinates | Taps at screen edges near (0,0) | Valid normalized coordinates ≥ 0 |

### `tests/lib/heatmap.test.ts`

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| H1 | Probabilities sum to 1.0 | Any tap position | `Σ P(d) = 1.0` (within floating point tolerance 1e-10) |
| H2 | Upper-left tap → digit 1 highest | Tap at (0.167, 0.125) | `P(1) > P(d)` for all d ≠ 1 |
| H3 | Center tap → digit 5 highest | Tap at (0.5, 0.375) | `P(5) > P(d)` for all d ≠ 5 |
| H4 | Bottom-center tap → digit 0 highest | Tap at (0.5, 0.875) | `P(0) > P(d)` for all d ≠ 0 |
| H5 | Upper-right tap → digit 3 highest | Tap at (0.833, 0.125) | `P(3) > P(d)` for all d ≠ 3 |
| H6 | Lower-left tap → digit 7 highest | Tap at (0.167, 0.625) | `P(7) > P(d)` for all d ≠ 7 |
| H7 | Lower-right tap → digit 9 highest | Tap at (0.833, 0.625) | `P(9) > P(d)` for all d ≠ 9 |
| H8 | Small sigma → sharper distribution | Same tap, σ=0.15 vs σ=0.5 | Top digit has higher P with smaller σ |
| H9 | Large sigma → flatter distribution | Same tap, σ=0.8 | Probabilities more evenly distributed |
| H10 | Symmetry: left-right mirror | Tap at (0.167, 0.375) vs (0.833, 0.375) | P(4) for first ≈ P(6) for second |
| H11 | Out-of-bounds tap still produces valid probs | Tap at (1.5, -0.2) | All probabilities ≥ 0, sum to 1.0 |
| H12 | Exact key center → dominant probability | Tap at exact center of digit 5 | `P(5) > 0.5` with default σ |

### `tests/lib/candidates.test.ts`

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| C1 | Correct candidate count | topK=4 | 256 candidates |
| C2 | Correct candidate count | topK=3 | 81 candidates |
| C3 | All candidates are valid 4-digit PINs | Any input | Every PIN matches `/^\d{4}$/` |
| C4 | No duplicate candidates | Any input | All PINs unique |
| C5 | Scores are probability products | Known probabilities | Score = P(d1) × P(d2) × P(d3) × P(d4) |
| C6 | Sorted descending | Any input | `candidates[i].score >= candidates[i+1].score` |
| C7 | Top candidate = most likely per position | Clear 4-corner taps | Top PIN = highest-prob digit at each position |
| C8 | topK=1 → single candidate | Any input | Exactly 1 candidate |

### `tests/lib/frequency.test.ts`

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| F1 | Loads all 10,000 PINs | Full CSV | Map size = 10,000 |
| F2 | No duplicate PINs | Full CSV | Set of keys has size 10,000 |
| F3 | All counts positive | Full CSV | Every value > 0 |
| F4 | Known PIN lookup | `getFrequency("1234")` | Highest count in dataset |
| F5 | Zero-padded lookup works | `getFrequency("0000")` | Returns valid count |
| F6 | Normalize preserves ratios | count_A / count_B | norm_A / norm_B ≈ count_A / count_B |
| F7 | Rank by frequency descending | List of PINs | Sorted by count descending |
| F8 | Unknown PIN handling | `getFrequency("XXXX")` | Returns 0 or throws |

### `tests/lib/composite.test.ts`

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| W1 | Pure heatmap weights | weights=(1.0, 0.0) | Ranking matches heatmap-only list |
| W2 | Pure frequency weights | weights=(0.0, 1.0) | Ranking matches frequency sort |
| W3 | Equal weights blend | weights=(0.5, 0.5) | Score = avg(norm_heatmap, norm_freq) |
| W4 | Proportional frequency weight | PIN A: freq 900, PIN B: freq 100 | freq_weight_A / freq_weight_B = 9.0 |
| W5 | High freq beats low spatial | High-freq PIN with moderate heatmap, w_f=0.8 | High-freq PIN ranks above spatially-better but rare PIN |
| W6 | Frequency filter uses top 25% | 256 candidates | Frequency list draws from top 64 |
| W7 | Composite handles ties | Two PINs with identical scores | Both appear (order is stable) |
| W8 | Weight slider at midpoint | Default weights | Neither pure heatmap nor pure frequency ranking |

---

## Component Tests: `src/components/`

### `tests/components/TapGrid.test.tsx`

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| G1 | Renders without keypad | Mount component | No digits 0-9 visible in DOM |
| G2 | Grid paper background visible | Mount component | Grid CSS pattern present |
| G3 | Records tap position | Fire pointer event at (100, 200) | `onTap` callback receives {x: 100, y: 200} |
| G4 | Captures exactly 4 taps | Fire 4 pointer events | `onComplete` called with 4 TapPoints |
| G5 | Ignores taps after 4 | Fire 5 pointer events | Only first 4 recorded |
| G6 | Reset clears taps | Fire 2 taps, then reset | Tap count back to 0 |
| G7 | Debounces rapid taps | Fire 2 taps 50ms apart | Only 1 tap recorded |
| G8 | Full viewport height | Mount on mobile viewport | Element height = 100vh |

### `tests/components/ResultsPanel.test.tsx`

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| R1 | Renders three lists | Pass AnalysisResult | Three sections visible with correct headings |
| R2 | Shows 10 entries per list | Pass full result | Each list has 10 items |
| R3 | Displays PIN and score | Pass known result | PIN text and formatted score visible |
| R4 | Heatmap list labeled correctly | Mount | "Heatmap" or "Spatial" label present |
| R5 | Frequency list labeled correctly | Mount | "Frequency" label present |
| R6 | Composite list labeled correctly | Mount | "Composite" or "Combined" label present |
| R7 | Weight change updates composite | Move slider | Composite list re-renders with new scores |

### `tests/components/WeightSlider.test.tsx`

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| S1 | Default at 0.5 | Mount | Slider at midpoint |
| S2 | Slide to heatmap extreme | Move to 1.0 | `onChange` called with {heatmap: 1.0, freq: 0.0} |
| S3 | Slide to frequency extreme | Move to 0.0 | `onChange` called with {heatmap: 0.0, freq: 1.0} |
| S4 | Label updates with position | Move slider | Display shows current weight split |

---

## Integration Tests: `tests/integration/`

### `tests/integration/full-pipeline.test.ts`

| # | Test Case | Description | Expected |
|---|-----------|-------------|----------|
| I1 | Corner taps → diagonal PIN | Taps at (0.1,0.1), (0.9,0.1), (0.1,0.9), (0.9,0.9) | Top heatmap candidates include `1397` or `1399` |
| I2 | Center column taps | Taps at (0.5,0.1), (0.5,0.35), (0.5,0.65), (0.5,0.85) | Top candidate `2580` (vertical column pattern) |
| I3 | Upper-left cluster | All taps near (0.15, 0.15) | Digit `1` dominates all positions → `1111` ranks high |
| I4 | Three lists have 10 entries | Any valid input | Each list returns exactly 10 candidates |
| I5 | Lists differ from each other | Any valid input | At least one difference between lists |
| I6 | Weight=1.0 composite matches heatmap | Run with w_h=1.0 | Composite ranking = heatmap ranking |
| I7 | High-frequency override | Pattern roughly matching `1234` | `1234` appears in frequency list top 3 |
| I8 | Session records attempt | Complete one analysis | History contains 1 entry |
| I9 | Multiple attempts accumulate | Complete 3 analyses | History contains 3 entries |
| I10 | Spec example: right-down-right | Taps mimicking "press, right, down-left, right" | Plausible PINs in results (e.g., `2359`, `1379`) |

---

## Edge Case Tests

### Boundary Conditions

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| E1 | All 4 taps at exact same pixel | Normalize to center; all digits get equal probability; `1234` tops frequency list |
| E2 | Taps at extreme screen edges | Normalization still produces valid [0,1] coordinates |
| E3 | Very rapid succession taps (<50ms each) | Debounce prevents extra taps |
| E4 | CSV file missing | Error state displayed, no crash |
| E5 | CSV file malformed | Validation catches it, error state |
| E6 | CSV has 9,999 entries (missing one) | Validation catches it, error state |
| E7 | Sigma = 0 | Handle gracefully (avoid division by zero) |
| E8 | topK = 10 (all digits) | 10,000 candidates generated — verify performance |

### Numerical Stability

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| S1 | Very small Gaussian values | No underflow to 0 (use log-space if needed) |
| S2 | Product of 4 small probabilities | Score doesn't collapse to 0 |
| S3 | Normalization with near-zero denominators | Handled by degenerate case detection |

---

## Test Fixtures

### `tests/fixtures/taps.ts`

Pre-defined tap sequences for consistent testing:

```typescript
export const CORNER_TAPS: TapPoint[] = [
  { x: 50, y: 50 },     // upper-left
  { x: 325, y: 50 },    // upper-right
  { x: 50, y: 750 },    // lower-left
  { x: 325, y: 750 },   // lower-right
];

export const CENTER_COLUMN_TAPS: TapPoint[] = [
  { x: 187, y: 100 },   // top-center
  { x: 187, y: 300 },   // mid-center
  { x: 187, y: 500 },   // lower-center
  { x: 187, y: 700 },   // bottom-center
];

export const SAME_POINT_TAPS: TapPoint[] = [
  { x: 200, y: 400 },
  { x: 200, y: 400 },
  { x: 200, y: 400 },
  { x: 200, y: 400 },
];

export const UPPER_LEFT_CLUSTER: TapPoint[] = [
  { x: 40, y: 60 },
  { x: 55, y: 45 },
  { x: 35, y: 70 },
  { x: 50, y: 55 },
];

// Spec example: press, move right, move down-left, move right
export const SPEC_EXAMPLE_TAPS: TapPoint[] = [
  { x: 80, y: 100 },
  { x: 280, y: 100 },
  { x: 120, y: 350 },
  { x: 300, y: 350 },
];
```

### `tests/fixtures/frequencies.ts`

Minimal mock frequency data for isolated testing:

```typescript
export const MOCK_FREQUENCY_MAP = new Map<string, number>([
  ['1234', 255],
  ['1111', 244],
  ['0000', 221],
  ['7777', 203],
  ['2580', 180],
  ['1379', 45],
  ['2359', 38],
  ['1397', 42],
  // ... enough entries for test coverage
]);
```

---

## Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# Specific test file
npm run test -- tests/lib/heatmap.test.ts

# Integration tests only
npm run test -- tests/integration/
```
