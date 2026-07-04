import type { Dose, MedicationAdherence } from './types.js';
import { dateInZone, addDaysToDate } from './time.js';

// How far back computeAdherence's streak walk will look before giving up —
// comfortably longer than any realistic streak, but still a hard bound.
export const MAX_STREAK_LOOKBACK_DAYS = 3650;

// Doses (any medication) whose scheduled local day (via dateInZone) falls
// within [startDate, endDate] inclusive. Mirrors dosesForDay's day-boundary
// logic (packages/core/src/doses.ts) but over a range instead of one day.
export function dosesInRange(
  doses: Dose[],
  startDate: string,
  endDate: string,
  timeZone: string
): Dose[] {
  return doses.filter((d) => {
    const day = dateInZone(d.scheduledFor, timeZone);
    return day >= startDate && day <= endDate;
  });
}

// windowDays defaults to 30.
export function computeAdherence(
  doses: Dose[],
  medicationId: string,
  today: string,
  timeZone: string,
  windowDays = 30
): MedicationAdherence {
  const medDoses = doses.filter((d) => d.medicationId === medicationId);

  const windowStart = addDaysToDate(today, -(windowDays - 1));
  const windowDoses = dosesInRange(medDoses, windowStart, today, timeZone);
  const scheduledCount = windowDoses.length;
  const takenCount = windowDoses.filter((d) => d.takenAt !== null).length;
  const adherencePercentage =
    scheduledCount === 0 ? null : Math.round((takenCount / scheduledCount) * 100);

  let currentStreakDays = 0;
  let cursor = addDaysToDate(today, -1);
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const dayDoses = dosesInRange(medDoses, cursor, cursor, timeZone);
    if (dayDoses.length === 0) break;
    if (dayDoses.some((d) => d.takenAt === null)) break;
    currentStreakDays++;
    cursor = addDaysToDate(cursor, -1);
  }

  return {
    medicationId,
    windowDays,
    scheduledCount,
    takenCount,
    adherencePercentage,
    currentStreakDays,
  };
}
