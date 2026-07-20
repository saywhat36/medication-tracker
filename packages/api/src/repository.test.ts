import { describe, it, expect } from 'vitest';
import type { MedicationRepository } from './repository.js';
import { InMemoryMedicationRepository } from './inMemoryRepository.js';

const SEED_MED = {
  id: 'med-1',
  name: 'Metformin',
  pillsAtPickup: 30,
  lastPickupDate: '2026-06-25',
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['08:00'],
};

const SEED_DOSES = [
  { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null },
  { medicationId: 'med-1', scheduledFor: '2026-06-25T21:00:00Z', takenAt: null },
];

// Shared suite — exported so any implementation (in-memory, SQLite, Postgres) can
// be run against it. The repository interface is async, so every call is awaited.
export function runRepositoryTests(
  makeRepo: () => MedicationRepository | Promise<MedicationRepository>
) {
  describe('listMedications', () => {
    it('returns all seeded medications', async () => {
      const repo = await makeRepo();
      const meds = await repo.listMedications();
      expect(meds).toHaveLength(1);
      expect(meds[0].id).toBe('med-1');
    });
  });

  describe('addMedication', () => {
    it('adds a new medication that appears in listMedications', async () => {
      const repo = await makeRepo();
      await repo.addMedication({
        id: 'med-99',
        name: 'Aspirin',
        pillsAtPickup: 60,
        lastPickupDate: '2026-06-25',
        dosesPerDay: 1,
        refillLeadTimeDays: 5,
        schedule: ['09:00'],
      });
      const meds = await repo.listMedications();
      expect(meds).toHaveLength(2);
      expect(meds.find((m) => m.id === 'med-99')?.name).toBe('Aspirin');
    });
  });

  describe('recipient and companion emails', () => {
    it('round-trips a recipient email and companion emails through addMedication', async () => {
      const repo = await makeRepo();
      await repo.addMedication({
        id: 'med-emails',
        name: 'Fluoxetine',
        pillsAtPickup: 30,
        lastPickupDate: '2026-06-25',
        dosesPerDay: 1,
        refillLeadTimeDays: 7,
        schedule: ['09:00'],
        recipientEmail: 'sarah@example.com',
        companionEmails: ['gavin@example.com', 'mum@example.com'],
      });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-emails');
      expect(med?.recipientEmail).toBe('sarah@example.com');
      expect(med?.companionEmails).toEqual(['gavin@example.com', 'mum@example.com']);
    });

    it('defaults to no recipient and no companions when omitted', async () => {
      const repo = await makeRepo();
      const meds = await repo.listMedications();
      const med = meds.find((m) => m.id === 'med-1');
      expect(med?.recipientEmail ?? null).toBeNull();
      expect(med?.companionEmails ?? []).toEqual([]);
    });

    it('updates the recipient and companion emails via updateMedication', async () => {
      const repo = await makeRepo();
      await repo.updateMedication({ ...SEED_MED, recipientEmail: 'sarah@example.com', companionEmails: ['gavin@example.com'] });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-1');
      expect(med?.recipientEmail).toBe('sarah@example.com');
      expect(med?.companionEmails).toEqual(['gavin@example.com']);
    });

    it('can clear a previously set recipient and companion emails', async () => {
      const repo = await makeRepo();
      await repo.updateMedication({ ...SEED_MED, recipientEmail: 'sarah@example.com', companionEmails: ['gavin@example.com'] });
      await repo.updateMedication({ ...SEED_MED, recipientEmail: null, companionEmails: [] });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-1');
      expect(med?.recipientEmail ?? null).toBeNull();
      expect(med?.companionEmails).toEqual([]);
    });
  });

  describe('bottle customization', () => {
    it('round-trips a custom bottle color and pill customizations through addMedication', async () => {
      const repo = await makeRepo();
      await repo.addMedication({
        id: 'med-custom',
        name: 'Vitamin D',
        pillsAtPickup: 30,
        lastPickupDate: '2026-06-25',
        dosesPerDay: 1,
        refillLeadTimeDays: 7,
        schedule: ['09:00'],
        customBottleColor: '#FF5733',
        pillCustomizations: [
          { emoji: '💊', textLabel: 'Morning', customColor: '#7B6BA8' },
          { emoji: '⭐', customColor: '#FFD700' },
        ],
      });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-custom');
      expect(med?.customBottleColor).toBe('#FF5733');
      expect(med?.pillCustomizations).toEqual([
        { emoji: '💊', textLabel: 'Morning', customColor: '#7B6BA8' },
        { emoji: '⭐', customColor: '#FFD700' },
      ]);
    });

    it('defaults to no custom bottle color and no pill customizations when omitted', async () => {
      const repo = await makeRepo();
      const meds = await repo.listMedications();
      const med = meds.find((m) => m.id === 'med-1');
      expect(med?.customBottleColor).toBeUndefined();
      expect(med?.pillCustomizations).toBeUndefined();
    });

    it('updates pill customizations via updateMedication without affecting other fields', async () => {
      const repo = await makeRepo();
      await repo.updateMedication({ ...SEED_MED, pillCustomizations: [{ emoji: '💊' }] });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-1');
      expect(med?.pillCustomizations).toEqual([{ emoji: '💊' }]);
      expect(med?.name).toBe(SEED_MED.name);
    });
  });

  describe('deleteMedication', () => {
    it('removes the medication from listMedications', async () => {
      const repo = await makeRepo();
      await repo.deleteMedication('med-1');
      expect(await repo.listMedications()).toHaveLength(0);
    });

    it('removes all of the medication\'s doses', async () => {
      const repo = await makeRepo();
      await repo.deleteMedication('med-1');
      expect(await repo.getDosesForDay('2026-06-25')).toHaveLength(0);
    });

    it('throws when the medication does not exist', async () => {
      const repo = await makeRepo();
      await expect(repo.deleteMedication('med-does-not-exist')).rejects.toThrow();
    });
  });

  describe('updateMedication', () => {
    it('updates a medication\'s fields', async () => {
      const repo = await makeRepo();
      await repo.updateMedication({
        id: 'med-1',
        name: 'Metformin XR',
        pillsAtPickup: 60,
        lastPickupDate: '2026-06-25',
        priorDosesTaken: 5,
        dosesPerDay: 1,
        refillLeadTimeDays: 7,
        schedule: ['08:00'],
      });
      const med = (await repo.listMedications()).find((m) => m.id === 'med-1');
      expect(med?.name).toBe('Metformin XR');
      expect(med?.pillsAtPickup).toBe(60);
      const status = (await repo.getRefillStatuses('2026-06-25')).find(
        (s) => s.medicationId === 'med-1'
      );
      expect(status?.pillsRemaining).toBe(55); // 60 − 5 prior − 0 ticked
    });

    it('throws when the medication does not exist', async () => {
      const repo = await makeRepo();
      await expect(
        repo.updateMedication({
          id: 'nope',
          name: 'x',
          pillsAtPickup: 1,
          lastPickupDate: '2026-06-25',
          dosesPerDay: 1,
          refillLeadTimeDays: 1,
          schedule: ['08:00'],
        })
      ).rejects.toThrow();
    });
  });

  describe('rescheduleMedication', () => {
    it('moves an untaken dose on/after fromDate to the new time', async () => {
      const repo = await makeRepo();
      await repo.rescheduleMedication('med-1', '08:00', '10:00', '2026-06-25');
      const doses = (await repo.getDosesForDay('2026-06-25')).map((d) => d.scheduledFor).sort();
      expect(doses).toContain('2026-06-25T10:00:00Z');
      expect(doses).not.toContain('2026-06-25T08:00:00Z');
    });

    it('updates the medication schedule', async () => {
      const repo = await makeRepo();
      await repo.rescheduleMedication('med-1', '08:00', '10:00', '2026-06-25');
      expect((await repo.listMedications())[0].schedule).toEqual(['10:00']);
    });

    it('leaves a dose that was already taken at the old time untouched', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:05:00Z');
      await repo.rescheduleMedication('med-1', '08:00', '10:00', '2026-06-25');
      const doses = await repo.getDosesForDay('2026-06-25');
      const taken = doses.find((d) => d.scheduledFor === '2026-06-25T08:00:00Z');
      expect(taken?.takenAt).toBe('2026-06-25T08:05:00Z');
      expect(doses.find((d) => d.scheduledFor === '2026-06-25T10:00:00Z')).toBeUndefined();
    });

    it('throws when the medication does not exist', async () => {
      const repo = await makeRepo();
      await expect(
        repo.rescheduleMedication('nope', '08:00', '10:00', '2026-06-25')
      ).rejects.toThrow();
    });
  });

  describe('addDoses', () => {
    it('makes doses visible via getDueDoses', async () => {
      const repo = await makeRepo();
      await repo.addDoses([{ medicationId: 'med-1', scheduledFor: '2026-06-25T10:00:00Z', takenAt: null }]);
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due.some((d) => d.scheduledFor === '2026-06-25T10:00:00Z')).toBe(true);
    });

    it('is idempotent — inserting a duplicate dose is a no-op', async () => {
      const repo = await makeRepo();
      await repo.addDoses([{ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null }]);
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due.filter((d) => d.scheduledFor === '2026-06-25T08:00:00Z')).toHaveLength(1);
    });
  });

  describe('getDueDoses', () => {
    it('returns pending doses at or before now', async () => {
      const repo = await makeRepo();
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(1);
      expect(due[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
    });

    it('excludes future doses', async () => {
      const repo = await makeRepo();
      const due = await repo.getDueDoses('2026-06-25T07:00:00Z');
      expect(due).toHaveLength(0);
    });

    it('excludes doses already marked taken', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:05:00Z');
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(0);
    });
  });

  describe('markTaken', () => {
    it('records the takenAt timestamp on the matching dose', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(0);
    });

    it('throws when the dose does not exist', async () => {
      const repo = await makeRepo();
      await expect(
        repo.markTaken('med-1', '2026-06-25T99:00:00Z', '2026-06-25T08:07:00Z')
      ).rejects.toThrow();
    });
  });

  describe('markUntaken', () => {
    it('clears takenAt so the dose is due again', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      expect(await repo.getDueDoses('2026-06-25T12:00:00Z')).toHaveLength(0);

      await repo.markUntaken('med-1', '2026-06-25T08:00:00Z');
      const due = await repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(1);
      expect(due[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
    });

    it('throws when the dose does not exist', async () => {
      const repo = await makeRepo();
      await expect(repo.markUntaken('med-1', '2026-06-25T99:00:00Z')).rejects.toThrow();
    });
  });

  describe('getDosesForDay', () => {
    it('returns both taken and pending doses for the day', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const doses = await repo.getDosesForDay('2026-06-25');
      expect(doses).toHaveLength(2);
      expect(doses.find((d) => d.scheduledFor === '2026-06-25T08:00:00Z')?.takenAt).not.toBeNull();
    });

    it('excludes doses on other days', async () => {
      const repo = await makeRepo();
      expect(await repo.getDosesForDay('2026-06-24')).toHaveLength(0);
    });
  });

  describe('ensureDosesForDay', () => {
    it('creates a dose per scheduled time for a day that has none yet', async () => {
      const repo = await makeRepo();
      // SEED_MED is scheduled at 08:00; a fresh day has no doses.
      const doses = await repo.ensureDosesForDay('2026-06-27');
      expect(doses).toHaveLength(1);
      expect(doses[0].scheduledFor).toBe('2026-06-27T08:00:00Z');
      expect(doses[0].takenAt).toBeNull();
    });

    it('is idempotent — running twice does not duplicate doses', async () => {
      const repo = await makeRepo();
      await repo.ensureDosesForDay('2026-06-27');
      const doses = await repo.ensureDosesForDay('2026-06-27');
      expect(doses).toHaveLength(1);
    });

    it('preserves the taken state of an existing dose', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const doses = await repo.ensureDosesForDay('2026-06-25');
      const eight = doses.find((d) => d.scheduledFor === '2026-06-25T08:00:00Z');
      expect(eight?.takenAt).toBe('2026-06-25T08:07:00Z');
    });
  });

  describe('notification log', () => {
    it('records and lists notified dose keys', async () => {
      const repo = await makeRepo();
      expect(await repo.getNotifiedDoseKeys()).toHaveLength(0);
      await repo.recordDoseNotified('med-1:2026-06-25T08:00:00Z');
      expect(await repo.getNotifiedDoseKeys()).toContain('med-1:2026-06-25T08:00:00Z');
    });

    it('recording the same key twice is a no-op', async () => {
      const repo = await makeRepo();
      await repo.recordDoseNotified('med-1:2026-06-25T08:00:00Z');
      await repo.recordDoseNotified('med-1:2026-06-25T08:00:00Z');
      expect(await repo.getNotifiedDoseKeys()).toHaveLength(1);
    });
  });

  describe('getRefillStatuses', () => {
    it('returns a RefillStatus for each medication', async () => {
      const repo = await makeRepo();
      const statuses = await repo.getRefillStatuses('2026-06-25');
      expect(statuses).toHaveLength(1);
      expect(statuses[0].medicationId).toBe('med-1');
      expect(statuses[0].pillsRemaining).toBe(30);
      expect(statuses[0].daysUntilRefill).toBe(23);
      expect(statuses[0].runOutDate).toBe('2026-07-25');
      expect(statuses[0].refillDate).toBe('2026-07-18');
    });

    it('reduces pillsRemaining by one for each dose taken since pickup', async () => {
      const repo = await makeRepo();
      await repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:05:00Z');
      const statuses = await repo.getRefillStatuses('2026-06-25');
      expect(statuses[0].pillsRemaining).toBe(29);
    });

    it('subtracts priorDosesTaken entered at registration', async () => {
      const repo = await makeRepo();
      await repo.addMedication({
        id: 'med-prior',
        name: 'Old script',
        pillsAtPickup: 30,
        lastPickupDate: '2026-06-25',
        priorDosesTaken: 10,
        dosesPerDay: 1,
        refillLeadTimeDays: 7,
        schedule: ['09:00'],
      });
      const statuses = await repo.getRefillStatuses('2026-06-25');
      expect(statuses.find((s) => s.medicationId === 'med-prior')?.pillsRemaining).toBe(20);
    });
  });

  describe('getDosesInRange', () => {
    it('includes doses on both boundary dates (inclusive)', async () => {
      const repo = await makeRepo();
      await repo.addDoses([
        { medicationId: 'med-1', scheduledFor: '2026-06-20T08:00:00Z', takenAt: null },
        { medicationId: 'med-1', scheduledFor: '2026-06-23T08:00:00Z', takenAt: null },
      ]);
      const doses = await repo.getDosesInRange('2026-06-20', '2026-06-23');
      const scheduled = doses.map((d) => d.scheduledFor).sort();
      expect(scheduled).toEqual(['2026-06-20T08:00:00Z', '2026-06-23T08:00:00Z']);
    });

    it('excludes doses scheduled outside the given range', async () => {
      const repo = await makeRepo();
      // SEED_DOSES are both scheduled on 2026-06-25 — an earlier range should
      // return none of them.
      const doses = await repo.getDosesInRange('2026-06-01', '2026-06-10');
      expect(doses).toHaveLength(0);
    });
  });

  describe('getAdherenceStatuses', () => {
    it('returns zero-history stats for a medication with no doses recorded', async () => {
      const repo = await makeRepo();
      await repo.addMedication({
        id: 'med-no-doses',
        name: 'New Med',
        pillsAtPickup: 30,
        lastPickupDate: '2026-06-25',
        dosesPerDay: 1,
        refillLeadTimeDays: 7,
        schedule: ['08:00'],
      });
      const statuses = await repo.getAdherenceStatuses('2026-06-25');
      const status = statuses.find((s) => s.medicationId === 'med-no-doses');
      expect(status).toEqual({
        medicationId: 'med-no-doses',
        windowDays: 30,
        scheduledCount: 0,
        takenCount: 0,
        adherencePercentage: null,
        currentStreakDays: 0,
      });
    });

    it('computes currentStreakDays across consecutive fully-taken days', async () => {
      const repo = await makeRepo();
      await repo.addDoses([
        { medicationId: 'med-1', scheduledFor: '2026-06-22T08:00:00Z', takenAt: '2026-06-22T08:05:00Z' },
        { medicationId: 'med-1', scheduledFor: '2026-06-23T08:00:00Z', takenAt: '2026-06-23T08:05:00Z' },
        { medicationId: 'med-1', scheduledFor: '2026-06-24T08:00:00Z', takenAt: '2026-06-24T08:05:00Z' },
      ]);
      const statuses = await repo.getAdherenceStatuses('2026-06-25');
      const status = statuses.find((s) => s.medicationId === 'med-1');
      expect(status?.currentStreakDays).toBe(3);
    });

    it('resets currentStreakDays at a day with no scheduled doses', async () => {
      const repo = await makeRepo();
      // 06-24 taken, then a gap on 06-23 with no dose at all, then 06-22 taken.
      // The gap should stop the walk rather than being skipped over.
      await repo.addDoses([
        { medicationId: 'med-1', scheduledFor: '2026-06-24T08:00:00Z', takenAt: '2026-06-24T08:05:00Z' },
        { medicationId: 'med-1', scheduledFor: '2026-06-22T08:00:00Z', takenAt: '2026-06-22T08:05:00Z' },
      ]);
      const statuses = await repo.getAdherenceStatuses('2026-06-25');
      const status = statuses.find((s) => s.medicationId === 'med-1');
      expect(status?.currentStreakDays).toBe(1);
    });

    it('resets currentStreakDays at a day where a dose was missed', async () => {
      const repo = await makeRepo();
      await repo.addDoses([
        { medicationId: 'med-1', scheduledFor: '2026-06-24T08:00:00Z', takenAt: '2026-06-24T08:05:00Z' },
        { medicationId: 'med-1', scheduledFor: '2026-06-23T08:00:00Z', takenAt: null }, // missed
        { medicationId: 'med-1', scheduledFor: '2026-06-22T08:00:00Z', takenAt: '2026-06-22T08:05:00Z' },
      ]);
      const statuses = await repo.getAdherenceStatuses('2026-06-25');
      const status = statuses.find((s) => s.medicationId === 'med-1');
      expect(status?.currentStreakDays).toBe(1);
    });

    it("does not let today's still-pending doses affect currentStreakDays", async () => {
      const repo = await makeRepo();
      // SEED_DOSES already schedules med-1's doses today (2026-06-25) with
      // takenAt: null (pending) — the streak walk starts at yesterday, so
      // those pending doses should neither extend nor break the streak.
      await repo.addDoses([
        { medicationId: 'med-1', scheduledFor: '2026-06-24T08:00:00Z', takenAt: '2026-06-24T08:05:00Z' },
      ]);
      const statuses = await repo.getAdherenceStatuses('2026-06-25');
      const status = statuses.find((s) => s.medicationId === 'med-1');
      expect(status?.currentStreakDays).toBe(1);
    });
  });
}

