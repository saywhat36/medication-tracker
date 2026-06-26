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

// Shared suite — exported so SQLite impl can reuse it.
export function runRepositoryTests(makeRepo: () => MedicationRepository) {
  describe('listMedications', () => {
    it('returns all seeded medications', () => {
      const repo = makeRepo();
      const meds = repo.listMedications();
      expect(meds).toHaveLength(1);
      expect(meds[0].id).toBe('med-1');
    });
  });

  describe('addMedication', () => {
    it('adds a new medication that appears in listMedications', () => {
      const repo = makeRepo();
      repo.addMedication({
        id: 'med-99',
        name: 'Aspirin',
        pillsAtPickup: 60,
        lastPickupDate: '2026-06-25',
        dosesPerDay: 1,
        refillLeadTimeDays: 5,
        schedule: ['09:00'],
      });
      const meds = repo.listMedications();
      expect(meds).toHaveLength(2);
      expect(meds.find((m) => m.id === 'med-99')?.name).toBe('Aspirin');
    });
  });

  describe('addDoses', () => {
    it('makes doses visible via getDueDoses', () => {
      const repo = makeRepo();
      repo.addDoses([{ medicationId: 'med-1', scheduledFor: '2026-06-25T10:00:00Z', takenAt: null }]);
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due.some((d) => d.scheduledFor === '2026-06-25T10:00:00Z')).toBe(true);
    });

    it('is idempotent — inserting a duplicate dose is a no-op', () => {
      const repo = makeRepo();
      repo.addDoses([{ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null }]);
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due.filter((d) => d.scheduledFor === '2026-06-25T08:00:00Z')).toHaveLength(1);
    });
  });

  describe('getDueDoses', () => {
    it('returns pending doses at or before now', () => {
      const repo = makeRepo();
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(1);
      expect(due[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
    });

    it('excludes future doses', () => {
      const repo = makeRepo();
      const due = repo.getDueDoses('2026-06-25T07:00:00Z');
      expect(due).toHaveLength(0);
    });

    it('excludes doses already marked taken', () => {
      const repo = makeRepo();
      repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:05:00Z');
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(0);
    });
  });

  describe('markTaken', () => {
    it('records the takenAt timestamp on the matching dose', () => {
      const repo = makeRepo();
      repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(0);
    });

    it('throws when the dose does not exist', () => {
      const repo = makeRepo();
      expect(() =>
        repo.markTaken('med-1', '2026-06-25T99:00:00Z', '2026-06-25T08:07:00Z')
      ).toThrow();
    });
  });

  describe('markUntaken', () => {
    it('clears takenAt so the dose is due again', () => {
      const repo = makeRepo();
      repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      expect(repo.getDueDoses('2026-06-25T12:00:00Z')).toHaveLength(0);

      repo.markUntaken('med-1', '2026-06-25T08:00:00Z');
      const due = repo.getDueDoses('2026-06-25T12:00:00Z');
      expect(due).toHaveLength(1);
      expect(due[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
    });

    it('throws when the dose does not exist', () => {
      const repo = makeRepo();
      expect(() => repo.markUntaken('med-1', '2026-06-25T99:00:00Z')).toThrow();
    });
  });

  describe('getDosesForDay', () => {
    it('returns both taken and pending doses for the day', () => {
      const repo = makeRepo();
      repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const doses = repo.getDosesForDay('2026-06-25');
      expect(doses).toHaveLength(2);
      expect(doses.find((d) => d.scheduledFor === '2026-06-25T08:00:00Z')?.takenAt).not.toBeNull();
    });

    it('excludes doses on other days', () => {
      const repo = makeRepo();
      expect(repo.getDosesForDay('2026-06-24')).toHaveLength(0);
    });
  });

  describe('ensureDosesForDay', () => {
    it('creates a dose per scheduled time for a day that has none yet', () => {
      const repo = makeRepo();
      // SEED_MED is scheduled at 08:00; a fresh day has no doses.
      const doses = repo.ensureDosesForDay('2026-06-27');
      expect(doses).toHaveLength(1);
      expect(doses[0].scheduledFor).toBe('2026-06-27T08:00:00Z');
      expect(doses[0].takenAt).toBeNull();
    });

    it('is idempotent — running twice does not duplicate doses', () => {
      const repo = makeRepo();
      repo.ensureDosesForDay('2026-06-27');
      const doses = repo.ensureDosesForDay('2026-06-27');
      expect(doses).toHaveLength(1);
    });

    it('preserves the taken state of an existing dose', () => {
      const repo = makeRepo();
      repo.markTaken('med-1', '2026-06-25T08:00:00Z', '2026-06-25T08:07:00Z');
      const doses = repo.ensureDosesForDay('2026-06-25');
      const eight = doses.find((d) => d.scheduledFor === '2026-06-25T08:00:00Z');
      expect(eight?.takenAt).toBe('2026-06-25T08:07:00Z');
    });
  });

  describe('getRefillStatuses', () => {
    it('returns a RefillStatus for each medication', () => {
      const repo = makeRepo();
      const statuses = repo.getRefillStatuses('2026-06-25');
      expect(statuses).toHaveLength(1);
      expect(statuses[0].medicationId).toBe('med-1');
      expect(statuses[0].pillsRemaining).toBe(30);
      expect(statuses[0].daysUntilRefill).toBe(23);
      expect(statuses[0].refillDate).toBe('2026-07-18');
    });
  });
}

// Run the shared suite against the in-memory implementation.
describe('InMemoryMedicationRepository', () => {
  runRepositoryTests(
    () => new InMemoryMedicationRepository([SEED_MED], SEED_DOSES)
  );
});
