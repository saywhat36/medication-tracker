import { describe, it, expect } from 'vitest';
import { daysUntilRefill } from './refill';
import type { Medication } from './types';

const baseMed: Medication = {
  id: 'med-1',
  name: 'Test pill',
  pillsRemaining: 30,
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['17:00'],
};

describe('daysUntilRefill', () => {
  it('is days of supply minus the lead time', () => {
    expect(daysUntilRefill(baseMed)).toBe(23);
  });

  it('floors partial days — you cannot take a fraction of a missing pill', () => {
    const med = { ...baseMed, pillsRemaining: 31, dosesPerDay: 2 };
    expect(daysUntilRefill(med)).toBe(8);
  });

  it('goes negative when you are already past the reorder point', () => {
    expect(daysUntilRefill({ ...baseMed, pillsRemaining: 3 })).toBe(-4);
  });
});
