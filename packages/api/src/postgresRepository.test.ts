import { describe, beforeAll, afterAll } from 'vitest';
import type { Dose, Medication } from '@medication-tracker/core';
import { runRepositoryTests } from './repository.test.js';
import { PostgresMedicationRepository, createPgPool } from './postgresRepository.js';

// Opt-in: only runs when TEST_DATABASE_URL points at a Postgres (local Docker or
// a Neon branch). Keeps the default `npm test` fast and Docker-free.
const url = process.env['TEST_DATABASE_URL'];

const SEED_MED: Medication = {
  id: 'med-1',
  name: 'Metformin',
  pillsAtPickup: 30,
  lastPickupDate: '2026-06-25',
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['08:00'],
};

const SEED_DOSES: Dose[] = [
  { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null },
  { medicationId: 'med-1', scheduledFor: '2026-06-25T21:00:00Z', takenAt: null },
];

describe.skipIf(!url)('PostgresMedicationRepository', () => {
  let pool: ReturnType<typeof createPgPool>;
  let repo: PostgresMedicationRepository;

  beforeAll(async () => {
    pool = createPgPool(url as string);
    repo = new PostgresMedicationRepository(pool);
    await repo.ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  // Same shared suite the in-memory and SQLite repos pass — proves parity.
  // Reset to the seed state before each test.
  runRepositoryTests(async () => {
    await pool.query('TRUNCATE medications, doses');
    await repo.seed([SEED_MED], SEED_DOSES);
    return repo;
  });
});
