import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMedicationRepository } from './sqliteRepository.js';
import { createServer } from './server.js';

const dataDir = process.env['DATA_DIR'] ?? './data';
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(`${dataDir}/medications.db`);
const repo = new SqliteMedicationRepository(db);
const port = Number(process.env['PORT'] ?? 3000);

createServer(repo).listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
  console.log('[api] data directory:', dataDir);
});
