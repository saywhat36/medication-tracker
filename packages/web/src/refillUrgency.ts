// How urgently a medication needs reordering. Shared by the classic view's
// refill badge and the shop view's REMEMBER note so the two views can never
// disagree about the thresholds.
//
// daysUntilRefill counts down to the reorder deadline (runs-out minus the
// user's lead time) and drives urgency; daysUntilRunOut is the actual days of
// supply left and is what's displayed.
export type RefillUrgency = 'out' | 'reorder-now' | 'order-soon' | 'ok';

export function refillUrgency(daysUntilRefill: number, daysUntilRunOut: number): RefillUrgency {
  if (daysUntilRunOut <= 0) return 'out';
  if (daysUntilRefill <= 0) return 'reorder-now';
  if (daysUntilRefill <= 7) return 'order-soon';
  return 'ok';
}

// Lower rank = more urgent; for sorting lists and picking the worst case.
export const urgencyRank: Record<RefillUrgency, number> = {
  out: 0,
  'reorder-now': 1,
  'order-soon': 2,
  ok: 3,
};
