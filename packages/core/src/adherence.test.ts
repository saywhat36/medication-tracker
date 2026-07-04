import { describe, it, expect } from 'vitest';
import { dosesInRange, computeAdherence } from './adherence.js';
import { addDaysToDate } from './time.js';
import type { Dose } from './types.js';

const TODAY = '2026-06-25';

function doseOn(date: string, taken: boolean, medicationId = 'med-1'): Dose {
  return {
    medicationId,
    scheduledFor: `${date}T08:00:00Z`,
    takenAt: taken ? `${date}T08:05:00Z` : null,
  };
}

describe('dosesInRange', () => {
  it('includes doses on the start and end dates (inclusive boundaries)', () => {
    const doses = [doseOn('2026-06-20', true), doseOn('2026-06-25', true)];
    expect(dosesInRange(doses, '2026-06-20', '2026-06-25', 'UTC')).toEqual(doses);
  });

  it('excludes doses outside the range', () => {
    const before = doseOn('2026-06-19', true);
    const inside = doseOn('2026-06-22', true);
    const after = doseOn('2026-06-26', true);
    expect(dosesInRange([before, inside, after], '2026-06-20', '2026-06-25', 'UTC')).toEqual([inside]);
  });

  it('uses the local day in the given timezone (near-midnight rollover)', () => {
    // 23:30 UTC is 00:30 the next day in BST, so it belongs to the 26th in London.
    const lateNight: Dose = {
      medicationId: 'med-1',
      scheduledFor: '2026-06-25T23:30:00Z',
      takenAt: null,
    };
    expect(dosesInRange([lateNight], '2026-06-26', '2026-06-26', 'Europe/London')).toEqual([lateNight]);
    expect(dosesInRange([lateNight], '2026-06-25', '2026-06-25', 'Europe/London')).toEqual([]);
  });
});

describe('computeAdherence', () => {
  it('returns zero counts and a null percentage when there are no doses', () => {
    expect(computeAdherence([], 'med-1', TODAY, 'UTC')).toEqual({
      medicationId: 'med-1',
      windowDays: 30,
      scheduledCount: 0,
      takenCount: 0,
      adherencePercentage: null,
      currentStreakDays: 0,
    });
  });

  it('only considers doses for the given medication', () => {
    const doses: Dose[] = [doseOn(TODAY, true, 'med-1'), doseOn(TODAY, false, 'med-2')];
    const result = computeAdherence(doses, 'med-1', TODAY, 'UTC');
    expect(result.scheduledCount).toBe(1);
    expect(result.takenCount).toBe(1);
  });

  it('rounds the adherence percentage to the nearest whole number', () => {
    const doses: Dose[] = [
      doseOn(TODAY, true),
      doseOn(addDaysToDate(TODAY, -1), true),
      doseOn(addDaysToDate(TODAY, -2), false),
    ];
    const result = computeAdherence(doses, 'med-1', TODAY, 'UTC');
    expect(result.scheduledCount).toBe(3);
    expect(result.takenCount).toBe(2);
    expect(result.adherencePercentage).toBe(67); // 2/3 = 66.67% -> rounds to 67
  });

  it('counts a run of fully-taken consecutive days ending yesterday as the streak', () => {
    const N = 5;
    const doses: Dose[] = [];
    for (let i = 1; i <= N; i++) {
      doses.push(doseOn(addDaysToDate(TODAY, -i), true));
    }
    expect(computeAdherence(doses, 'med-1', TODAY, 'UTC').currentStreakDays).toBe(N);
  });

  it('stops the streak at a day with zero scheduled doses, without counting days before the gap', () => {
    const doses: Dose[] = [
      doseOn(addDaysToDate(TODAY, -1), true),
      doseOn(addDaysToDate(TODAY, -2), true),
      doseOn(addDaysToDate(TODAY, -3), true),
      // day -4 has no scheduled doses at all
      doseOn(addDaysToDate(TODAY, -5), true),
      doseOn(addDaysToDate(TODAY, -6), true),
    ];
    expect(computeAdherence(doses, 'med-1', TODAY, 'UTC').currentStreakDays).toBe(3);
  });

  it('stops the streak at a day where only some of that day\'s doses were taken', () => {
    const partialDay = addDaysToDate(TODAY, -3);
    const doses: Dose[] = [
      doseOn(addDaysToDate(TODAY, -1), true),
      doseOn(addDaysToDate(TODAY, -2), true),
      doseOn(partialDay, true),
      { medicationId: 'med-1', scheduledFor: `${partialDay}T21:00:00Z`, takenAt: null },
      doseOn(addDaysToDate(TODAY, -4), true),
    ];
    expect(computeAdherence(doses, 'med-1', TODAY, 'UTC').currentStreakDays).toBe(2);
  });

  it('never lets today\'s own pending doses affect the streak', () => {
    const doses: Dose[] = [
      doseOn(addDaysToDate(TODAY, -1), true),
      doseOn(addDaysToDate(TODAY, -2), true),
      doseOn(addDaysToDate(TODAY, -3), true),
      { medicationId: 'med-1', scheduledFor: `${TODAY}T08:00:00Z`, takenAt: null }, // today, still pending
    ];
    expect(computeAdherence(doses, 'med-1', TODAY, 'UTC').currentStreakDays).toBe(3);
  });

  it('bounds scheduledCount/takenCount by windowDays', () => {
    const doses: Dose[] = [];
    for (let i = 1; i <= 35; i++) {
      doses.push(doseOn(addDaysToDate(TODAY, -i), true));
    }
    const result = computeAdherence(doses, 'med-1', TODAY, 'UTC', 30);
    // window is [today-29, today]; today itself has no dose, so only
    // the 29 days from -29..-1 fall inside the 30-day window.
    expect(result.scheduledCount).toBe(29);
    expect(result.takenCount).toBe(29);
    expect(result.adherencePercentage).toBe(100);
  });

  it('reports a streak longer than windowDays in full, without truncating', () => {
    const doses: Dose[] = [];
    for (let i = 1; i <= 35; i++) {
      doses.push(doseOn(addDaysToDate(TODAY, -i), true));
    }
    const result = computeAdherence(doses, 'med-1', TODAY, 'UTC', 30);
    expect(result.currentStreakDays).toBe(35);
  });
});
