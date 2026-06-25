import { DatabaseSync } from 'node:sqlite';
import { getRefillStatus, dosesDueAt } from '@medication-tracker/core';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS medications (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    pills_remaining      REAL NOT NULL,
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
        `INSERT INTO medications (id, name, pills_remaining, doses_per_day, refill_lead_time_days, schedule)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(med.id, med.name, med.pillsRemaining, med.dosesPerDay, med.refillLeadTimeDays, JSON.stringify(med.schedule));
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

  listMedications(): Medication[] {
    const rows = this.db.prepare('SELECT * FROM medications').all() as Record<string, unknown>[];
    return rows.map(toMedication);
  }

  getDueDoses(now: string): Dose[] {
    const rows = this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[];
    return dosesDueAt(rows.map(toDose), now);
  }

  markTaken(medicationId: string, scheduledFor: string, takenAt: string): void {
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
    pillsRemaining: row['pills_remaining'] as number,
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
