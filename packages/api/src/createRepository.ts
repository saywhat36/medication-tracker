import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMedicationRepository } from './sqliteRepository.js';
import { PostgresMedicationRepository, createPgPool } from './postgresRepository.js';
import type { MedicationRepository } from './repository.js';

// Selects the storage backend from the environment:
//   DATABASE_URL set  -> Postgres (hosted)
//   otherwise         -> local SQLite file under DATA_DIR
export async function createRepository(): Promise<MedicationRepository> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl) {
    const repo = new PostgresMedicationRepository(createPgPool(databaseUrl));
    await repo.ensureSchema();
    console.log('[api] storage: Postgres');
    return repo;
  }

  const dataDir = process.env['DATA_DIR'] ?? './data';
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(`${dataDir}/medications.db`);
  console.log(`[api] storage: SQLite (${dataDir}/medications.db)`);
  return new SqliteMedicationRepository(db);
}
