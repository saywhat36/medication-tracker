import { describe, expect, it } from 'vitest';
import { isEveningHour } from './evening.js';

describe('isEveningHour', () => {
  it('should be evening from 20:00', () => {
    expect(isEveningHour(20)).toBe(true);
    expect(isEveningHour(23)).toBe(true);
  });

  it('should stay evening through the small hours', () => {
    expect(isEveningHour(0)).toBe(true);
    expect(isEveningHour(5)).toBe(true);
  });

  it('should be daytime from 06:00 to 19:00', () => {
    expect(isEveningHour(6)).toBe(false);
    expect(isEveningHour(12)).toBe(false);
    expect(isEveningHour(19)).toBe(false);
  });
});
