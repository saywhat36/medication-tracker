import type { Dose, Medication } from './types.js';

export function dosesDueAt(doses: Dose[], now: string): Dose[] {
  return doses.filter((d) => d.takenAt === null && d.scheduledFor <= now);
}

// All doses scheduled on a given calendar day (YYYY-MM-DD), taken or not.
// Used by the dashboard so taken doses stay visible and can be un-ticked.
export function dosesForDay(doses: Dose[], date: string): Dose[] {
  return doses.filter((d) => d.scheduledFor.slice(0, 10) === date);
}

// The dose rows a set of medications should have on a given day, derived from
// each medication's schedule. All start untaken. This is what lets doses recur
// day after day instead of only existing on the day a medication was added.
export function scheduledDosesForDay(medications: Medication[], date: string): Dose[] {
  return medications.flatMap((med) =>
    med.schedule.map((time) => ({
      medicationId: med.id,
      scheduledFor: `${date}T${time}:00Z`,
      takenAt: null,
    }))
  );
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
