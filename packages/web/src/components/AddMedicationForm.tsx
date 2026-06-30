import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';
import { MedicationForm } from '@/components/MedicationForm';

interface Props {
  onAdded: (med: Medication) => void;
  onSubmit: (data: Omit<Medication, 'id'>) => Promise<Medication>;
}

export function AddMedicationForm({ onAdded, onSubmit }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
      >
        + Add medication
      </button>
    );
  }

  return (
    <MedicationForm
      title="New medication"
      submitLabel="Save"
      showTime
      onSubmit={async (data) => {
        const med = await onSubmit(data);
        onAdded(med);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
