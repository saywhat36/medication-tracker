import type { Medication, MedicationAdherence } from '@medication-tracker/core';
import { Badge } from '@/components/ui/badge';
import { adherenceSummary, streakLabel } from '@/adherenceLabel';

interface Props {
  statuses: MedicationAdherence[];
  medications: Medication[];
}

// Green once a streak is running, muted default otherwise — mirrors
// RefillList's refillLabel in shape (text + Badge variant from one status).
function streakBadge(currentStreakDays: number): { text: string; variant: 'success' | 'default' } {
  return {
    text: streakLabel(currentStreakDays),
    variant: currentStreakDays > 0 ? 'success' : 'default',
  };
}

export function AdherenceList({ statuses, medications }: Props) {
  return (
    <ul className="space-y-2">
      {statuses.map((s) => {
        const med = medications.find((m) => m.id === s.medicationId);
        const { text, variant } = streakBadge(s.currentStreakDays);

        return (
          <li key={s.medicationId} className="rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">
                {med?.name ?? s.medicationId}
              </span>
              <Badge variant={variant}>{text}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {adherenceSummary(s.adherencePercentage, s.windowDays)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
