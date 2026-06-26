import { DatabaseSync } from 'node:sqlite';
import { getRefillStatus, dosesDueAt, dosesForDay, scheduledDosesForDay } from '@medication-tracker/core';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS medications (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    pills_at_pickup      REAL NOT NULL,
    last_pickup_date     TEXT NOT NULL,
    doses_per_day        REAL NOT NULL,
    refill_lead_time_days INTEGER NOT NULL,
    schedule             TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS doses (
    medication_id TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    taken_at      TEXT,
    PRIMARY KEY (medication_id, scheduled_for)
  );
`;

export class SqliteMedicationRepository implements MedicationRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync, medications: Medication[] = [], doses: Dose[] = []) {
    this.db = db;
    this.db.exec(SCHEMA);
    for (const med of medications) this.insertMedication(med);
    for (const dose of doses) this.insertDose(dose);
  }

  private insertMedication(med: Medication): void {
    this.db
      .prepare(
        `INSERT INTO medications (id, name, pills_at_pickup, last_pickup_date, doses_per_day, refill_lead_time_days, schedule)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(med.id, med.name, med.pillsAtPickup, med.lastPickupDate, med.dosesPerDay, med.refillLeadTimeDays, JSON.stringify(med.schedule));
  }

  private insertDose(dose: Dose): void {
    this.db
      .prepare(
        `INSERT INTO doses (medication_id, scheduled_for, taken_at) VALUES (?, ?, ?)`
      )
      .run(dose.medicationId, dose.scheduledFor, dose.takenAt ?? null);
  }

  addMedication(med: Medication): void {
    this.insertMedication(med);
  }

  addDoses(doses: Dose[]): void {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO doses (medication_id, scheduled_for, taken_at) VALUES (?, ?, ?)`
    );
    for (const dose of doses) {
      stmt.run(dose.medicationId, dose.scheduledFor, dose.takenAt ?? null);
    }
  }

  listMedications(): Medication[] {
    const rows = this.db.prepare('SELECT * FROM medications').all() as Record<string, unknown>[];
    return rows.map(toMedication);
  }

  getDueDoses(now: string): Dose[] {
    const rows = this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[];
    return dosesDueAt(rows.map(toDose), now);
  }

  getDosesForDay(date: string): Dose[] {
    const rows = this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[];
    return dosesForDay(rows.map(toDose), date);
  }

  ensureDosesForDay(date: string): Dose[] {
    // addDoses uses INSERT OR IGNORE, so re-running is a no-op for existing doses.
    this.addDoses(scheduledDosesForDay(this.listMedications(), date));
    return this.getDosesForDay(date);
  }

  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void {
    this.setTakenAt(medicationId, scheduledFor, takenAt);
  }

  markUntaken(medicationId: string, scheduledFor: string): void {
    this.setTakenAt(medicationId, scheduledFor, null);
  }

  private setTakenAt(medicationId: string, scheduledFor: string, takenAt: string | null): void {
    const result = this.db
      .prepare(
        `UPDATE doses SET taken_at = ? WHERE medication_id = ? AND scheduled_for = ?`
      )
      .run(takenAt, medicationId, scheduledFor);
    if ((result as { changes: number }).changes === 0) {
      throw new Error(`Dose not found: ${medicationId} at ${scheduledFor}`);
    }
  }

  getRefillStatuses(today: string): RefillStatus[] {
    return this.listMedications().map((m) => getRefillStatus(m, today));
  }
}

function toMedication(row: Record<string, unknown>): Medication {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    pillsAtPickup: row['pills_at_pickup'] as number,
    lastPickupDate: row['last_pickup_date'] as string,
    dosesPerDay: row['doses_per_day'] as number,
    refillLeadTimeDays: row['refill_lead_time_days'] as number,
    schedule: JSON.parse(row['schedule'] as string) as string[],
  };
}

function toDose(row: Record<string, unknown>): Dose {
  return {
    medicationId: row['medication_id'] as string,
    scheduledFor: row['scheduled_for'] as string,
    takenAt: (row['taken_at'] as string | null) ?? null,
  };
}
