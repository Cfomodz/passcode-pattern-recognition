# CLAUDE.md — Project Conventions for AI Agents

This file provides context for Claude Code and other AI assistants working on this project.

## Project Overview

Passcode Pattern Recognition — a mobile-first React/TypeScript web app for penetration testers. The user taps 4 positions on a blank grid screen mimicking observed PIN entry motion, and the app produces ranked PIN guesses using spatial analysis and frequency statistics.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Framework**: React 18+
- **Build**: Vite
- **Styling**: Tailwind CSS (mobile-first)
- **Testing**: Vitest + React Testing Library
- **Package manager**: npm
- **Node**: 18+

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run all tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## Code Conventions

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- No `any` types — use `unknown` and narrow
- Prefer `interface` for object shapes, `type` for unions/intersections
- All public functions must have explicit return types
- Use `readonly` for arrays/objects that should not be mutated

### File Naming
- Components: `PascalCase.tsx` (e.g., `TapGrid.tsx`)
- Lib/utilities: `camelCase.ts` (e.g., `heatmap.ts`)
- Tests: `*.test.ts` / `*.test.tsx` mirroring source path
- Types: `src/types/index.ts` for shared types

### Component Conventions
- Functional components only (no class components)
- Props interfaces named `{ComponentName}Props`
- Hooks in `src/hooks/`, prefixed with `use`
- No default exports — use named exports everywhere

### Styling
- Tailwind utility classes inline
- Mobile-first: base styles are mobile, use `sm:`, `md:`, `lg:` for larger screens
- Touch targets minimum 44x44px for accessibility
- Dark background preferred (grid-paper aesthetic)

### Testing
- Tests live in `tests/` directory, mirroring `src/` structure
- Unit tests for all `src/lib/` modules — these are pure functions, easy to test
- Component tests for user-facing interaction flows
- Integration test for full tap-to-results pipeline
- Use descriptive test names: `it("should assign highest probability to digit 1 for upper-left tap")`

## Architecture Principles

1. **Pure core, effectful shell**: All scoring/ranking logic in `src/lib/` as pure functions. Side effects (touch events, DOM) only in components/hooks.
2. **No network requests at runtime**: PIN frequency data is bundled statically. The app works fully offline.
3. **Mobile-first interaction**: Touch events are primary. Mouse/click is fallback for desktop testing.
4. **Coordinate system**: All internal geometry uses a normalized unit coordinate system (0,0 top-left to 1,1 bottom-right) mapped to the standard phone keypad layout.

## Key Domain Concepts

- **Tap sequence**: 4 `(x, y)` coordinates in screen space representing observed motion
- **Normalization**: Centering and scaling tap points to fill the keypad coordinate space
- **Heatmap score**: Per-digit Gaussian probability based on distance from tap to key center
- **PIN frequency**: Real-world usage count from the DataGenetics/SecLists dataset
- **Composite score**: Weighted blend of heatmap probability and normalized frequency

## Data

- `public/data/pin-frequency.csv` — 10,000 rows, format: `pin,count`
- Source: SecLists Common Credentials (public domain security research data)
- Loaded once at app startup, cached in memory as a `Map<string, number>`

## Critical Invariants

- Heatmap probabilities for each tap position must sum to 1.0 across all 10 digits
- PIN frequency data must cover all 10,000 possible 4-digit PINs (0000-9999)
- Normalization must handle edge cases: all taps in same spot, taps in a line (1D)
- The blank grid must NEVER show keypad digits — this is the core UX principle
