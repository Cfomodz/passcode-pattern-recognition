import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFrequencyData, resetCache } from '../../src/data/pin-frequency';
import { getFrequency, normalizeFrequency, rankByFrequency } from '../../src/lib/frequency';

describe('Data Layer', () => {
  describe('loadFrequencyData', () => {
    beforeEach(() => {
      resetCache();
      vi.restoreAllMocks();
    });

    it('loads and parses CSV data correctly (happy path)', async () => {
      // Generate a valid 10,000 line CSV
      const mockCsv = Array.from({ length: 10000 }, (_, i) => {
        const pin = i.toString().padStart(4, '0');
        return `${pin},${10000 - i}`;
      }).join('\n');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockCsv),
      } as Response));

      const map = await loadFrequencyData();
      expect(map.size).toBe(10000);
      expect(map.get('0000')).toBe(10000);
      expect(map.get('9999')).toBe(1);
    });

    it('throws error if data is incomplete (< 10000 rows)', async () => {
      const mockCsv = '1234,100\n0000,50'; // Only 2 entries
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockCsv),
      } as Response));

      await expect(loadFrequencyData()).rejects.toThrow('Expected 10000 PINs');
    });

    it('throws error on duplicate PINs', async () => {
      const shortCsv = '1234,100\n1234,50';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(shortCsv),
      } as Response));

      await expect(loadFrequencyData()).rejects.toThrow('Duplicate PIN found: 1234');
    });

    it('skips invalid PIN formats but fails completeness check', async () => {
      const mockCsv = '123,100\nABCD,50';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockCsv),
      } as Response));

      // It should skip these lines, resulting in empty map, then throw completeness error
      await expect(loadFrequencyData()).rejects.toThrow('Expected 10000 PINs');
    });
  });

  describe('frequency logic', () => {
    const mockMap = new Map([
      ['1234', 100],
      ['1111', 50],
      ['0000', 10]
    ]);

    it('getFrequency returns correct count for known PINs', () => {
      expect(getFrequency('1234', mockMap)).toBe(100);
      expect(getFrequency('1111', mockMap)).toBe(50);
    });

    it('getFrequency returns 0 for unknown PINs', () => {
      expect(getFrequency('9999', mockMap)).toBe(0);
    });

    it('normalizeFrequency preserves proportional relationships', () => {
      const max = 100;
      expect(normalizeFrequency(100, max)).toBe(1.0);
      expect(normalizeFrequency(50, max)).toBe(0.5);
      expect(normalizeFrequency(10, max)).toBe(0.1);
    });

    it('normalizeFrequency handles zero maxCount', () => {
      expect(normalizeFrequency(100, 0)).toBe(0);
    });

    it('rankByFrequency returns descending order', () => {
      const pins = ['0000', '1234', '1111', '9999'];
      const ranked = rankByFrequency(pins, mockMap);

      expect(ranked).toHaveLength(4);
      expect(ranked[0]).toEqual({ pin: '1234', score: 100 });
      expect(ranked[1]).toEqual({ pin: '1111', score: 50 });
      expect(ranked[2]).toEqual({ pin: '0000', score: 10 });
      expect(ranked[3]).toEqual({ pin: '9999', score: 0 });
    });
  });
});
