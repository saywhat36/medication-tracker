import { useState } from 'react';
import type { Dose, Medication } from '@medication-tracker/core';
import { api } from '@/api';

interface Props {
  doses: Dose[];
  medications: Medication[];
  onTaken: (scheduledFor: string) => void;
}

export function DoseList({ doses, medications, onTaken }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function handleTake(dose: Dose) {
    setPending((s) => new Set(s).add(dose.scheduledFor));
    try {
      await api.markTaken(dose.medicationId, dose.scheduledFor);
      onTaken(dose.scheduledFor);
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(dose.scheduledFor);
        return next;
      });
    }
  }

  const pending_ = doses.filter((d) => d.takenAt === null);
  if (doses.length === 0 || pending_.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">All doses taken ✓</p>;
  }

  const now = new Date().toISOString();

  return (
    <ul className="space-y-2">
      {doses
        .filter((d) => d.takenAt === null)
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
        .map((dose) => {
          const med = medications.find((m) => m.id === dose.medicationId);
          const isBusy = pending.has(dose.scheduledFor);
          const isUpcoming = dose.scheduledFor > now;
          const time = new Date(dose.scheduledFor).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <li
              key={`${dose.medicationId}-${dose.scheduledFor}`}
              className="flex items-center gap-3 rounded-lg border px-4 py-3"
            >
              <input
                type="checkbox"
                checked={false}
                disabled={isBusy || isUpcoming}
                onChange={() => handleTake(dose)}
                className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer disabled:cursor-default"
                aria-label={`Mark ${med?.name ?? dose.medicationId} taken`}
              />
              <span className="flex-1 text-sm font-medium">
                {med?.name ?? dose.medicationId}
              </span>
              {isUpcoming ? (
                <span className="text-xs text-muted-foreground/60 tabular-nums">{time} upcoming</span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
              )}
            </li>
          );
        })}
    </ul>
  );
}
