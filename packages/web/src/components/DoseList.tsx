import { useState } from 'react';
import type { Dose, Medication } from '@medication-tracker/core';
import { api } from '@/api';

interface Props {
  doses: Dose[];
  medications: Medication[];
  onTaken: (scheduledFor: string) => void;
  onUntaken: (scheduledFor: string) => void;
  onRescheduled: () => void;
}

export function DoseList({ doses, medications, onTaken, onUntaken, onRescheduled }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleToggle(dose: Dose) {
    setPending((s) => new Set(s).add(dose.scheduledFor));
    try {
      if (dose.takenAt === null) {
        await api.markTaken(dose.medicationId, dose.scheduledFor);
        onTaken(dose.scheduledFor);
      } else {
        await api.markUntaken(dose.medicationId, dose.scheduledFor);
        onUntaken(dose.scheduledFor);
      }
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(dose.scheduledFor);
        return next;
      });
    }
  }

  function startEdit(dose: Dose) {
    setEditing(dose.scheduledFor);
    setDraftTime(dose.scheduledFor.slice(11, 16));
  }

  async function saveEdit(dose: Dose) {
    const oldTime = dose.scheduledFor.slice(11, 16);
    if (draftTime === oldTime) {
      setEditing(null);
      return;
    }
    setSavingEdit(true);
    try {
      await api.rescheduleMedication(dose.medicationId, oldTime, draftTime);
      setEditing(null);
      onRescheduled();
    } finally {
      setSavingEdit(false);
    }
  }

  if (doses.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No doses scheduled today.</p>;
  }

  const now = new Date().toISOString();

  return (
    <ul className="space-y-2">
      {[...doses]
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
        .map((dose) => {
          const med = medications.find((m) => m.id === dose.medicationId);
          const isBusy = pending.has(dose.scheduledFor);
          const isTaken = dose.takenAt !== null;
          const isUpcoming = !isTaken && dose.scheduledFor > now;
          const time = dose.scheduledFor.slice(11, 16);
          const isEditing = editing === dose.scheduledFor;

          return (
            <li
              key={`${dose.medicationId}-${dose.scheduledFor}`}
              className="flex items-center gap-3 rounded-lg border px-4 py-3"
            >
              <input
                type="checkbox"
                checked={isTaken}
                disabled={isBusy || isUpcoming}
                onChange={() => handleToggle(dose)}
                className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer disabled:cursor-default"
                aria-label={`Mark ${med?.name ?? dose.medicationId} ${isTaken ? 'not taken' : 'taken'}`}
              />
              <span
                className={`flex-1 text-sm font-medium ${isTaken ? 'text-muted-foreground line-through' : ''}`}
              >
                {med?.name ?? dose.medicationId}
              </span>

              {isEditing ? (
                <span className="flex items-center gap-1">
                  <input
                    type="time"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    aria-label="New dose time"
                  />
                  <button
                    onClick={() => void saveEdit(dose)}
                    disabled={savingEdit}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span
                    className={`text-xs tabular-nums ${isUpcoming ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                  >
                    {time}
                    {isUpcoming ? ' upcoming' : ''}
                  </span>
                  {!isTaken && (
                    <button
                      onClick={() => startEdit(dose)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      aria-label={`Change time for ${med?.name ?? dose.medicationId}`}
                    >
                      Edit
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
    </ul>
  );
}
