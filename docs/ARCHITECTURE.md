# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Mobile)                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    React Application                     │ │
│  │                                                          │ │
│  │  ┌──────────┐    ┌──────────┐    ┌───────────────────┐  │ │
│  │  │ TapGrid  │───>│useTapCap │───>│   useAnalysis     │  │ │
│  │  │(capture) │    │  ture    │    │  (orchestrator)   │  │ │
│  │  └──────────┘    └──────────┘    └────────┬──────────┘  │ │
│  │                                           │              │ │
│  │                              ┌────────────┼──────────┐   │ │
│  │                              v            v          v   │ │
│  │                        ┌──────────┐ ┌──────────┐ ┌─────┐│ │
│  │                        │normalize │ │ heatmap  │ │freq ││ │
│  │                        │  .ts     │ │  .ts     │ │.ts  ││ │
│  │                        └────┬─────┘ └────┬─────┘ └──┬──┘│ │
│  │                             │            │          │    │ │
│  │                             v            v          v    │ │
│  │                        ┌─────────────────────────────┐   │ │
│  │                        │      candidates.ts          │   │ │
│  │                        │      composite.ts           │   │ │
│  │                        └─────────────┬───────────────┘   │ │
│  │                                      │                   │ │
│  │                                      v                   │ │
│  │  ┌──────────────┐    ┌───────────────────────────────┐   │ │
│  │  │ WeightSlider │───>│        ResultsPanel           │   │ │
│  │  └──────────────┘    └───────────────────────────────┘   │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │              SessionHistory                       │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────┐                                        │
│  │ pin-frequency.csv │  (static asset, loaded once at start) │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

## Layer Separation

### Layer 1: Pure Logic (`src/lib/`)

Zero dependencies on React, DOM, or browser APIs. Every function is pure: same input always produces the same output, no side effects.

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `keypad.ts` | Keypad geometry constants | `KEY_CENTERS`, `KEYPAD_COLS`, `KEYPAD_ROWS` |
| `normalize.ts` | Center + scale raw taps to keypad space | `normalizeTaps(taps: TapPoint[]): NormalizedTap[]` |
| `heatmap.ts` | Gaussian digit probability per tap | `computeDigitProbabilities(tap: NormalizedTap, sigma?: number): DigitProbability[]` |
| `frequency.ts` | PIN frequency lookup + ranking | `getFrequency(pin, map)`, `rankByFrequency(pins, map)` |
| `candidates.ts` | Generate candidate PINs from probabilities | `generateCandidates(analyses: TapAnalysis[], topK?: number): PinCandidate[]` |
| `composite.ts` | Weighted composite scoring | `computeComposite(heatmapScore, freqScore, weights): number` |

### Layer 2: Data (`src/data/`)

Handles loading the static CSV and exposing it as a typed data structure.

| Module | Purpose |
|--------|---------|
| `pin-frequency.ts` | Fetches and parses `pin-frequency.csv`, returns `Map<string, number>`, caches result |

### Layer 3: Hooks (`src/hooks/`)

Bridge between pure logic and React lifecycle.

| Hook | Purpose |
|------|---------|
| `useTapCapture` | Manages the 4-tap state machine: idle → tapping (1..4) → complete. Handles touch/pointer events, emits `TapPoint[]` on completion. |
| `useAnalysis` | Takes `TapPoint[]` + frequency map, runs the full pipeline (normalize → heatmap → candidates → composite), returns `AnalysisResult`. |

### Layer 4: Components (`src/components/`)

React components handling rendering and user interaction.

| Component | Purpose |
|-----------|---------|
| `TapGrid` | Full-viewport touch capture surface with grid-paper background. No keypad digits. |
| `TapIndicator` | Renders a dot at each tap position. Appears on tap, fades slightly. |
| `ResultsPanel` | Displays three ranked lists (heatmap, frequency, composite). Each list shows top 10 with scores. |
| `WeightSlider` | Dual-thumb slider or simple input to adjust `w_h` and `w_f`. Re-triggers composite ranking on change. |
| `SessionHistory` | Stores previous tap sequences and their results in session state. Allows reviewing past attempts. |

## Data Flow

```
User taps screen (4 times)
    │
    v
useTapCapture: records TapPoint[] (raw pixel coords)
    │
    v
useAnalysis: orchestration pipeline
    │
    ├── normalizeTaps(rawTaps) → NormalizedTap[]
    │       Centers the bounding box of taps on the keypad center,
    │       scales so the bounding box fills the keypad grid.
    │
    ├── for each NormalizedTap:
    │       computeDigitProbabilities(tap) → DigitProbability[]
    │       Returns 10 probabilities (digits 0-9) summing to 1.0
    │
    ├── generateCandidates(analyses, topK=4) → PinCandidate[]
    │       Generates up to topK^4 = 256 candidates by taking
    │       top-K digits per position. Scores by product of probabilities.
    │
    ├── List 1 — Heatmap Only:
    │       Sort candidates by heatmap score, take top 10
    │
    ├── List 2 — Frequency Only:
    │       Take top 25% of candidates by heatmap score,
    │       re-sort by PIN frequency, take top 10
    │
    └── List 3 — Composite:
            Score each candidate with weighted blend,
            sort descending, take top 10
    │
    v
ResultsPanel renders three lists
WeightSlider re-triggers composite recalculation on change
```

## State Management

No external state library. React state is sufficient:

```
App
├── frequencyMap: Map<string, number>          (loaded once)
├── currentTaps: TapPoint[] | null             (from useTapCapture)
├── analysisResult: AnalysisResult | null      (from useAnalysis)
├── weights: { heatmap: number, freq: number } (from WeightSlider)
└── history: SessionEntry[]                    (append-only list)
```

State transitions:
1. **App mount** → load CSV → store `frequencyMap`
2. **4th tap** → `currentTaps` populated → trigger `useAnalysis`
3. **Analysis complete** → `analysisResult` populated → render results
4. **Weight change** → recompute composite list only (heatmap + frequency lists unchanged)
5. **"Try Again"** → push current to `history`, clear `currentTaps` + `analysisResult`

## Mobile-First Responsive Design

### Breakpoints

| Screen | Layout |
|--------|--------|
| Mobile (<640px) | Full viewport grid. Results appear below as slide-up panel. |
| Tablet (640-1024px) | Grid on left (60%), results on right (40%). |
| Desktop (>1024px) | Centered grid with fixed max-width, results in sidebar. |

### Touch Handling

- Use `PointerEvent` API (unifies touch + mouse)
- `pointerdown` captures the tap position
- `touch-action: none` on the grid to prevent scroll/zoom interference
- Debounce: ignore taps within 100ms of each other (prevents double-tap)

## Performance Considerations

- **Candidate generation** is the heaviest operation: `topK^4` candidates. With `topK=4`, that's 256 candidates — trivial. With `topK=5`, 625 — still fine. No need for web workers.
- **CSV parsing** happens once at startup. 10,000 rows parse in <50ms on any modern phone.
- **Re-rendering**: Only `ResultsPanel` re-renders on weight change. The grid and tap indicators are stable.

## Offline Support

The app has zero runtime network dependencies:
- CSV is bundled as a static asset
- No API calls
- Could be trivially made into a PWA with a service worker in a future phase
