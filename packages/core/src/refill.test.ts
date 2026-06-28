import { describe, it, expect } from 'vitest';
import { pillsRemaining, daysUntilRefill, runOutDate, refillDate, getRefillStatus } from './refill.js';
import type { Medication } from './types.js';

const TODAY = '2026-06-25';

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
  it('is pillsAtPickup when nothing has been taken', () => {
    expect(pillsRemaining(base, 0)).toBe(30);
  });

  it('subtracts one pill per dose taken since pickup', () => {
    expect(pillsRemaining(base, 10)).toBe(20);
  });

  it('clamps to zero rather than going negative', () => {
    expect(pillsRemaining(base, 40)).toBe(0);
  });
});

describe('daysUntilRefill', () => {
  it('returns days of supply minus lead time', () => {
    expect(daysUntilRefill(base, 0)).toBe(23); // 30 supply − 7 lead
  });

  it('reflects pills already taken', () => {
    // 30 − 5 = 25 supply, − 7 lead = 18
    expect(daysUntilRefill(base, 5)).toBe(18);
  });

  it('floors partial days of supply', () => {
    // 31 pills / 2 per day = 15.5 → floor 15, − 7 lead = 8
    expect(daysUntilRefill({ ...base, pillsAtPickup: 31, dosesPerDay: 2 }, 0)).toBe(8);
  });

  it('returns a negative number when already past the reorder point', () => {
    // 3 pills, 1/day → 3 − 7 = −4
    expect(daysUntilRefill({ ...base, pillsAtPickup: 3 }, 0)).toBe(-4);
  });

  it('throws when dosesPerDay is zero or negative', () => {
    expect(() => daysUntilRefill({ ...base, dosesPerDay: 0 }, 0)).toThrow(
      'dosesPerDay must be greater than 0'
    );
    expect(() => daysUntilRefill({ ...base, dosesPerDay: -1 }, 0)).toThrow(
      'dosesPerDay must be greater than 0'
    );
  });
});

describe('runOutDate', () => {
  it('returns today plus the whole days of supply', () => {
    expect(runOutDate(base, 0, TODAY)).toBe('2026-07-25'); // 30 days
  });

  it('moves closer as pills are taken', () => {
    expect(runOutDate(base, 5, TODAY)).toBe('2026-07-20'); // 25 days
  });

  it('is the reorder date plus the lead time', () => {
    expect(runOutDate(base, 0, TODAY)).toBe('2026-07-25');
    expect(refillDate(base, 0, TODAY)).toBe('2026-07-18');
  });
});

describe('refillDate', () => {
  it('returns an ISO date offset by daysUntilRefill', () => {
    expect(refillDate(base, 0, TODAY)).toBe('2026-07-18');
  });

  it('returns a past date when already overdue', () => {
    expect(refillDate({ ...base, pillsAtPickup: 3 }, 0, TODAY)).toBe('2026-06-21');
  });
});

describe('getRefillStatus', () => {
  it('returns a complete RefillStatus', () => {
    expect(getRefillStatus(base, 0, TODAY)).toEqual({
      medicationId: 'med-1',
      pillsRemaining: 30,
      daysUntilRefill: 23,
      runOutDate: '2026-07-25',
      refillDate: '2026-07-18',
    });
  });

  it('reflects doses already taken', () => {
    expect(getRefillStatus(base, 5, TODAY)).toEqual({
      medicationId: 'med-1',
      pillsRemaining: 25,
      daysUntilRefill: 18,
      runOutDate: '2026-07-20',
      refillDate: '2026-07-13',
    });
  });
});
