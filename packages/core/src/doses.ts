import type { Dose } from './types.js';

export function dosesDueAt(doses: Dose[], now: string): Dose[] {
  return doses.filter((d) => d.takenAt === null && d.scheduledFor <= now);
}

// All doses scheduled on a given calendar day (YYYY-MM-DD), taken or not.
// Used by the dashboard so taken doses stay visible and can be un-ticked.
export function dosesForDay(doses: Dose[], date: string): Dose[] {
  return doses.filter((d) => d.scheduledFor.slice(0, 10) === date);
}

export function isOverdue(dose: Dose, now: string, thresholdHours = 3): boolean {
  if (dose.takenAt !== null) return false;
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  return Date.parse(now) > Date.parse(dose.scheduledFor) + thresholdMs;
}
