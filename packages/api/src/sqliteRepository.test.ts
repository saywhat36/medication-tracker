import { describe } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMedicationRepository } from './sqliteRepository.js';
import { runRepositoryTests } from './repository.test.js';

const SEED_MED = {
  id: 'med-1',
  name: 'Metformin',
  pillsRemaining: 30,
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['08:00'],
};

const SEED_DOSES = [
  { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null },
  { medicationId: 'med-1', scheduledFor: '2026-06-25T21:00:00Z', takenAt: null },
];

describe('SqliteMedicationRepository', () => {
  runRepositoryTests(() => {
    const db = new DatabaseSync(':memory:');
    return new SqliteMedicationRepository(db, [SEED_MED], SEED_DOSES);
  });
});
