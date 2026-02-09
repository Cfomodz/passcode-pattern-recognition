<div align="center">

# Passcode Pattern Recognition

**Recover PIN codes from observed finger motion.**

[![CI](https://github.com/Cfomodz/passcode-pattern-recognition/actions/workflows/ci.yml/badge.svg)](https://github.com/Cfomodz/passcode-pattern-recognition/actions/workflows/ci.yml)
[![Deploy](https://github.com/Cfomodz/passcode-pattern-recognition/actions/workflows/deploy.yml/badge.svg)](https://github.com/Cfomodz/passcode-pattern-recognition/actions/workflows/deploy.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/github/license/Cfomodz/passcode-pattern-recognition)

[Live Demo](https://cfomodz.github.io/passcode-pattern-recognition/) &middot; [Algorithm Docs](docs/ALGORITHM.md) &middot; [Architecture](docs/ARCHITECTURE.md)

</div>

---

A mobile-first tool for penetration testers. Observe someone entering a PIN, replay the finger motion on a blank grid, and get ranked guesses powered by spatial analysis and real-world frequency data.

## How It Works

```
Tap 4 positions  -->  Normalize to keypad  -->  Score candidates  -->  Ranked PINs
```

1. **Tap** &mdash; Mimic the observed motion on a blank grid (no keypad shown)
2. **Normalize** &mdash; Points are centered and scaled to a standard 3&times;4 keypad
3. **Score** &mdash; Each candidate PIN is scored via Gaussian proximity and real-world frequency
4. **Rank** &mdash; Three output lists: heatmap-only, frequency-filtered, and weighted composite

## Quick Start

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) and tap four positions on the grid.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run all tests |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with tsc |
| `npm run deploy` | Deploy to GitHub Pages |

## Architecture

```
src/
  lib/         Pure scoring functions (normalize, heatmap, composite, candidates)
  components/  React UI (TapGrid, ResultsPanel, WeightSlider, etc.)
  hooks/       useTapCapture, useAnalysis
  data/        Static CSV loader for PIN frequencies
  types/       Shared TypeScript interfaces
```

All scoring logic lives in `src/lib/` as pure functions with zero side effects. Touch handling and rendering happen exclusively in components and hooks.

## Data

PIN frequency data covers all 10,000 possible 4-digit PINs, sourced from [DataGenetics](http://www.datagenetics.com/blog/september32012/) and [SecLists](https://github.com/danielmiessler/SecLists). The dataset is bundled statically &mdash; the app works fully offline with no network requests.

## Ethics

This tool is for **authorized penetration testing** and **security awareness training** only. It demonstrates why physical PIN shielding matters. It does not interact with any real payment terminals or authentication systems.
