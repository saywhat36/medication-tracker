import { describe, it, expect } from 'vitest';
import {
  dosesDueAt,
  dosesForDay,
  scheduledDosesForDay,
  dosesTakenSincePickup,
  computeReschedule,
  isOverdue,
} from './doses.js';
import type { Dose, Medication } from './types.js';

const taken: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T08:00:00Z',
  takenAt: '2026-06-25T08:05:00Z',
};

const pending: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T08:00:00Z',
  takenAt: null,
};

const future: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T21:00:00Z',
  takenAt: null,
};

describe('dosesDueAt', () => {
  const now = '2026-06-25T12:00:00Z';

  it('returns pending doses whose scheduledFor is at or before now', () => {
    expect(dosesDueAt([pending], now)).toEqual([pending]);
  });

  it('excludes doses scheduled in the future', () => {
    expect(dosesDueAt([future], now)).toEqual([]);
  });

  it('excludes doses that have already been taken', () => {
    expect(dosesDueAt([taken], now)).toEqual([]);
  });

  it('includes a dose scheduled exactly at now', () => {
    const atNow: Dose = { ...pending, scheduledFor: now };
    expect(dosesDueAt([atNow], now)).toEqual([atNow]);
  });

  it('handles a mixed list correctly', () => {
    expect(dosesDueAt([pending, taken, future], now)).toEqual([pending]);
  });
});

describe('dosesForDay', () => {
  it('returns both taken and pending doses on the given day', () => {
    expect(dosesForDay([pending, taken], '2026-06-25', 'UTC')).toEqual([pending, taken]);
  });

  it('excludes doses scheduled on a different day', () => {
    const tomorrow: Dose = { ...pending, scheduledFor: '2026-06-26T08:00:00Z' };
    expect(dosesForDay([pending, tomorrow], '2026-06-25', 'UTC')).toEqual([pending]);
  });

  it('returns an empty array when no doses fall on the day', () => {
    expect(dosesForDay([pending], '2026-06-24', 'UTC')).toEqual([]);
  });

  it('uses the local day in the given timezone (near-midnight rollover)', () => {
    // 23:30 UTC is 00:30 the next day in BST, so it belongs to the 26th in London.
    const lateNight: Dose = { ...pending, scheduledFor: '2026-06-25T23:30:00Z' };
    expect(dosesForDay([lateNight], '2026-06-26', 'Europe/London')).toEqual([lateNight]);
    expect(dosesForDay([lateNight], '2026-06-25', 'Europe/London')).toEqual([]);
  });
});

describe('scheduledDosesForDay', () => {
  const meds: Medication[] = [
    {
      id: 'med-1',
      name: 'Metformin',
      pillsAtPickup: 30,
      lastPickupDate: '2026-06-25',
      dosesPerDay: 2,
      refillLeadTimeDays: 7,
      schedule: ['08:00', '21:00'],
    },
    {
      id: 'med-2',
      name: 'Lisinopril',
      pillsAtPickup: 10,
      lastPickupDate: '2026-06-25',
      dosesPerDay: 1,
      refillLeadTimeDays: 7,
      schedule: ['09:00'],
    },
  ];

  it('produces one untaken dose per scheduled time per medication (UTC)', () => {
    const doses = scheduledDosesForDay(meds, '2026-06-26', 'UTC');
    expect(doses).toEqual([
      { medicationId: 'med-1', scheduledFor: '2026-06-26T08:00:00Z', takenAt: null },
      { medicationId: 'med-1', scheduledFor: '2026-06-26T21:00:00Z', takenAt: null },
      { medicationId: 'med-2', scheduledFor: '2026-06-26T09:00:00Z', takenAt: null },
    ]);
  });

  it('converts schedule times from the timezone to UTC instants', () => {
    const doses = scheduledDosesForDay(meds, '2026-06-26', 'Europe/London');
    expect(doses.map((d) => d.scheduledFor)).toEqual([
      '2026-06-26T07:00:00Z',
      '2026-06-26T20:00:00Z',
      '2026-06-26T08:00:00Z',
    ]);
  });

  it('returns an empty array when there are no medications', () => {
    expect(scheduledDosesForDay([], '2026-06-26', 'UTC')).toEqual([]);
  });
});

