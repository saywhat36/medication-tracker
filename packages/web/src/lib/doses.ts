import type { Dose } from '@medication-tracker/core';

// A dose is identified by BOTH medication and time — several medications are
// often scheduled at the same instant (e.g. everything at 09:00), so matching
// on scheduledFor alone ticks the whole 09:00 row at once.
export function setDoseTaken(
  doses: Dose[],
  medicationId: string,
  scheduledFor: string,
  takenAt: string | null
): Dose[] {
  return doses.map((d) =>
    d.medicationId === medicationId && d.scheduledFor === scheduledFor ? { ...d, takenAt } : d
  );
}

// Composite key for per-dose UI state (pending flags, edit targets, refs).
export function doseKey(dose: Pick<Dose, 'medicationId' | 'scheduledFor'>): string {
  return `${dose.medicationId}-${dose.scheduledFor}`;
}
