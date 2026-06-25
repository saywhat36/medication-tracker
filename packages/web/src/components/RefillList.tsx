import type { Medication, RefillStatus } from '@medication-tracker/core';
import { Badge } from '@/components/ui/badge';

interface Props {
  statuses: RefillStatus[];
  medications: Medication[];
}

function refillLabel(days: number): { text: string; variant: 'destructive' | 'warning' | 'default' } {
  if (days < 0) return { text: 'Reorder now', variant: 'destructive' };
  if (days === 0) return { text: 'Order today', variant: 'destructive' };
  if (days <= 7) return { text: `${days}d — order soon`, variant: 'warning' };
  return { text: `${days} days`, variant: 'default' };
}

export function RefillList({ statuses, medications }: Props) {
  return (
    <ul className="space-y-2">
      {statuses.map((s) => {
        const med = medications.find((m) => m.id === s.medicationId);
        const { text, variant } = refillLabel(s.daysUntilRefill);

        return (
          <li
            key={s.medicationId}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
          >
            <span className="flex-1 text-sm font-medium">
              {med?.name ?? s.medicationId}
            </span>
            <Badge variant={variant}>{text}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
