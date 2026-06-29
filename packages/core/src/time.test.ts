import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc, formatInZone, dateInZone } from './time.js';

describe('zonedTimeToUtc', () => {
  it('treats UTC times as-is', () => {
    expect(zonedTimeToUtc('2026-06-28', '13:00', 'UTC')).toBe('2026-06-28T13:00:00Z');
  });

  it('converts a London summer (BST, +1) time to UTC', () => {
    expect(zonedTimeToUtc('2026-06-28', '13:00', 'Europe/London')).toBe('2026-06-28T12:00:00Z');
  });

  it('converts a London winter (GMT, +0) time to UTC', () => {
    expect(zonedTimeToUtc('2026-01-15', '13:00', 'Europe/London')).toBe('2026-01-15T13:00:00Z');
  });

  it('handles a negative-offset zone (New York, -4 in summer)', () => {
    expect(zonedTimeToUtc('2026-06-28', '09:00', 'America/New_York')).toBe('2026-06-28T13:00:00Z');
  });
});

describe('formatInZone', () => {
  it('renders a UTC instant as local wall-clock time', () => {
    expect(formatInZone('2026-06-28T12:00:00Z', 'Europe/London')).toBe('13:00'); // BST
    expect(formatInZone('2026-01-15T13:00:00Z', 'Europe/London')).toBe('13:00'); // GMT
    expect(formatInZone('2026-06-28T13:00:00Z', 'UTC')).toBe('13:00');
  });
});

describe('dateInZone', () => {
  it('returns the local calendar date of an instant', () => {
    expect(dateInZone('2026-06-28T12:00:00Z', 'Europe/London')).toBe('2026-06-28');
  });

  it('rolls over the date near midnight in the local zone', () => {
    expect(dateInZone('2026-06-28T23:30:00Z', 'Europe/London')).toBe('2026-06-29');
  });

  it('round-trips with zonedTimeToUtc', () => {
    const instant = zonedTimeToUtc('2026-06-28', '21:00', 'Europe/London');
    expect(dateInZone(instant, 'Europe/London')).toBe('2026-06-28');
    expect(formatInZone(instant, 'Europe/London')).toBe('21:00');
  });
});
