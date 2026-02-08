# Passcode Pattern Recognition

A mobile-first web application for penetration testers to assess PIN entry security through physical motion observation. The tool demonstrates why larger PIN pad covers and private entry environments are critical security controls.

## Purpose

During physical security assessments, a tester observes a subject entering a PIN on a keypad. The tester does **not** see the keypad — they only see the **hand/finger motion**. This app lets them replay that motion on a blank screen and generates ranked PIN guesses using two independent signals:
 
1. **Spatial heatmap analysis** — where each tap lands relative to a standard keypad layout
2. **PIN frequency statistics** — how commonly each 4-digit PIN is used in the real world

The combination produces a ranked list of the most likely PINs, demonstrating the vulnerability of PIN entry without adequate physical shielding.

## How It Works

### 1. Motion Capture (Input)

The tester sees a blank grid-paper-style screen (no keypad visible). They mimic the subject's hand movements by tapping 4 positions on screen. The app records the `(x, y)` coordinates and relative spacing of each tap.

### 2. Normalization

The raw taps are **centered and scaled** to fit a standard 3x4 keypad grid. If the tester only used a small portion of the screen, the points are expanded. If they used the full screen, they map directly. This accounts for the tester not perfectly replicating the keypad's physical dimensions.

### 3. Heatmap Scoring (Per-Digit)

Each normalized tap position generates a probability distribution across digits 0-9 based on proximity to each key's center on the standard keypad:

```
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]
    [0]
```

A tap near the upper-left maps strongly to `1`, with diminishing probability for `2`, `4`, `5`, etc. The falloff uses a Gaussian kernel so nearby keys get meaningful probability while distant keys approach zero.

### 4. Three Output Lists

For each 4-tap sequence, the app generates **three ranked lists of candidate PINs**:

| List | Method | Description |
|------|--------|-------------|
| **Heatmap Only** | Spatial probability | Top 10 PINs ranked purely by the product of per-digit heatmap probabilities |
| **Frequency Only** | Filtered + frequency sort | Take top 25% of heatmap candidates, re-sort by real-world PIN usage frequency |
| **Weighted Composite** | Combined score | Blend heatmap confidence and frequency weight with independent scaling |

### 5. Weighted Composite Algorithm

The composite score for a candidate PIN uses **proportional weighting**:

- **Heatmap weight**: The spatial probability of that PIN (product of per-position digit probabilities)
- **Frequency weight**: Proportional to actual usage count — a PIN used 900x more than another gets 9x the frequency weight (not a flat rank)

```
composite_score = (heatmap_probability * w_h) + (normalized_frequency * w_f)
```

Where `w_h` and `w_f` are user-adjustable but default to equal (0.5 / 0.5).

## Tech Stack

- **Framework**: React with TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS (mobile-first responsive)
- **State**: React hooks (no external state library needed)
- **Testing**: Vitest + React Testing Library
- **Data**: Static CSV of PIN frequencies bundled at build time
- **Deployment**: Static site (GitHub Pages, Netlify, or Vercel)

## Project Structure

```
passcode-pattern-recognition/
├── public/
│   └── data/
│       └── pin-frequency.csv          # 10,000 rows: pin,count
├── src/
│   ├── components/
│   │   ├── TapGrid.tsx                # Blank grid capture surface
│   │   ├── TapIndicator.tsx           # Visual feedback per tap
│   │   ├── ResultsPanel.tsx           # Three ranked lists
│   │   ├── WeightSlider.tsx           # Adjust heatmap vs frequency weight
│   │   └── SessionHistory.tsx         # Previous attempts
│   ├── lib/
│   │   ├── normalize.ts              # Center + scale tap coordinates
│   │   ├── heatmap.ts                # Gaussian scoring per digit
│   │   ├── frequency.ts              # PIN frequency lookup + ranking
│   │   ├── composite.ts              # Weighted composite scoring
│   │   ├── keypad.ts                 # Standard keypad geometry constants
│   │   └── candidates.ts            # Candidate generation + ranking
│   ├── data/
│   │   └── pin-frequency.ts          # Typed loader for CSV data
│   ├── hooks/
│   │   ├── useTapCapture.ts          # Touch/click event handling
│   │   └── useAnalysis.ts            # Orchestrates scoring pipeline
│   ├── types/
│   │   └── index.ts                  # Shared type definitions
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── lib/
│   │   ├── normalize.test.ts
│   │   ├── heatmap.test.ts
│   │   ├── frequency.test.ts
│   │   ├── composite.test.ts
│   │   └── candidates.test.ts
│   ├── components/
│   │   ├── TapGrid.test.tsx
│   │   └── ResultsPanel.test.tsx
│   └── integration/
│       └── full-pipeline.test.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ALGORITHM.md
│   └── DATA.md
├── AGENTS.md
├── CLAUDE.md
├── TODO.md
└── README.md
```

## Getting Started

```bash
npm install
npm run dev          # Start dev server
npm run test         # Run tests
npm run build        # Production build
```

## Security & Ethics

This tool is designed for **authorized penetration testing** and **security awareness training**. It demonstrates a well-documented vulnerability in unshielded PIN entry. It does not interact with any real payment terminals, keypad hardware, or authentication systems.

## Data Sources

PIN frequency data is derived from publicly available research:

- [DataGenetics PIN Analysis (2012)](http://www.datagenetics.com/blog/september32012/) — 3.4M PIN dataset
- [SecLists Common Credentials](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/four-digit-pin-codes-sorted-by-frequency-withcount.csv) — frequency-sorted CSV
- [Schneier on Security — PIN Analysis](https://www.schneier.com/blog/archives/2012/09/analysis_of_pin.html)
