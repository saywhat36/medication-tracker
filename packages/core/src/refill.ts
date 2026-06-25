import type { Medication, RefillStatus } from './types.js';

export function daysUntilRefill(med: Medication): number {
  if (med.dosesPerDay <= 0) {
    throw new Error('dosesPerDay must be greater than 0');
  }
  const daysOfSupply = Math.floor(med.pillsRemaining / med.dosesPerDay);
  return daysOfSupply - med.refillLeadTimeDays;
}

export function refillDate(med: Medication, today: string): string {
  const days = daysUntilRefill(med);
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getRefillStatus(med: Medication, today: string): RefillStatus {
  return {
    medicationId: med.id,
    daysUntilRefill: daysUntilRefill(med),
    refillDate: refillDate(med, today),
  };
}
