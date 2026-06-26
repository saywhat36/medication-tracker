import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';

export interface MedicationRepository {
  listMedications(): Medication[];
  addMedication(med: Medication): void;
  // Remove a medication and all of its dose records. Throws if it doesn't exist.
  deleteMedication(medicationId: string): void;
  addDoses(doses: Dose[]): void;
  getDueDoses(now: string): Dose[];
  getDosesForDay(date: string): Dose[];
  // Materialise each medication's scheduled doses for the given day (idempotent),
  // then return that day's doses. This is what makes doses recur day after day.
  ensureDosesForDay(date: string): Dose[];
  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void;
  markUntaken(medicationId: string, scheduledFor: string): void;
  // Change a medication's scheduled time, moving its untaken doses on/after
  // fromDate from oldTime to newTime. Taken doses (history) are left untouched.
  rescheduleMedication(
    medicationId: string,
    oldTime: string,
    newTime: string,
    fromDate: string
  ): void;
  getRefillStatuses(today: string): RefillStatus[];
}
