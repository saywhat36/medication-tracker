import { describe, expect, it } from 'vitest';
import { localHHMM } from './time.js';

describe('localHHMM', () => {
  it('should format as two-digit 24-hour HH:MM', () => {
    expect(localHHMM(new Date().toISOString())).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should render midnight as 00, not 24', () => {
    // Build an instant that is local midnight, then format it.
    const midnight = new Date();
    midnight.setHours(0, 5, 0, 0);
    expect(localHHMM(midnight.toISOString())).toBe('00:05');
  });
});
