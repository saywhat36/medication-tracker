import type { Medication, RefillStatus } from './types.js';

export function pillsRemaining(med: Medication, today: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = (Date.parse(today) - Date.parse(med.lastPickupDate)) / msPerDay;
  return Math.max(0, med.pillsAtPickup - Math.floor(daysSince * med.dosesPerDay));
}

// Whole days of supply left from today (pills remaining ÷ doses per day).
export function daysOfSupply(med: Medication, today: string): number {
  if (med.dosesPerDay <= 0) {
    throw new Error('dosesPerDay must be greater than 0');
  }
  return Math.floor(pillsRemaining(med, today) / med.dosesPerDay);
}

// Days until you should reorder = supply left minus the lead time. May be
// negative (already past the reorder point).
export function daysUntilRefill(med: Medication, today: string): number {
  return daysOfSupply(med, today) - med.refillLeadTimeDays;
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The date the pills are expected to run out.
export function runOutDate(med: Medication, today: string): string {
  return addDays(today, daysOfSupply(med, today));
}

// The date you should reorder by (lead time before running out). This is also
// when a refill reminder would be due.
export function refillDate(med: Medication, today: string): string {
  return addDays(today, daysUntilRefill(med, today));
}

export function getRefillStatus(med: Medication, today: string): RefillStatus {
  return {
    medicationId: med.id,
    pillsRemaining: pillsRemaining(med, today),
    daysUntilRefill: daysUntilRefill(med, today),
    runOutDate: runOutDate(med, today),
    refillDate: refillDate(med, today),
  };
}