// Run the shared suite against the in-memory implementation.
describe('InMemoryMedicationRepository', () => {
  runRepositoryTests(
    () => new InMemoryMedicationRepository([SEED_MED], SEED_DOSES)
  );
});

// Confirms the timezone is threaded through generation + filtering.
describe('InMemoryMedicationRepository with a timezone', () => {
  it('generates dose instants from schedule times interpreted in the timezone', async () => {
    const repo = new InMemoryMedicationRepository([SEED_MED], [], 'Europe/London');
    // SEED_MED is scheduled 08:00; in BST that is 07:00 UTC.
    const doses = await repo.ensureDosesForDay('2026-06-27');
    expect(doses).toHaveLength(1);
    expect(doses[0].scheduledFor).toBe('2026-06-27T07:00:00Z');
    expect(await repo.getDosesForDay('2026-06-27')).toHaveLength(1);
  });

  it('buckets getDosesInRange by local day across the UTC midnight boundary', async () => {
    const med = { ...SEED_MED, schedule: ['00:30'] };
    const repo = new InMemoryMedicationRepository([med], [], 'Europe/London');
    // 00:30 local (BST, UTC+1) on 2026-06-27 is 2026-06-26T23:30:00Z — a UTC
    // calendar day earlier than the local day it belongs to.
    const doses = await repo.ensureDosesForDay('2026-06-27');
    expect(doses[0].scheduledFor).toBe('2026-06-26T23:30:00Z');

    expect(await repo.getDosesInRange('2026-06-27', '2026-06-27')).toHaveLength(1);
    expect(await repo.getDosesInRange('2026-06-26', '2026-06-26')).toHaveLength(0);
  });
});
