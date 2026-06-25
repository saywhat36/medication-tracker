/**
 * One-off seed script. Run once to populate a fresh database:
 *   npm run dev:api      # start the server first (creates the schema)
 *   npx tsx packages/api/src/seed.ts
 *
 * Or run directly against the DB file:
 *   DATA_DIR=./data npx tsx packages/api/src/seed.ts
 */
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMedicationRepository } from './sqliteRepository.js';

const dataDir = process.env['DATA_DIR'] ?? './data';
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(`${dataDir}/medications.db`);
const repo = new SqliteMedicationRepository(db);

const today = new Date().toISOString().slice(0, 10);
const doseTime = (offset: number) =>
  new Date(Date.now() + offset * 60 * 60 * 1000).toISOString();

const medications = repo.listMedications();
if (medications.length > 0) {
  console.log('Database already seeded — found', medications.length, 'medications. Exiting.');
  process.exit(0);
}

// Insert via the internal insertMedication / insertDose methods indirectly
// by constructing a fresh repo with seed data.
const seeded = new SqliteMedicationRepository(
  db,
  [
    {
      id: 'med-1',
      name: 'Metformin',
      pillsRemaining: 30,
      dosesPerDay: 1,
      refillLeadTimeDays: 7,
      schedule: ['08:00'],
    },
    {
      id: 'med-2',
      name: 'Lisinopril',
      pillsRemaining: 10,
      dosesPerDay: 1,
      refillLeadTimeDays: 7,
      schedule: ['21:00'],
    },
  ],
  [
    { medicationId: 'med-1', scheduledFor: `${today}T08:00:00Z`, takenAt: null },
    { medicationId: 'med-2', scheduledFor: `${today}T21:00:00Z`, takenAt: null },
    // An overdue dose for testing the sweep (4 hours ago)
    { medicationId: 'med-1', scheduledFor: doseTime(-4), takenAt: null },
  ]
);

console.log('Seeded:', seeded.listMedications().map((m) => m.name).join(', '));
console.log('Doses:', seeded.getDueDoses(new Date().toISOString()).length, 'due right now');
