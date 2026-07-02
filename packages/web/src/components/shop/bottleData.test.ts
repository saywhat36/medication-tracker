import { describe, expect, it } from 'vitest';
import type { Medication, RefillStatus } from '@medication-tracker/core';
import { bottleContents } from '../../theme/apothecary.js';
import { bottleFill, contentColorFor, toBottles } from './bottleData.js';

function med(overrides: Partial<Medication>): Medication {
  return {
    id: 'med-1',
    name: 'Fluoxetine',
    pillsAtPickup: 30,
    lastPickupDate: '2026-06-01',
    dosesPerDay: 1,
    refillLeadTimeDays: 7,
    schedule: ['09:00'],
    ...overrides,
  };
}

function status(overrides: Partial<RefillStatus>): RefillStatus {
  return {
    medicationId: 'med-1',
    pillsRemaining: 15,
    daysUntilRefill: 8,
    runOutDate: '2026-07-16',
    refillDate: '2026-07-09',
    ...overrides,
  };
}

describe('bottleFill', () => {
  it('should return the remaining fraction of the pickup amount', () => {
    expect(bottleFill(15, 30)).toBe(0.5);
    expect(bottleFill(30, 30)).toBe(1);
    expect(bottleFill(0, 30)).toBe(0);
  });

  it('should clamp to a full bottle when the count was bumped above the pickup amount', () => {
    expect(bottleFill(45, 30)).toBe(1);
  });

  it('should clamp negatives to empty', () => {
    expect(bottleFill(-3, 30)).toBe(0);
  });

  it('should treat a zero or negative pickup amount as empty rather than dividing by zero', () => {
    expect(bottleFill(10, 0)).toBe(0);
    expect(bottleFill(10, -1)).toBe(0);
  });
});

describe('contentColorFor', () => {
  it('should always pick from the bottle contents palette', () => {
    for (const name of ['Fluoxetine', 'Quetiapine', 'Metformin', 'x', '']) {
      expect(bottleContents).toContain(contentColorFor(name));
    }
  });

  it('should be deterministic and case-insensitive', () => {
    expect(contentColorFor('Fluoxetine')).toBe(contentColorFor('fluoxetine'));
    expect(contentColorFor('Metformin')).toBe(contentColorFor('Metformin'));
  });
});

describe('toBottles', () => {
  it('should join each medication with its refill status', () => {
    const bottles = toBottles([med({})], [status({})]);
    expect(bottles).toHaveLength(1);
    expect(bottles[0]).toMatchObject({
      id: 'med-1',
      name: 'Fluoxetine',
      pillsRemaining: 15,
      fill: 0.5,
    });
    expect(bottleContents).toContain(bottles[0]?.color);
  });

  it('should show an empty bottle when a medication has no refill status yet', () => {
    const bottles = toBottles([med({})], []);
    expect(bottles[0]).toMatchObject({ pillsRemaining: 0, fill: 0 });
  });

  it('should keep the medication order for stable shelf placement', () => {
    const meds = [med({ id: 'a', name: 'A' }), med({ id: 'b', name: 'B' })];
    const bottles = toBottles(meds, []);
    expect(bottles.map((b) => b.id)).toEqual(['a', 'b']);
  });
});
