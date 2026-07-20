import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { MedicationForm } from '@/components/MedicationForm';
import { BottleColorPicker } from './BottleColorPicker';
import { ParchmentModal } from './ParchmentModal';

interface Props {
  medication: Medication;
  pillsRemaining: number;
  onSaved: () => void;
  onColorChanged: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

// The pop-up you get from double-clicking a bottle: the medication edit form
// on a sheet of parchment, plus a way to take the bottle off the shelf for
// good. Same save/delete flows as classic view.
export function EditBottleModal({
  medication,
  pillsRemaining,
  onSaved,
  onColorChanged,
  onDeleted,
  onClose,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete ${medication.name}? This removes it and its dose history.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteMedication(medication.id);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ParchmentModal label={`Edit ${medication.name}`} onClose={onClose}>
      <p className="font-apothecary text-lg mb-2">{medication.name}</p>
      <MedicationForm
        title="Correct the label"
        submitLabel="Save changes"
        variant="bare"
        initial={medication}
        initialPillsNow={pillsRemaining}
        onSubmit={async (data) => {
          await api.updateMedication(medication.id, data);
          onSaved();
        }}
        onCancel={onClose}
      />
      <BottleColorPicker medication={medication} onChanged={onColorChanged} />
      <div className="mt-3 border-t border-apothecary-parchment-edge pt-2 text-center">
        <button
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="font-hand text-lg text-apothecary-wax-red underline decoration-dotted underline-offset-4 hover:opacity-80 disabled:opacity-50"
        >
          {deleting ? 'removing…' : 'remove this bottle from the shelf'}
        </button>
      </div>
    </ParchmentModal>
  );
}
