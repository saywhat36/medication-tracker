import type { Dose, Medication } from './types.js';
import { zonedTimeToUtc, dateInZone, formatInZone } from './time.js';

export function dosesDueAt(doses: Dose[], now: string): Dose[] {
  return doses.filter((d) => d.takenAt === null && d.scheduledFor <= now);
}

// All doses scheduled on a given local calendar day (YYYY-MM-DD in `timeZone`),
// taken or not. Used by the dashboard so taken doses stay visible and can be
// un-ticked. scheduledFor is a true UTC instant, so the day is compared in the
// configured timezone (handles the near-midnight rollover).
export function dosesForDay(doses: Dose[], date: string, timeZone: string): Dose[] {
  return doses.filter((d) => dateInZone(d.scheduledFor, timeZone) === date);
}

// The dose rows a set of medications should have on a given local day, derived
// from each medication's schedule (wall-clock times in `timeZone`). Each
// scheduledFor is the true UTC instant for that local time. This is what lets
// doses recur day after day instead of only existing on the add day.
export function scheduledDosesForDay(
  medications: Medication[],
  date: string,
  timeZone: string
): Dose[] {
  return medications.flatMap((med) =>
    med.schedule.map((time) => ({
      medicationId: med.id,
      scheduledFor: zonedTimeToUtc(date, time, timeZone),
      takenAt: null,
    }))
  );
}

// Work out how to move a medication's untaken doses from oldTime to newTime, for
// days on/after fromDate, with times interpreted in `timeZone`. Returns the doses
// to remove and the replacements to add; the caller applies them. Taken doses
// (history) are left alone.
export function computeReschedule(
  doses: Dose[],
  medicationId: string,
  oldTime: string,
  newTime: string,
  fromDate: string,
  timeZone: string
): { toRemove: Dose[]; toAdd: Dose[] } {
  const toRemove = doses.filter(
    (d) =>
      d.medicationId === medicationId &&
      d.takenAt === null &&
      dateInZone(d.scheduledFor, timeZone) >= fromDate &&
      formatInZone(d.scheduledFor, timeZone) === oldTime
  );
  const toAdd = toRemove.map((d) => ({
    medicationId,
    scheduledFor: zonedTimeToUtc(dateInZone(d.scheduledFor, timeZone), newTime, timeZone),
    takenAt: null,
  }));
  return { toRemove, toAdd };
}

// How many of a medication's doses have been ticked off since its last pickup.
// Each ticked dose represents one pill consumed from the current supply.
export function dosesTakenSincePickup(doses: Dose[], med: Medication): number {
  const since = `${med.lastPickupDate}T00:00:00Z`;
  return doses.filter(
    (d) => d.medicationId === med.id && d.takenAt !== null && d.scheduledFor >= since
  ).length;
}

export function isOverdue(dose: Dose, now: string, thresholdHours = 3): boolean {
  if (dose.takenAt !== null) return false;
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  return Date.parse(now) > Date.parse(dose.scheduledFor) + thresholdMs;
}
