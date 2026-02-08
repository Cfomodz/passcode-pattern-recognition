# AGENTS.md — Agent Architecture & Roles

This document defines the specialized agent roles for developing the Passcode Pattern Recognition app. Each agent has a focused responsibility, clear inputs/outputs, and defined boundaries.

---

## Agent Overview

```
┌─────────────────────────────────────────────────┐
│                  Orchestrator                    │
│         (Claude Code main session)               │
│                                                  │
│  Coordinates agents, manages TODO, resolves      │
│  conflicts, handles git operations               │
└──────┬──────┬──────┬──────┬──────┬──────────────┘
       │      │      │      │      │
       v      v      v      v      v
   ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
   │ Data ││ Algo ││  UI  ││ Test ││  QA  │
   │Agent ││Agent ││Agent ││Agent ││Agent │
   └──────┘└──────┘└──────┘└──────┘└──────┘
```

---

## 1. Data Agent

**Responsibility**: PIN frequency dataset preparation and the data loading layer.

**Scope**:
- Source, validate, and format `pin-frequency.csv`
- Ensure all 10,000 PINs (0000-9999) are present with valid counts
- Build `src/data/pin-frequency.ts` — typed CSV loader with caching
- Build `src/lib/frequency.ts` — lookup, normalization, and ranking functions

**Key outputs**:
- `public/data/pin-frequency.csv` — validated dataset
- `src/data/pin-frequency.ts` — async loader returning `Map<string, number>`
- `src/lib/frequency.ts` — `getFrequency(pin)`, `normalizeFrequency(count)`, `rankByFrequency(pins)`

**Boundaries**:
- Does NOT handle spatial/heatmap logic
- Does NOT build UI components
- DOES write unit tests for all data functions in `tests/lib/frequency.test.ts`

---

## 2. Algorithm Agent

**Responsibility**: Core mathematical engine — normalization, heatmap scoring, candidate generation, and composite ranking.

**Scope**:
- `src/lib/keypad.ts` — keypad geometry constants (key centers in normalized coords)
- `src/lib/normalize.ts` — center + scale tap coordinates to keypad space
- `src/lib/heatmap.ts` — Gaussian distance-to-probability per digit
- `src/lib/candidates.ts` — generate and rank candidate PINs
- `src/lib/composite.ts` — weighted composite scoring combining heatmap + frequency

**Key outputs**:
- Pure functions with well-defined signatures
- Three ranking functions:
  - `rankByHeatmap(taps)` → top candidates by spatial probability only
  - `rankByFilteredFrequency(taps, frequencyMap)` → top 25% heatmap candidates re-sorted by frequency
  - `rankByComposite(taps, frequencyMap, weights)` → blended score

**Boundaries**:
- Does NOT touch DOM, React, or CSS
- Does NOT load data files (receives frequency map as parameter)
- DOES write comprehensive unit tests in `tests/lib/`
- All functions must be deterministic and side-effect-free

**Critical math details**:
- Gaussian kernel: `P(digit | tap) = exp(-d² / (2σ²))` then normalize to sum=1
- σ (sigma) controls spread — should be tunable, default ~0.4 in normalized units
- Normalization must handle degenerate cases (single point, collinear points)
- Candidate generation uses top-K per position to avoid 10^4 exhaustive search

---

## 3. UI Agent

**Responsibility**: All React components, hooks, styling, and user interaction.

**Scope**:
- `src/components/TapGrid.tsx` — blank grid capture surface with grid-paper styling
- `src/components/TapIndicator.tsx` — subtle visual dot feedback per tap
- `src/components/ResultsPanel.tsx` — three ranked lists display
- `src/components/WeightSlider.tsx` — adjust heatmap vs frequency weight
- `src/components/SessionHistory.tsx` — list of previous attempts this session
- `src/hooks/useTapCapture.ts` — touch/pointer event handling, 4-tap state machine
- `src/hooks/useAnalysis.ts` — orchestrates lib calls when 4 taps complete
- `src/App.tsx` — layout and state coordination
- `src/main.tsx` — entry point

