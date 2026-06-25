import type { Medication } from './types.js';

export function daysUntilRefill(med: Medication): number {
  if (med.dosesPerDay <= 0) {
    throw new Error('dosesPerDay must be greater than 0');
  }
  const daysOfSupply = Math.floor(med.pillsRemaining / med.dosesPerDay);
  return daysOfSupply - med.refillLeadTimeDays;
}
