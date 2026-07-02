import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { MedicationForm } from '@/components/MedicationForm';
import { ParchmentModal } from './ParchmentModal';

interface Props {
  medication: Medication;
  pillsRemaining: number;
  onSaved: () => void;
  onClose: () => void;
}

// The pop-up you get from double-clicking a bottle: the medication edit form
// on a sheet of parchment. Same save flow as classic view's edit button.
export function EditBottleModal({ medication, pillsRemaining, onSaved, onClose }: Props) {
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
    </ParchmentModal>
  );
}
