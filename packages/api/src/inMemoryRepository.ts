import { dosesDueAt, dosesForDay, scheduledDosesForDay, getRefillStatus } from '@medication-tracker/core';
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

  addDoses(doses: Dose[]): void {
    for (const dose of doses) {
      const exists = this.doses.some(
        (d) => d.medicationId === dose.medicationId && d.scheduledFor === dose.scheduledFor
      );
      if (!exists) this.doses.push({ ...dose });
    }
  }

  getDueDoses(now: string): Dose[] {
    return dosesDueAt(this.doses, now);
  }

  getDosesForDay(date: string): Dose[] {
    return dosesForDay(this.doses, date);
  }

  ensureDosesForDay(date: string): Dose[] {
    this.addDoses(scheduledDosesForDay(this.medications, date));
    return dosesForDay(this.doses, date);
  }

  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void {
    this.findDose(medicationId, scheduledFor).takenAt = takenAt;
  }

  markUntaken(medicationId: string, scheduledFor: string): void {
    this.findDose(medicationId, scheduledFor).takenAt = null;
  }

  private findDose(medicationId: string, scheduledFor: string): Dose {
    const dose = this.doses.find(
      (d) => d.medicationId === medicationId && d.scheduledFor === scheduledFor
    );
    if (!dose) {
      throw new Error(`Dose not found: ${medicationId} at ${scheduledFor}`);
    }
    return dose;
  }

  getRefillStatuses(today: string): RefillStatus[] {
    return this.medications.map((m) => getRefillStatus(m, today));
  }
}
