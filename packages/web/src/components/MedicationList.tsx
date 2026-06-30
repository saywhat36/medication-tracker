import { useState } from 'react';
import type { Medication, RefillStatus } from '@medication-tracker/core';
import { api } from '@/api';
import { MedicationForm } from '@/components/MedicationForm';

interface Props {
  medications: Medication[];
  refillStatuses: RefillStatus[];
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

export function MedicationList({ medications, refillStatuses, onDeleted, onUpdated }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleDelete(med: Medication) {
    if (!window.confirm(`Delete ${med.name}? This removes it and its dose history.`)) {
      return;
    }
    setPending((s) => new Set(s).add(med.id));
    try {
      await api.deleteMedication(med.id);
      onDeleted(med.id);
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(med.id);
        return next;
      });
    }
  }

  if (medications.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 mb-2">
      {medications.map((med) =>
        editingId === med.id ? (
          <li key={med.id}>
            <MedicationForm
              title="Edit medication"
              submitLabel="Save changes"
              initial={med}
              initialPillsNow={
                refillStatuses.find((s) => s.medicationId === med.id)?.pillsRemaining
              }
              onSubmit={async (data) => {
                await api.updateMedication(med.id, data);
                setEditingId(null);
                onUpdated();
              }}
              onCancel={() => setEditingId(null)}
            />
          </li>
        ) : (
          <li key={med.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <span className="flex-1 text-sm font-medium">{med.name}</span>
            <button
              onClick={() => setEditingId(med.id)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              aria-label={`Edit ${med.name}`}
            >
              Edit
            </button>
            <button
              onClick={() => void handleDelete(med)}
              disabled={pending.has(med.id)}
              className="text-xs text-destructive hover:underline disabled:opacity-50"
              aria-label={`Delete ${med.name}`}
            >
              Delete
            </button>
          </li>
        )
      )}
    </ul>
  );
}
