import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMedicationRepository } from './sqliteRepository.js';
import { createServer } from './server.js';

const dataDir = process.env['DATA_DIR'] ?? './data';
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(`${dataDir}/medications.db`);
const repo = new SqliteMedicationRepository(db);

seedIfEmpty(db);

const port = Number(process.env['PORT'] ?? 3000);
createServer(repo).listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});

function seedIfEmpty(database: DatabaseSync): void {
  if (repo.listMedications().length > 0) return;

  console.log('[api] empty database — seeding with sample medications');
  const today = new Date().toISOString().slice(0, 10);

  new SqliteMedicationRepository(
    database,
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
    ]
  );
}
