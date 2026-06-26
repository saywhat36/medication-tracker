import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';

interface Props {
  medications: Medication[];
  onDeleted: (id: string) => void;
}

export function MedicationList({ medications, onDeleted }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());

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
      {medications.map((med) => (
        <li
          key={med.id}
          className="flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <span className="flex-1 text-sm font-medium">{med.name}</span>
          <button
            onClick={() => void handleDelete(med)}
            disabled={pending.has(med.id)}
            className="text-xs text-destructive hover:underline disabled:opacity-50"
            aria-label={`Delete ${med.name}`}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
