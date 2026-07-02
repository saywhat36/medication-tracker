import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { MedicationForm } from '@/components/MedicationForm';
import { ParchmentModal } from './ParchmentModal';

interface Props {
  onAdded: (med: Medication) => void;
  onClose: () => void;
}

// Stocking a new bottle without leaving the shop — the same add flow as
// classic view's form, on parchment.
export function AddBottleModal({ onAdded, onClose }: Props) {
  return (
    <ParchmentModal label="Stock a new bottle" onClose={onClose}>
      <MedicationForm
        title="Stock a new bottle"
        submitLabel="Add to the shelf"
        variant="bare"
        showTime
        onSubmit={async (data) => {
          const med = await api.addMedication(data);
          onAdded(med);
        }}
        onCancel={onClose}
      />
    </ParchmentModal>
  );
}
