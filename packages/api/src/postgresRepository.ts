import pg from 'pg';
import type { Pool } from 'pg';
import {
  getRefillStatus,
  dosesDueAt,
  dosesForDay,
  scheduledDosesForDay,
  dosesTakenSincePickup,
  computeReschedule,
  dosesInRange,
  computeAdherence,
  addDaysToDate,
  MAX_STREAK_LOOKBACK_DAYS,
} from '@medication-tracker/core';
import type { Dose, Medication, MedicationAdherence, RefillStatus } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

const { Pool: PgPool } = pg;

// Build a connection pool, enabling SSL for managed hosts (e.g. Neon) and
// leaving it off for a plain local Postgres.
export function createPgPool(connectionString: string): Pool {
  const needsSsl = /sslmode=require/.test(connectionString) || /\.neon\.tech/.test(connectionString);
  return new PgPool({ connectionString, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
}

export class PostgresMedicationRepository implements MedicationRepository {
  private pool: Pool;
  private timeZone: string;

  constructor(pool: Pool, timeZone = 'UTC') {
    this.pool = pool;
    this.timeZone = timeZone;
  }

  // Convenience for seeding (tests / first-run).
  async seed(medications: Medication[], doses: Dose[]): Promise<void> {
    for (const med of medications) await this.addMedication(med);
    await this.addDoses(doses);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async listMedications(): Promise<Medication[]> {
    const { rows } = await this.pool.query('SELECT * FROM medications');
    return (rows as Record<string, unknown>[]).map(toMedication);
  }

  async addMedication(med: Medication): Promise<void> {
    await this.pool.query(
      `INSERT INTO medications (id, name, pills_at_pickup, last_pickup_date, prior_doses_taken, doses_per_day, refill_lead_time_days, schedule, recipient_email, recipient_name, companion_emails)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        med.id,
        med.name,
        med.pillsAtPickup,
        med.lastPickupDate,
        med.priorDosesTaken ?? 0,
        med.dosesPerDay,
        med.refillLeadTimeDays,
        JSON.stringify(med.schedule),
        med.recipientEmail ?? null,
        med.recipientName ?? null,
        JSON.stringify(med.companionEmails ?? []),
      ]
    );
  }

  async deleteMedication(medicationId: string): Promise<void> {
    const result = await this.pool.query('DELETE FROM medications WHERE id = $1', [medicationId]);
    if (result.rowCount === 0) {
      throw new Error(`Medication not found: ${medicationId}`);
    }
    await this.pool.query('DELETE FROM doses WHERE medication_id = $1', [medicationId]);
  }

  async updateMedication(med: Medication): Promise<void> {
    const result = await this.pool.query(
      `UPDATE medications SET name = $1, pills_at_pickup = $2, last_pickup_date = $3, prior_doses_taken = $4, doses_per_day = $5, refill_lead_time_days = $6, schedule = $7, recipient_email = $8, recipient_name = $9, companion_emails = $10 WHERE id = $11`,
      [
        med.name,
        med.pillsAtPickup,
        med.lastPickupDate,
        med.priorDosesTaken ?? 0,
        med.dosesPerDay,
        med.refillLeadTimeDays,
        JSON.stringify(med.schedule),
        med.recipientEmail ?? null,
        med.recipientName ?? null,
        JSON.stringify(med.companionEmails ?? []),
        med.id,
      ]
    );
    if (result.rowCount === 0) {
      throw new Error(`Medication not found: ${med.id}`);
    }
  }

  async addDoses(doses: Dose[]): Promise<void> {
    for (const dose of doses) {
      await this.pool.query(
        `INSERT INTO doses (medication_id, scheduled_for, taken_at) VALUES ($1, $2, $3)
         ON CONFLICT (medication_id, scheduled_for) DO NOTHING`,
        [dose.medicationId, dose.scheduledFor, dose.takenAt ?? null]
      );
    }
  }

  async getDueDoses(now: string): Promise<Dose[]> {
    const { rows } = await this.pool.query('SELECT * FROM doses');
    return dosesDueAt((rows as Record<string, unknown>[]).map(toDose), now);
  }

  async getDosesForDay(date: string): Promise<Dose[]> {
    const { rows } = await this.pool.query('SELECT * FROM doses');
    return dosesForDay((rows as Record<string, unknown>[]).map(toDose), date, this.timeZone);
  }

  async ensureDosesForDay(date: string): Promise<Dose[]> {
    await this.addDoses(scheduledDosesForDay(await this.listMedications(), date, this.timeZone));
    return this.getDosesForDay(date);
  }

  async markTaken(medicationId: string, scheduledFor: string, takenAt: string): Promise<void> {
    await this.setTakenAt(medicationId, scheduledFor, takenAt);
  }

  async markUntaken(medicationId: string, scheduledFor: string): Promise<void> {
    await this.setTakenAt(medicationId, scheduledFor, null);
  }

  private async setTakenAt(
    medicationId: string,
    scheduledFor: string,
    takenAt: string | null
  ): Promise<void> {
    const result = await this.pool.query(
      'UPDATE doses SET taken_at = $1 WHERE medication_id = $2 AND scheduled_for = $3',
      [takenAt, medicationId, scheduledFor]
    );
    if (result.rowCount === 0) {
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
    await this.pool.query('UPDATE medications SET schedule = $1 WHERE id = $2', [
      JSON.stringify(newSchedule),
      medicationId,
    ]);

    const { rows } = await this.pool.query('SELECT * FROM doses');
    const allDoses = (rows as Record<string, unknown>[]).map(toDose);
    const { toRemove, toAdd } = computeReschedule(
      allDoses,
      medicationId,
      oldTime,
      newTime,
      fromDate,
      this.timeZone
    );
    for (const d of toRemove) {
      await this.pool.query('DELETE FROM doses WHERE medication_id = $1 AND scheduled_for = $2', [
        d.medicationId,
        d.scheduledFor,
      ]);
    }
    await this.addDoses(toAdd);
  }

  async getRefillStatuses(today: string): Promise<RefillStatus[]> {
    const meds = await this.listMedications();
    const { rows } = await this.pool.query('SELECT * FROM doses');
    const allDoses = (rows as Record<string, unknown>[]).map(toDose);
    return meds.map((m) => getRefillStatus(m, dosesTakenSincePickup(allDoses, m), today));
  }

  async getDosesInRange(startDate: string, endDate: string): Promise<Dose[]> {
    const { rows } = await this.pool.query('SELECT * FROM doses');
    return dosesInRange((rows as Record<string, unknown>[]).map(toDose), startDate, endDate, this.timeZone);
  }

  async getAdherenceStatuses(today: string, windowDays = 30): Promise<MedicationAdherence[]> {
    const meds = await this.listMedications();
    const doses = await this.getDosesInRange(addDaysToDate(today, -MAX_STREAK_LOOKBACK_DAYS), today);
    return meds.map((m) => computeAdherence(doses, m.id, today, this.timeZone, windowDays));
  }

  async getNotifiedDoseKeys(): Promise<string[]> {
    const { rows } = await this.pool.query('SELECT dose_key FROM dose_notifications');
    return (rows as { dose_key: string }[]).map((r) => r.dose_key);
  }

  async recordDoseNotified(doseKey: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO dose_notifications (dose_key) VALUES ($1) ON CONFLICT (dose_key) DO NOTHING',
      [doseKey]
    );
  }
}

function toMedication(row: Record<string, unknown>): Medication {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    pillsAtPickup: Number(row['pills_at_pickup']),
    lastPickupDate: row['last_pickup_date'] as string,
    priorDosesTaken: Number(row['prior_doses_taken'] ?? 0),
    dosesPerDay: Number(row['doses_per_day']),
    refillLeadTimeDays: Number(row['refill_lead_time_days']),
    schedule: JSON.parse(row['schedule'] as string) as string[],
    recipientEmail: (row['recipient_email'] as string | null) ?? null,
    recipientName: (row['recipient_name'] as string | null) ?? null,
    companionEmails: JSON.parse((row['companion_emails'] as string | null) ?? '[]') as string[],
  };
}

function toDose(row: Record<string, unknown>): Dose {
  return {
    medicationId: row['medication_id'] as string,
    scheduledFor: row['scheduled_for'] as string,
    takenAt: (row['taken_at'] as string | null) ?? null,
  };
}
