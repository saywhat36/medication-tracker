import { describe, it, expect } from 'vitest';
import { daysUntilRefill, refillDate, getRefillStatus } from './refill.js';
import type { Medication } from './types.js';

const base: Medication = {
  id: 'med-1',
  name: 'Test pill',
  pillsRemaining: 30,
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['17:00'],
};

describe('daysUntilRefill', () => {
  it('returns days of supply minus lead time', () => {
    expect(daysUntilRefill(base)).toBe(23); // 30 days supply − 7 lead
  });

  it('floors partial days of supply', () => {
    // 31 pills / 2 per day = 15.5 → floor to 15, minus 7 lead = 8
    expect(daysUntilRefill({ ...base, pillsRemaining: 31, dosesPerDay: 2 })).toBe(8);
  });

  it('returns a negative number when already past the reorder point', () => {
    // 3 days supply − 7 lead = −4 (overdue; not clamped)
    expect(daysUntilRefill({ ...base, pillsRemaining: 3 })).toBe(-4);
  });

  it('throws when dosesPerDay is zero', () => {
    expect(() => daysUntilRefill({ ...base, dosesPerDay: 0 })).toThrow(
      'dosesPerDay must be greater than 0'
    );
  });

  it('throws when dosesPerDay is negative', () => {
    expect(() => daysUntilRefill({ ...base, dosesPerDay: -1 })).toThrow(
      'dosesPerDay must be greater than 0'
    );
  });
});

describe('refillDate', () => {
  it('returns an ISO date string offset by daysUntilRefill', () => {
    // base: 30 pills, 1/day, lead 7 → daysUntilRefill = 23
    expect(refillDate(base, '2026-06-25')).toBe('2026-07-18');
  });

  it('returns a past date when already overdue', () => {
    // 3 pills, 1/day, lead 7 → daysUntilRefill = -4
    expect(refillDate({ ...base, pillsRemaining: 3 }, '2026-06-25')).toBe('2026-06-21');
  });
});

describe('getRefillStatus', () => {
  it('returns a complete RefillStatus for a medication', () => {
    const status = getRefillStatus(base, '2026-06-25');
    expect(status).toEqual({
      medicationId: 'med-1',
      daysUntilRefill: 23,
      refillDate: '2026-07-18',
    });
  });
});
