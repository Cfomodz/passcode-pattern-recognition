# Data Specification

## PIN Frequency Dataset

### Source

The primary data source is the [SecLists four-digit-pin-codes-sorted-by-frequency-withcount.csv](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/four-digit-pin-codes-sorted-by-frequency-withcount.csv) from the SecLists project, a public security research dataset.

Additional reference: [DataGenetics PIN Analysis](http://www.datagenetics.com/blog/september32012/) based on 3.4 million exposed PINs.

### File Format

**Location**: `public/data/pin-frequency.csv`

**Format**: Two-column CSV, no header row.

```
pin,count
1234,255
1111,244
0000,221
...
8068,25
```

- **Column 1** (`pin`): 4-digit string, zero-padded (e.g., `0000`, `0007`)
- **Column 2** (`count`): Integer frequency count (higher = more commonly used)

### Requirements

| Requirement | Specification |
|-------------|---------------|
| Total rows | Exactly 10,000 (all PINs from `0000` to `9999`) |
| Uniqueness | Each PIN appears exactly once |
| Zero-padding | PINs are always 4 characters: `"0007"` not `"7"` |
| Count range | All counts ≥ 1 (no zero-count PINs) |
| Encoding | UTF-8, Unix line endings (LF) |
| Sort order | Descending by count (most frequent first) |

### Data Validation

At load time, the app must verify:

1. **Completeness**: Exactly 10,000 entries
2. **No duplicates**: Each PIN string is unique
3. **Valid format**: Each PIN matches `/^\d{4}$/`
4. **Positive counts**: Every count is a positive integer
5. **Coverage**: All PINs 0000-9999 are present

If validation fails, the app should show an error state rather than producing incorrect results.

### Data Loading

```typescript
// src/data/pin-frequency.ts

let cached: Map<string, number> | null = null;

export async function loadFrequencyData(): Promise<Map<string, number>> {
  if (cached) return cached;

  const response = await fetch('/data/pin-frequency.csv');
  const text = await response.text();
  const map = new Map<string, number>();

  for (const line of text.trim().split('\n')) {
    const [pin, countStr] = line.split(',');
    map.set(pin.padStart(4, '0'), parseInt(countStr, 10));
  }

  // Validation
  if (map.size !== 10000) {
    throw new Error(`Expected 10000 PINs, got ${map.size}`);
  }

  cached = map;
  return map;
}
```

### Key Statistics

From the DataGenetics analysis:

| Statistic | Value |
|-----------|-------|
| Most common PIN | `1234` (10.7% of all PINs in 3.4M dataset) |
| Top 20 PINs cover | ~27% of all usage |
| Least common PIN | `8068` (0.0007%) |
| To guess 50% of PINs | Only 426 unique PINs needed |
| To guess 33% of PINs | Only 61 unique PINs needed |

### Distribution Properties

- Distribution follows **Zipf's law** — extreme skew toward popular PINs
- This skew is what makes the frequency signal valuable: a PIN used by 10% of people is 1,000x more useful to guess than a PIN used by 0.01%
- The raw counts (not ranks) preserve this proportional information, which is critical for the weighted composite algorithm

### Frequency Normalization

For the composite scoring algorithm, frequency counts are normalized proportionally:

```typescript
// Within the context of current candidates only
const maxCount = Math.max(...candidateCounts);
const normalizedFreq = count / maxCount;  // Range: (0, 1]
```

This preserves the proportional relationships:
- `1234` (count 255) vs `8068` (count 25) → ratio 10.2x
- The composite score reflects this: `1234` gets 10.2x the frequency weight

### Privacy & Ethics

- This dataset is derived from **already-public breach data** analyzed in aggregate
- No individual PINs are linked to identifiable persons
- The data represents population-level statistical patterns only
- The same data is freely available in multiple security research publications
- Usage is for authorized penetration testing and security awareness only