**Boundaries**:
- Does NOT implement scoring math (calls lib functions)
- Does NOT handle data loading directly (uses data layer)
- DOES write component tests in `tests/components/`
- Mobile-first: touch events primary, pointer events for cross-device support

**UX flow**:
```
[Blank Grid] → tap tap tap tap → [Brief animation] → [Results Panel]
                                                        ├── Heatmap Top 10
                                                        ├── Frequency Top 10
                                                        └── Composite Top 10
                                                     [Weight Slider]
                                                     [Try Again button]
                                                     [Session History]
```

**Design requirements**:
- Grid paper aesthetic: subtle lines on dark background
- No keypad digits ever visible on capture screen
- Tap dots: small, semi-transparent circles that appear on tap
- Results: clean monospace display of PIN candidates with scores
- Minimum 44x44px touch targets
- Full viewport height on mobile (no scroll during capture)

---

## 4. Test Agent

**Responsibility**: Test infrastructure, integration tests, and test coverage enforcement.

**Scope**:
- Vitest configuration (`vitest.config.ts`)
- Test utilities and fixtures (`tests/fixtures/`, `tests/helpers/`)
- Integration test: `tests/integration/full-pipeline.test.ts`
- Ensuring all lib modules have >90% coverage
- Edge case tests across all modules

**Key test scenarios** (see `docs/TEST_PLAN.md` for full list):
- Normalization edge cases (single point, collinear, full-screen spread)
- Heatmap probabilities sum to 1.0 for any tap position
- Known input → known output for the example in the spec (upper-left → 1,2,4,5)
- Frequency data completeness (all 10,000 PINs present)
- Composite scoring respects weight parameters
- Full pipeline: 4 taps → 3 ranked lists with expected properties

**Boundaries**:
- Does NOT implement features
- DOES verify correctness of all other agents' outputs
- DOES create shared test utilities (mock tap generators, fixture data)

---

## 5. QA Agent

**Responsibility**: Cross-cutting quality — linting, type checking, accessibility, and build verification.

**Scope**:
- ESLint configuration
- TypeScript strict mode compliance
- Tailwind configuration
- Build verification (Vite produces working output)
- Mobile viewport testing guidance
- Accessibility audit (touch targets, color contrast, screen reader basics)

**Boundaries**:
- Does NOT write feature code
- DOES file issues/TODOs when finding problems
- DOES verify the app works end-to-end after all agents complete

---

## Agent Coordination Protocol

### Dependency Order

```
Phase 1 (parallel): Data Agent + Algorithm Agent (keypad.ts, normalize.ts, heatmap.ts)
Phase 2 (after P1):  Algorithm Agent (candidates.ts, composite.ts — needs frequency interface)
Phase 3 (parallel): UI Agent + Test Agent (UI uses lib, Tests verify lib)
Phase 4 (after P3):  QA Agent (integration verification)
```

### Interface Contracts

Agents communicate through **TypeScript interfaces** defined in `src/types/index.ts`. All agents must agree on these types before implementation begins:

```typescript
// Core types all agents depend on
interface TapPoint { x: number; y: number }            // Raw screen coords (px)
interface NormalizedTap { x: number; y: number }        // 0..1 keypad space
interface DigitProbability { digit: number; p: number } // Single digit score
interface TapAnalysis { position: number; probabilities: DigitProbability[] }
interface PinCandidate { pin: string; score: number }
interface AnalysisResult {
  heatmapRanking: PinCandidate[]
  frequencyRanking: PinCandidate[]
  compositeRanking: PinCandidate[]
}
```

### Conflict Resolution

1. Type conflicts → Orchestrator decides, updates `src/types/index.ts`
2. Algorithm questions → Defer to `docs/ALGORITHM.md` spec
3. UX questions → Defer to the UX flow defined in this document
4. Performance concerns → Profile first, optimize only if measurable
