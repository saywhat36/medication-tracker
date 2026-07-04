import { describe, expect, it } from 'vitest';
import { adherenceSummary, streakLabel } from './adherenceLabel.js';

describe('streakLabel', () => {
  it('should describe an active streak', () => {
    expect(streakLabel(5)).toBe('5-day streak');
    expect(streakLabel(1)).toBe('1-day streak');
  });

  it('should say there is no streak yet when the count is zero', () => {
    expect(streakLabel(0)).toBe('No streak yet');
  });
});

describe('adherenceSummary', () => {
  it('should format a percentage with its window', () => {
    expect(adherenceSummary(90, 30)).toBe('90% of doses taken (last 30 days)');
    expect(adherenceSummary(0, 7)).toBe('0% of doses taken (last 7 days)');
  });

  it('should say there is no data yet when the percentage is null, never 0% or NaN%', () => {
    expect(adherenceSummary(null, 30)).toBe('No data yet');
  });
});
