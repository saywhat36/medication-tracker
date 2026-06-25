import type { Medication } from './types';

export function daysUntilRefill(med: Medication): number {
  const daysOfSupply = Math.floor(med.pillsRemaining / med.dosesPerDay);
  return daysOfSupply - med.refillLeadTimeDays;
}
