import { describe, it, expect } from 'vitest';
import { pillsRemaining, daysUntilRefill, runOutDate, refillDate, getRefillStatus } from './refill.js';
import type { Medication } from './types.js';

const TODAY = '2026-06-25';

// Picked up 30 pills on 2026-06-25 (today), so none consumed yet.
const base: Medication = {
  id: 'med-1',
  name: 'Test pill',
  pillsAtPickup: 30,
  lastPickupDate: '2026-06-25',
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['17:00'],
};

describe('pillsRemaining', () => {
  it('returns pillsAtPickup on the day of pickup (no doses consumed)', () => {
    expect(pillsRemaining(base, '2026-06-25')).toBe(30);
  });

  it('subtracts one pill per day of supply consumed', () => {
    expect(pillsRemaining(base, '2026-07-05')).toBe(20); // 10 days later
  });

  it('floors partial days (does not subtract until a full day has elapsed)', () => {
    // 2 doses/day, 10 days later = 20 consumed → 10 remaining
    expect(pillsRemaining({ ...base, dosesPerDay: 2 }, '2026-07-05')).toBe(10);
  });

  it('clamps to zero rather than going negative', () => {
    expect(pillsRemaining(base, '2027-01-01')).toBe(0); // well past empty
  });
});

describe('daysUntilRefill', () => {
  it('returns days of supply minus lead time', () => {
    // 30 pills, 1/day → 30 days supply − 7 lead = 23
    expect(daysUntilRefill(base, TODAY)).toBe(23);
  });

  it('floors partial days of supply', () => {
    // 31 pills / 2 per day = 15.5 → floor to 15, minus 7 lead = 8
    expect(daysUntilRefill({ ...base, pillsAtPickup: 31, dosesPerDay: 2 }, TODAY)).toBe(8);
  });

  it('returns a negative number when already past the reorder point', () => {
    // picked up 3 pills today → 3 days supply − 7 lead = −4
    expect(daysUntilRefill({ ...base, pillsAtPickup: 3 }, TODAY)).toBe(-4);
  });

  it('throws when dosesPerDay is zero', () => {
    expect(() => daysUntilRefill({ ...base, dosesPerDay: 0 }, TODAY)).toThrow(
      'dosesPerDay must be greater than 0'
    );
  });

  it('throws when dosesPerDay is negative', () => {
    expect(() => daysUntilRefill({ ...base, dosesPerDay: -1 }, TODAY)).toThrow(
      'dosesPerDay must be greater than 0'
    );
  });
});

describe('refillDate', () => {
  it('returns an ISO date string offset by daysUntilRefill', () => {
    expect(refillDate(base, TODAY)).toBe('2026-07-18');
  });

  it('returns a past date when already overdue', () => {
    expect(refillDate({ ...base, pillsAtPickup: 3 }, TODAY)).toBe('2026-06-21');
  });
});

describe('runOutDate', () => {
  it('returns today plus the whole days of supply', () => {
    // 30 pills, 1/day from 2026-06-25 → runs out 2026-07-25
    expect(runOutDate(base, TODAY)).toBe('2026-07-25');
  });

  it('is the reorder date plus the lead time', () => {
    // refillDate 2026-07-18 + 7 lead days = 2026-07-25
    expect(runOutDate(base, TODAY)).toBe('2026-07-25');
    expect(refillDate(base, TODAY)).toBe('2026-07-18');
  });
});

describe('getRefillStatus', () => {
  it('returns a complete RefillStatus including computed pillsRemaining', () => {
    const status = getRefillStatus(base, TODAY);
    expect(status).toEqual({
      medicationId: 'med-1',
      pillsRemaining: 30,
      daysUntilRefill: 23,
      runOutDate: '2026-07-25',
      refillDate: '2026-07-18',
    });
  });
});
