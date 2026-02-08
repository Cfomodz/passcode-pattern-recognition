# Algorithm Specification

This document formally specifies the three scoring algorithms used to rank candidate PINs.

## Coordinate System

### Standard Keypad Layout

The keypad is modeled as a grid in normalized coordinates `[0, 1] x [0, 1]`:

```
       col 0    col 1    col 2
       (0.167)  (0.500)  (0.833)

row 0 (0.125):  [1]      [2]      [3]
row 1 (0.375):  [4]      [5]      [6]
row 2 (0.625):  [7]      [8]      [9]
row 3 (0.875):           [0]
```

Key center coordinates (x, y) in normalized space:

| Digit | x     | y     |
|-------|-------|-------|
| 1     | 0.167 | 0.125 |
| 2     | 0.500 | 0.125 |
| 3     | 0.833 | 0.125 |
| 4     | 0.167 | 0.375 |
| 5     | 0.500 | 0.375 |
| 6     | 0.833 | 0.375 |
| 7     | 0.167 | 0.625 |
| 8     | 0.500 | 0.625 |
| 9     | 0.833 | 0.625 |
| 0     | 0.500 | 0.875 |

The x-coordinates divide the unit width into 3 equal columns (centers at 1/6, 3/6, 5/6).
The y-coordinates divide the unit height into 4 equal rows (centers at 1/8, 3/8, 5/8, 7/8).

---

## Step 1: Tap Normalization

### Input
Raw tap points `T = [(x₁,y₁), (x₂,y₂), (x₃,y₃), (x₄,y₄)]` in screen pixel coordinates.

### Process

1. **Compute bounding box**:
   - `x_min, x_max, y_min, y_max` of the 4 taps
   - `width = x_max - x_min`
   - `height = y_max - y_min`

2. **Handle degenerate cases**:
   - If `width == 0 && height == 0` (all taps in same spot): map all to center `(0.5, 0.5)`
   - If `width == 0` (vertical line): set `width = height` and center horizontally
   - If `height == 0` (horizontal line): set `height = width` and center vertically
   - Apply a minimum dimension threshold: if either dimension < 10% of the other, clamp to 10%

3. **Compute the keypad's aspect ratio target**:
   - Keypad aspect ratio: 3 columns / 4 rows = 0.75 (width/height)
   - If tap bounding box is wider than 0.75 ratio → pad height
   - If tap bounding box is taller → pad width
   - This ensures the taps map onto the correct keypad proportions

4. **Normalize to `[0, 1]`**:
   ```
   nx = (tap.x - adjusted_x_min) / adjusted_width
   ny = (tap.y - adjusted_y_min) / adjusted_height
   ```

### Output
Normalized taps `N = [(nx₁,ny₁), ..., (nx₄,ny₄)]` where each coordinate is in `[0, 1]`.

---

## Step 2: Heatmap Scoring (Per-Digit Probability)

### Input
A single normalized tap `(nx, ny)`.

### Process

For each digit `d ∈ {0, 1, 2, ..., 9}` with center `(cx_d, cy_d)`:

1. **Compute Euclidean distance**:
   ```
   dist_d = sqrt((nx - cx_d)² + (ny - cy_d)²)
   ```

2. **Apply Gaussian kernel**:
   ```
   raw_d = exp(-dist_d² / (2 * σ²))
   ```
   Where `σ` (sigma) controls the spread. Default `σ = 0.35`.

   Sigma calibration:
   - `σ = 0.20` → sharp: mostly assigns to nearest 1-2 digits
   - `σ = 0.35` → moderate: nearest digit dominates but neighbors get meaningful weight
   - `σ = 0.50` → broad: probability spreads widely, less discriminating

   The default of 0.35 is chosen because a human observer's spatial memory has meaningful uncertainty — they know the general region but not the exact key.

3. **Normalize to probability**:
   ```
   P(d | tap) = raw_d / Σ(raw_i for i in 0..9)
   ```

### Output
Array of 10 `{ digit, probability }` entries summing to 1.0, sorted descending by probability.

### Example

Tap at `(0.2, 0.15)` (near upper-left):
- Closest to digit `1` at `(0.167, 0.125)` → distance ≈ 0.042 → highest probability
- Next closest: `2` at `(0.500, 0.125)` → distance ≈ 0.302 → lower probability
- Next: `4` at `(0.167, 0.375)` → distance ≈ 0.253 → moderate probability
- Most distant: `9` at `(0.833, 0.625)` → distance ≈ 0.790 → near-zero probability

Expected ordering: `1 > 4 > 2 > 5 > 7 > 3 > 8 > 6 > 0 > 9`

---

## Step 3: Candidate Generation

### Input
Four `TapAnalysis` objects, each containing the 10 digit probabilities for that position.

### Process

1. **Select top-K digits per position**: For each of the 4 positions, take the `K` digits with highest probability. Default `K = 4`.

2. **Generate all combinations**: `K⁴` total candidates (default: 256).

3. **Score each candidate by heatmap probability**:
   ```
   heatmap_score(pin) = P(d₁|tap₁) × P(d₂|tap₂) × P(d₃|tap₃) × P(d₄|tap₄)
   ```
   This is the product of per-position probabilities for the chosen digits.

