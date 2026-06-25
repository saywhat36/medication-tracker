import { dosesDueAt, getRefillStatus } from '@medication-tracker/core';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

export class InMemoryMedicationRepository implements MedicationRepository {
  private medications: Medication[];
  private doses: Dose[];

  constructor(medications: Medication[], doses: Dose[]) {
    this.medications = medications.map((m) => ({ ...m }));
    this.doses = doses.map((d) => ({ ...d }));
  }

  listMedications(): Medication[] {
    return this.medications.map((m) => ({ ...m }));
  }

  addMedication(med: Medication): void {
    this.medications.push({ ...med });
  }

  getDueDoses(now: string): Dose[] {
    return dosesDueAt(this.doses, now);
  }

  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void {
    const dose = this.doses.find(
      (d) => d.medicationId === medicationId && d.scheduledFor === scheduledFor
    );
    if (!dose) {
      throw new Error(`Dose not found: ${medicationId} at ${scheduledFor}`);
    }
    dose.takenAt = takenAt;
  }

  getRefillStatuses(today: string): RefillStatus[] {
    return this.medications.map((m) => getRefillStatus(m, today));
  }
}
