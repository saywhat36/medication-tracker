import { useEffect } from 'react';
import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { MedicationForm } from '@/components/MedicationForm';
import { Parchment } from './Parchment';

interface Props {
  medication: Medication;
  pillsRemaining: number;
  onSaved: () => void;
  onClose: () => void;
}

// The pop-up you get from double-clicking a bottle: the medication edit form
// on a sheet of parchment. Same save flow as classic view's edit button.
export function EditBottleModal({ medication, pillsRemaining, onSaved, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${medication.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Parchment tone="paper" className="w-full max-w-sm max-h-[90vh] overflow-y-auto">
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
      </Parchment>
    </div>
  );
}
