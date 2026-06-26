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

  deleteMedication(medicationId: string): void {
    const index = this.medications.findIndex((m) => m.id === medicationId);
    if (index === -1) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    this.medications.splice(index, 1);
    this.doses = this.doses.filter((d) => d.medicationId !== medicationId);
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

  rescheduleMedication(
    medicationId: string,
    oldTime: string,
    newTime: string,
    fromDate: string
  ): void {
    const med = this.medications.find((m) => m.id === medicationId);
    if (!med) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    med.schedule = med.schedule.map((t) => (t === oldTime ? newTime : t));

    const moved: Dose[] = [];
    this.doses = this.doses.filter((d) => {
      const shouldMove =
        d.medicationId === medicationId &&
        d.takenAt === null &&
        d.scheduledFor.slice(0, 10) >= fromDate &&
        d.scheduledFor.slice(11, 16) === oldTime;
      if (shouldMove) {
        moved.push({
          medicationId,
          scheduledFor: `${d.scheduledFor.slice(0, 10)}T${newTime}:00Z`,
          takenAt: null,
        });
        return false;
      }
      return true;
    });
    this.addDoses(moved);
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
