import { DatabaseSync } from 'node:sqlite';
import {
  getRefillStatus,
  dosesDueAt,
  dosesForDay,
  scheduledDosesForDay,
  dosesTakenSincePickup,
  computeReschedule,
} from '@medication-tracker/core';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS medications (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    pills_at_pickup      REAL NOT NULL,
    last_pickup_date     TEXT NOT NULL,
    prior_doses_taken    INTEGER NOT NULL DEFAULT 0,
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
  CREATE TABLE IF NOT EXISTS dose_notifications (
    dose_key    TEXT PRIMARY KEY,
    notified_at TEXT
  );
`;

// node:sqlite is synchronous; the methods are async only to satisfy the
// MedicationRepository interface (shared with the async Postgres implementation).
export class SqliteMedicationRepository implements MedicationRepository {
  private db: DatabaseSync;
  private timeZone: string;

  constructor(db: DatabaseSync, medications: Medication[] = [], doses: Dose[] = [], timeZone = 'UTC') {
    this.db = db;
    this.timeZone = timeZone;
    this.db.exec(SCHEMA);
    for (const med of medications) this.insertMedication(med);
    for (const dose of doses) this.insertDose(dose);
  }

  private insertMedication(med: Medication): void {
    this.db
      .prepare(
        `INSERT INTO medications (id, name, pills_at_pickup, last_pickup_date, prior_doses_taken, doses_per_day, refill_lead_time_days, schedule)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(med.id, med.name, med.pillsAtPickup, med.lastPickupDate, med.priorDosesTaken ?? 0, med.dosesPerDay, med.refillLeadTimeDays, JSON.stringify(med.schedule));
  }

  private insertDose(dose: Dose): void {
    this.db
      .prepare(
        `INSERT INTO doses (medication_id, scheduled_for, taken_at) VALUES (?, ?, ?)`
      )
      .run(dose.medicationId, dose.scheduledFor, dose.takenAt ?? null);
  }

  async addMedication(med: Medication): Promise<void> {
    this.insertMedication(med);
  }

  async deleteMedication(medicationId: string): Promise<void> {
    const result = this.db
      .prepare('DELETE FROM medications WHERE id = ?')
      .run(medicationId);
    if ((result as { changes: number }).changes === 0) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    this.db.prepare('DELETE FROM doses WHERE medication_id = ?').run(medicationId);
  }

  async updateMedication(med: Medication): Promise<void> {
    const result = this.db
      .prepare(
        `UPDATE medications SET name = ?, pills_at_pickup = ?, last_pickup_date = ?, prior_doses_taken = ?, doses_per_day = ?, refill_lead_time_days = ?, schedule = ? WHERE id = ?`
      )
      .run(
        med.name,
        med.pillsAtPickup,
        med.lastPickupDate,
        med.priorDosesTaken ?? 0,
        med.dosesPerDay,
        med.refillLeadTimeDays,
        JSON.stringify(med.schedule),
        med.id
      );
    if ((result as { changes: number }).changes === 0) {
      throw new Error(`Medication not found: ${med.id}`);
    }
  }

  async addDoses(doses: Dose[]): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO doses (medication_id, scheduled_for, taken_at) VALUES (?, ?, ?)`
    );
    for (const dose of doses) {
      stmt.run(dose.medicationId, dose.scheduledFor, dose.takenAt ?? null);
    }
  }

  async listMedications(): Promise<Medication[]> {
    const rows = this.db.prepare('SELECT * FROM medications').all() as Record<string, unknown>[];
    return rows.map(toMedication);
  }

  async getDueDoses(now: string): Promise<Dose[]> {
    const rows = this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[];
    return dosesDueAt(rows.map(toDose), now);
  }

  async getDosesForDay(date: string): Promise<Dose[]> {
    const rows = this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[];
    return dosesForDay(rows.map(toDose), date, this.timeZone);
  }

  async ensureDosesForDay(date: string): Promise<Dose[]> {
    // addDoses uses INSERT OR IGNORE, so re-running is a no-op for existing doses.
    await this.addDoses(scheduledDosesForDay(await this.listMedications(), date, this.timeZone));
    return this.getDosesForDay(date);
  }

  async markTaken(medicationId: string, scheduledFor: string, takenAt: string): Promise<void> {
    this.setTakenAt(medicationId, scheduledFor, takenAt);
  }

  async markUntaken(medicationId: string, scheduledFor: string): Promise<void> {
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

  async rescheduleMedication(
    medicationId: string,
    oldTime: string,
    newTime: string,
    fromDate: string
  ): Promise<void> {
    const med = (await this.listMedications()).find((m) => m.id === medicationId);
    if (!med) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    const newSchedule = med.schedule.map((t) => (t === oldTime ? newTime : t));
    this.db
      .prepare('UPDATE medications SET schedule = ? WHERE id = ?')
      .run(JSON.stringify(newSchedule), medicationId);

    const allDoses = (this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[]).map(
      toDose
    );
    const { toRemove, toAdd } = computeReschedule(
      allDoses,
      medicationId,
      oldTime,
      newTime,
      fromDate,
      this.timeZone
    );
    const del = this.db.prepare('DELETE FROM doses WHERE medication_id = ? AND scheduled_for = ?');
    for (const d of toRemove) del.run(d.medicationId, d.scheduledFor);
    await this.addDoses(toAdd);
  }

  async getRefillStatuses(today: string): Promise<RefillStatus[]> {
    const meds = await this.listMedications();
    const allDoses = (this.db.prepare('SELECT * FROM doses').all() as Record<string, unknown>[]).map(
      toDose
    );
    return meds.map((m) => getRefillStatus(m, dosesTakenSincePickup(allDoses, m), today));
  }

  async getNotifiedDoseKeys(): Promise<string[]> {
    const rows = this.db.prepare('SELECT dose_key FROM dose_notifications').all() as Record<
      string,
      unknown
    >[];
    return rows.map((r) => r['dose_key'] as string);
  }

  async recordDoseNotified(doseKey: string): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO dose_notifications (dose_key, notified_at) VALUES (?, ?)`
      )
      .run(doseKey, new Date().toISOString());
  }
}

function toMedication(row: Record<string, unknown>): Medication {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    pillsAtPickup: row['pills_at_pickup'] as number,
    lastPickupDate: row['last_pickup_date'] as string,
    priorDosesTaken: (row['prior_doses_taken'] as number | undefined) ?? 0,
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
