import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';

export interface MedicationRepository {
  listMedications(): Medication[];
  addMedication(med: Medication): void;
  addDoses(doses: Dose[]): void;
  getDueDoses(now: string): Dose[];
  getDosesForDay(date: string): Dose[];
  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void;
  markUntaken(medicationId: string, scheduledFor: string): void;
  getRefillStatuses(today: string): RefillStatus[];
}
