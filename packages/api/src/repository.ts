import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';

// All methods are async (return Promises) so the same interface can be backed by
// a synchronous store (node:sqlite, in-memory) or an asynchronous one (Postgres).
export interface MedicationRepository {
  listMedications(): Promise<Medication[]>;
  addMedication(med: Medication): Promise<void>;
  // Remove a medication and all of its dose records. Throws if it doesn't exist.
  deleteMedication(medicationId: string): Promise<void>;
  // Update a medication's stored fields (by id). Throws if it doesn't exist.
  updateMedication(med: Medication): Promise<void>;
  addDoses(doses: Dose[]): Promise<void>;
  getDueDoses(now: string): Promise<Dose[]>;
  getDosesForDay(date: string): Promise<Dose[]>;
  // Materialise each medication's scheduled doses for the given day (idempotent),
  // then return that day's doses. This is what makes doses recur day after day.
  ensureDosesForDay(date: string): Promise<Dose[]>;
  markTaken(medicationId: string, scheduledFor: string, takenAt: string): Promise<void>;
  markUntaken(medicationId: string, scheduledFor: string): Promise<void>;
  // Change a medication's scheduled time, moving its untaken doses on/after
  // fromDate from oldTime to newTime. Taken doses (history) are left untouched.
  rescheduleMedication(
    medicationId: string,
    oldTime: string,
    newTime: string,
    fromDate: string
  ): Promise<void>;
  getRefillStatuses(today: string): Promise<RefillStatus[]>;
  // Notification log: which doses we've already sent an overdue reminder for,
  // so a one-shot sweep (e.g. a cron) doesn't re-notify the same dose.
  getNotifiedDoseKeys(): Promise<string[]>;
  recordDoseNotified(doseKey: string): Promise<void>;
}
