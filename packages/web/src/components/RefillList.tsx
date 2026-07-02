import type { Medication, RefillStatus } from '@medication-tracker/core';
import { Badge } from '@/components/ui/badge';
import { refillUrgency } from '@/refillUrgency';

interface Props {
  statuses: RefillStatus[];
  medications: Medication[];
}

// The badge shows days of supply left (daysUntilRunOut) so it reads as "how
// many pills do I have"; urgency comes from the shared thresholds in
// refillUrgency, keyed off the reorder deadline.
function refillLabel(
  daysUntilRefill: number,
  daysUntilRunOut: number
): { text: string; variant: 'destructive' | 'warning' | 'default' } {
  const daysLeft = Math.max(0, daysUntilRunOut);
  switch (refillUrgency(daysUntilRefill, daysUntilRunOut)) {
    case 'out':
      return { text: 'Out of pills', variant: 'destructive' };
    case 'reorder-now':
      return { text: `${daysLeft}d left — reorder now`, variant: 'destructive' };
    case 'order-soon':
      return { text: `${daysLeft}d left — order soon`, variant: 'warning' };
    case 'ok':
      return { text: `${daysLeft} days left`, variant: 'default' };
  }
}

// Format an ISO date (YYYY-MM-DD) as e.g. "25 Jul 2026", anchored to UTC so the
// displayed day always matches the stored date regardless of the browser's zone.
function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function RefillList({ statuses, medications }: Props) {
  return (
    <ul className="space-y-2">
      {statuses.map((s) => {
        const med = medications.find((m) => m.id === s.medicationId);
        const daysUntilRunOut = s.daysUntilRefill + (med?.refillLeadTimeDays ?? 0);
        const { text, variant } = refillLabel(s.daysUntilRefill, daysUntilRunOut);

        return (
          <li key={s.medicationId} className="rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">
                {med?.name ?? s.medicationId}
              </span>
              <Badge variant={variant}>{text}</Badge>
            </div>
            <dl className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <div>
                <dt className="inline">Runs out </dt>
                <dd className="inline font-medium text-foreground tabular-nums">
                  {formatDate(s.runOutDate)}
                </dd>
              </div>
              <div>
                <dt className="inline">Reminder </dt>
                <dd className="inline font-medium text-foreground tabular-nums">
                  {formatDate(s.refillDate)}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
