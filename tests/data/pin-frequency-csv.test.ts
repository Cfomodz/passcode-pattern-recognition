import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('pin-frequency.csv data integrity', () => {
  const csvPath = resolve(__dirname, '../../public/data/pin-frequency.csv');
  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.trim().split('\n');

  it('should contain exactly 10000 lines', () => {
    expect(lines).toHaveLength(10000);
  });

  it('should contain every PIN from 0000 to 9999 exactly once', () => {
    const pins = new Set<string>();
    for (const line of lines) {
      const [pin] = line.split(',');
      pins.add(pin);
    }
    expect(pins.size).toBe(10000);
    for (let i = 0; i < 10000; i++) {
      const pin = i.toString().padStart(4, '0');
      expect(pins.has(pin), `missing PIN: ${pin}`).toBe(true);
    }
  });

  it('should have a positive count for every PIN', () => {
    for (const line of lines) {
      const [pin, countStr] = line.split(',');
      const count = parseInt(countStr, 10);
      expect(count, `PIN ${pin} has count ${count}, expected >= 1`).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have valid 4-digit format for every PIN', () => {
    for (const line of lines) {
      const [pin] = line.split(',');
      expect(pin, `invalid PIN format: "${pin}"`).toMatch(/^\d{4}$/);
    }
  });

  it('should have no duplicate PINs', () => {
    const seen = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const [pin] = lines[i].split(',');
      if (seen.has(pin)) {
        expect.fail(`duplicate PIN ${pin} on lines ${seen.get(pin)! + 1} and ${i + 1}`);
      }
      seen.set(pin, i);
    }
  });
});