describe('computeReschedule', () => {
  const doses: Dose[] = [
    { medicationId: 'med-1', scheduledFor: '2026-06-26T08:00:00Z', takenAt: null },
    { medicationId: 'med-1', scheduledFor: '2026-06-27T08:00:00Z', takenAt: null },
    { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: '2026-06-25T08:05:00Z' },
  ];

  it('moves untaken doses on/after fromDate to the new time (UTC)', () => {
    const { toRemove, toAdd } = computeReschedule(doses, 'med-1', '08:00', '10:00', '2026-06-26', 'UTC');
    expect(toRemove.map((d) => d.scheduledFor)).toEqual([
      '2026-06-26T08:00:00Z',
      '2026-06-27T08:00:00Z',
    ]);
    expect(toAdd.map((d) => d.scheduledFor)).toEqual([
      '2026-06-26T10:00:00Z',
      '2026-06-27T10:00:00Z',
    ]);
  });

  it('leaves taken history and earlier doses untouched', () => {
    const { toRemove } = computeReschedule(doses, 'med-1', '08:00', '10:00', '2026-06-27', 'UTC');
    expect(toRemove.map((d) => d.scheduledFor)).toEqual(['2026-06-27T08:00:00Z']);
  });

  it('matches and produces times in the given timezone', () => {
    // 07:00Z is 08:00 BST; rescheduling local 08:00 -> 09:00 yields 08:00Z.
    const bstDoses: Dose[] = [
      { medicationId: 'med-1', scheduledFor: '2026-06-26T07:00:00Z', takenAt: null },
    ];
    const { toRemove, toAdd } = computeReschedule(
      bstDoses,
      'med-1',
      '08:00',
      '09:00',
      '2026-06-26',
      'Europe/London'
    );
    expect(toRemove).toHaveLength(1);
    expect(toAdd[0].scheduledFor).toBe('2026-06-26T08:00:00Z');
  });
});

describe('dosesTakenSincePickup', () => {
  const med: Medication = {
    id: 'med-1',
    name: 'Metformin',
    pillsAtPickup: 30,
    lastPickupDate: '2026-06-25',
    dosesPerDay: 1,
    refillLeadTimeDays: 7,
    schedule: ['08:00'],
  };

  it('counts this medication\'s taken doses on/after the pickup date', () => {
    const doses: Dose[] = [
      { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: '2026-06-25T08:05:00Z' },
      { medicationId: 'med-1', scheduledFor: '2026-06-26T08:00:00Z', takenAt: '2026-06-26T08:05:00Z' },
      { medicationId: 'med-1', scheduledFor: '2026-06-26T21:00:00Z', takenAt: null }, // not taken
      { medicationId: 'med-1', scheduledFor: '2026-06-24T08:00:00Z', takenAt: '2026-06-24T08:05:00Z' }, // before pickup
      { medicationId: 'med-2', scheduledFor: '2026-06-26T08:00:00Z', takenAt: '2026-06-26T08:05:00Z' }, // other med
    ];
    expect(dosesTakenSincePickup(doses, med)).toBe(2);
  });

  it('is zero when nothing has been taken', () => {
    const doses: Dose[] = [
      { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null },
    ];
    expect(dosesTakenSincePickup(doses, med)).toBe(0);
  });
});

describe('isOverdue', () => {
  it('returns false for a taken dose regardless of time', () => {
    expect(isOverdue(taken, '2026-06-25T20:00:00Z')).toBe(false);
  });

  it('returns false when now is before the threshold', () => {
    // scheduled 08:00, threshold 3h → overdue after 11:00; now is 10:59
    expect(isOverdue(pending, '2026-06-25T10:59:00Z')).toBe(false);
  });

  it('returns false when now is exactly at the threshold boundary', () => {
    // scheduled 08:00 + 3h = 11:00; boundary is not yet overdue
    expect(isOverdue(pending, '2026-06-25T11:00:00Z')).toBe(false);
  });

  it('returns true when now is past the threshold', () => {
    expect(isOverdue(pending, '2026-06-25T11:01:00Z')).toBe(true);
  });

  it('respects a custom threshold', () => {
    // scheduled 08:00, threshold 1h → overdue after 09:00
    expect(isOverdue(pending, '2026-06-25T09:01:00Z', 1)).toBe(true);
    expect(isOverdue(pending, '2026-06-25T08:59:00Z', 1)).toBe(false);
  });
});