4. **Sort descending by heatmap_score**.

### Output
Ranked list of `PinCandidate` objects: `{ pin: string, score: number }`.

---

## Step 4: Three Ranking Methods

### List 1 — Heatmap Only

Take the full candidate list from Step 3, sorted by `heatmap_score`. Return top 10.

This is the "pure spatial" ranking — what does the finger motion alone suggest?

### List 2 — Frequency-Filtered

1. Take the top 25% of candidates by `heatmap_score` (i.e., top 64 out of 256 with default K=4).
2. Look up each PIN's real-world frequency count from the dataset.
3. Sort this filtered set by frequency count (descending).
4. Return top 10.

This answers: "Of the spatially plausible PINs, which ones are people most likely to actually use?"

Example from spec: If the motion pattern could match `1379`, `2359`, `1234`, etc., and `1234` has a vastly higher real-world frequency, it sorts to the top of this list.

### List 3 — Weighted Composite

For every candidate from Step 3:

1. **Normalize heatmap scores** across all candidates:
   ```
   norm_heatmap = heatmap_score / max(all heatmap_scores)
   ```

2. **Normalize frequency counts** proportionally:
   ```
   norm_freq = frequency_count / max(all frequency_counts across candidates)
   ```

   **Key principle**: The frequency normalization preserves proportional relationships. If PIN A has a count of 900 and PIN B has a count of 100, then `norm_freq_A / norm_freq_B = 9.0`. This means PIN A gets 9x the frequency weight — not just a higher rank. This is the "900% = 9x weight" principle from the spec.

3. **Compute composite score**:
   ```
   composite = (norm_heatmap × w_h) + (norm_freq × w_f)
   ```
   Where `w_h + w_f = 1.0`. Default: `w_h = 0.5, w_f = 0.5`.

4. **Sort descending by composite score**. Return top 10.

### Weight Interpretation

| `w_h` | `w_f` | Behavior |
|-------|-------|----------|
| 1.0   | 0.0   | Pure heatmap (same as List 1) |
| 0.0   | 1.0   | Pure frequency (different from List 2 — this considers ALL candidates, not just top 25%) |
| 0.5   | 0.5   | Equal blend (default) |
| 0.7   | 0.3   | Trust the spatial observation more |
| 0.3   | 0.7   | Trust population statistics more |

The user can adjust weights via the UI slider after seeing initial results.

---

## Worked Example

### Input

Tester observes: press (upper-left), move right, move down-left, move right.

Raw taps (simulated screen pixels, 375px wide viewport):
```
T1 = (80, 100)    # upper-left area
T2 = (280, 100)   # moved right, same height
T3 = (120, 350)   # moved down-left
T4 = (300, 350)   # moved right, same height
```

### Normalization

Bounding box: x=[80,300], y=[100,350] → width=220, height=250
Aspect ratio: 220/250 = 0.88 > 0.75, so pad height to 220/0.75 = 293.3
Adjusted y range centered: center_y=225, half_h=146.7 → y_min=78.3, y_max=371.7

Normalized:
```
N1 = ((80-80)/220, (100-78.3)/293.3) = (0.000, 0.074)
N2 = ((280-80)/220, (100-78.3)/293.3) = (0.909, 0.074)
N3 = ((120-80)/220, (350-78.3)/293.3) = (0.182, 0.926)
N4 = ((300-80)/220, (350-78.3)/293.3) = (1.000, 0.926)
```

### Heatmap (top 3 per position)

- N1 (0.000, 0.074) → nearest `1` (0.167, 0.125), then `4`, then `2`
- N2 (0.909, 0.074) → nearest `3` (0.833, 0.125), then `6`, then `2`
- N3 (0.182, 0.926) → nearest `0` (0.500, 0.875), then `7` (0.167, 0.625), then `8`
- N4 (1.000, 0.926) → nearest `9` (0.833, 0.625), then `6`, then `0`

### Heatmap Top Candidates (partial)
`1309`, `1379`, `1369`, `4309`, ...

### Frequency Re-Sort (top 25%)
Of the top candidates, check frequency: `1379` might have low real frequency while `1309` could rank differently. Actual ranking depends on the CSV data.

### Composite
With equal weights, a candidate needs both decent spatial match AND decent real-world usage to rank high. `1234` would only appear if the spatial pattern is broadly compatible (it wouldn't be here — the diagonal pattern doesn't match a 1-2-3-4 sequential layout).

---

## Configuration Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `sigma` | 0.35 | 0.1 - 1.0 | Gaussian spread for heatmap scoring |
| `topK` | 4 | 2 - 6 | Digits per position for candidate generation |
| `w_h` | 0.5 | 0.0 - 1.0 | Heatmap weight in composite score |
| `w_f` | 0.5 | 0.0 - 1.0 | Frequency weight in composite (= 1 - w_h) |
| `candidateFilterPct` | 0.25 | 0.1 - 0.5 | Top % of heatmap candidates used for frequency list |
| `resultCount` | 10 | 5 - 50 | Number of results shown per list |
