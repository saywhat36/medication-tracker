import type { Dose } from './types.js';

export function dosesDueAt(doses: Dose[], now: string): Dose[] {
  return doses.filter((d) => d.takenAt === null && d.scheduledFor <= now);
}

export function isOverdue(dose: Dose, now: string, thresholdHours = 3): boolean {
  if (dose.takenAt !== null) return false;
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  return Date.parse(now) > Date.parse(dose.scheduledFor) + thresholdMs;
}
