import type { Medication, RefillStatus } from './types.js';

export function pillsRemaining(med: Medication, today: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = (Date.parse(today) - Date.parse(med.lastPickupDate)) / msPerDay;
  return Math.max(0, med.pillsAtPickup - Math.floor(daysSince * med.dosesPerDay));
}

export function daysUntilRefill(med: Medication, today: string): number {
  if (med.dosesPerDay <= 0) {
    throw new Error('dosesPerDay must be greater than 0');
  }
  const daysOfSupply = Math.floor(pillsRemaining(med, today) / med.dosesPerDay);
  return daysOfSupply - med.refillLeadTimeDays;
}

export function refillDate(med: Medication, today: string): string {
  const days = daysUntilRefill(med, today);
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getRefillStatus(med: Medication, today: string): RefillStatus {
  return {
    medicationId: med.id,
    pillsRemaining: pillsRemaining(med, today),
    daysUntilRefill: daysUntilRefill(med, today),
    refillDate: refillDate(med, today),
  };
}
