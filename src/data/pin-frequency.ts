let cached: Map<string, number> | null = null;

export async function loadFrequencyData(): Promise<Map<string, number>> {
  if (cached) return cached;

  const response = await fetch(`${import.meta.env.BASE_URL}data/pin-frequency.csv`);
  if (!response.ok) {
    throw new Error(`Failed to load frequency data: ${response.statusText}`);
  }
  
  const text = await response.text();
  const map = new Map<string, number>();
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length !== 2) continue;
    
    const [pin, countStr] = parts;
    
    // Validation: PIN must be 4 digits
    if (!/^\d{4}$/.test(pin)) {
      continue;
    }
    
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1) {
      continue;
    }

    if (map.has(pin)) {
        throw new Error(`Duplicate PIN found: ${pin}`);
    }

    map.set(pin, count);
  }

  // Validation: Completeness
  if (map.size !== 10000) {
    throw new Error(`Expected 10000 PINs, got ${map.size}`);
  }

  cached = map;
  return map;
}

// For testing purposes, allow resetting cache
export function resetCache() {
    cached = null;
}
