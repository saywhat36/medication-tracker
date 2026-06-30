import {
  dosesDueAt,
  dosesForDay,
  scheduledDosesForDay,
  dosesTakenSincePickup,
  computeReschedule,
  getRefillStatus,
} from '@medication-tracker/core';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

export class InMemoryMedicationRepository implements MedicationRepository {
  private medications: Medication[];
  private doses: Dose[];
  private notifiedDoseKeys = new Set<string>();
  private timeZone: string;

  constructor(medications: Medication[], doses: Dose[], timeZone = 'UTC') {
    this.medications = medications.map((m) => ({ ...m }));
    this.doses = doses.map((d) => ({ ...d }));
    this.timeZone = timeZone;
  }

  async listMedications(): Promise<Medication[]> {
    return this.medications.map((m) => ({ ...m }));
  }

  async addMedication(med: Medication): Promise<void> {
    this.medications.push({ ...med });
  }

  async deleteMedication(medicationId: string): Promise<void> {
    const index = this.medications.findIndex((m) => m.id === medicationId);
    if (index === -1) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    this.medications.splice(index, 1);
    this.doses = this.doses.filter((d) => d.medicationId !== medicationId);
  }

  async updateMedication(med: Medication): Promise<void> {
    const index = this.medications.findIndex((m) => m.id === med.id);
    if (index === -1) {
      throw new Error(`Medication not found: ${med.id}`);
    }
    this.medications[index] = { ...med };
  }

  async addDoses(doses: Dose[]): Promise<void> {
    for (const dose of doses) {
      const exists = this.doses.some(
        (d) => d.medicationId === dose.medicationId && d.scheduledFor === dose.scheduledFor
      );
      if (!exists) this.doses.push({ ...dose });
    }
  }

  async getDueDoses(now: string): Promise<Dose[]> {
    return dosesDueAt(this.doses, now);
  }

  async getDosesForDay(date: string): Promise<Dose[]> {
    return dosesForDay(this.doses, date, this.timeZone);
  }

  async ensureDosesForDay(date: string): Promise<Dose[]> {
    await this.addDoses(scheduledDosesForDay(this.medications, date, this.timeZone));
    return dosesForDay(this.doses, date, this.timeZone);
  }

  async markTaken(medicationId: string, scheduledFor: string, takenAt: string): Promise<void> {
    this.findDose(medicationId, scheduledFor).takenAt = takenAt;
  }

  async markUntaken(medicationId: string, scheduledFor: string): Promise<void> {
    this.findDose(medicationId, scheduledFor).takenAt = null;
  }

  async rescheduleMedication(
    medicationId: string,
    oldTime: string,
    newTime: string,
    fromDate: string
  ): Promise<void> {
    const med = this.medications.find((m) => m.id === medicationId);
    if (!med) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    med.schedule = med.schedule.map((t) => (t === oldTime ? newTime : t));

    const { toRemove, toAdd } = computeReschedule(
      this.doses,
      medicationId,
      oldTime,
      newTime,
      fromDate,
      this.timeZone
    );
    const removeKeys = new Set(toRemove.map((d) => `${d.medicationId}:${d.scheduledFor}`));
    this.doses = this.doses.filter((d) => !removeKeys.has(`${d.medicationId}:${d.scheduledFor}`));
    await this.addDoses(toAdd);
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

  async getRefillStatuses(today: string): Promise<RefillStatus[]> {
    return this.medications.map((m) =>
      getRefillStatus(m, dosesTakenSincePickup(this.doses, m), today)
    );
  }

  async getNotifiedDoseKeys(): Promise<string[]> {
    return [...this.notifiedDoseKeys];
  }

  async recordDoseNotified(doseKey: string): Promise<void> {
    this.notifiedDoseKeys.add(doseKey);
  }
}
