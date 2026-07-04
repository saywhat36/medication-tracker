import type { Medication, RefillStatus } from './types.js';
import { addDaysToDate } from './time.js';

// Pills physically left = what you picked up, minus doses already taken before
// the app started tracking (entered at registration), minus doses ticked off
// since. (See dosesTakenSincePickup in doses.ts for the ticked count.)
export function pillsRemaining(med: Medication, takenSincePickup: number): number {
  return Math.max(0, med.pillsAtPickup - (med.priorDosesTaken ?? 0) - takenSincePickup);
}

// Whole days of supply left (pills remaining ÷ doses per day).
export function daysOfSupply(med: Medication, takenSincePickup: number): number {
  if (med.dosesPerDay <= 0) {
    throw new Error('dosesPerDay must be greater than 0');
  }
  return Math.floor(pillsRemaining(med, takenSincePickup) / med.dosesPerDay);
}

// Days until you should reorder = supply left minus the lead time. May be
// negative (already past the reorder point).
export function daysUntilRefill(med: Medication, takenSincePickup: number): number {
  return daysOfSupply(med, takenSincePickup) - med.refillLeadTimeDays;
}

// The date the pills are expected to run out (assuming scheduled use from today).
export function runOutDate(med: Medication, takenSincePickup: number, today: string): string {
  return addDaysToDate(today, daysOfSupply(med, takenSincePickup));
}

// The date you should reorder by (lead time before running out). This is also
// when a refill reminder would be due.
export function refillDate(med: Medication, takenSincePickup: number, today: string): string {
  return addDaysToDate(today, daysUntilRefill(med, takenSincePickup));
}

export function getRefillStatus(
  med: Medication,
  takenSincePickup: number,
  today: string
): RefillStatus {
  return {
    medicationId: med.id,
    pillsRemaining: pillsRemaining(med, takenSincePickup),
    daysUntilRefill: daysUntilRefill(med, takenSincePickup),
    runOutDate: runOutDate(med, takenSincePickup, today),
    refillDate: refillDate(med, takenSincePickup, today),
  };
}
