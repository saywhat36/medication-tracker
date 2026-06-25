import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import cron from 'node-cron';
import { SqliteMedicationRepository } from '@medication-tracker/api';
import { ConsoleNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep } from './sweep.js';

const dataDir = process.env['DATA_DIR'] ?? './data';
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(`${dataDir}/medications.db`);
const repo = new SqliteMedicationRepository(db);

const notifier =
  process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
    ? TelegramNotifier.fromEnv()
    : new ConsoleNotifier();

const thresholdHours = Number(process.env['SWEEP_THRESHOLD_HOURS'] ?? 3);

let notified = new Set<string>();

async function sweep() {
  const now = new Date().toISOString();
  console.log(`[sweep] running at ${now}`);
  try {
    notified = await runSweep(repo, notifier, now, notified);
  } catch (err) {
    console.error('[sweep] error:', err);
  }
}

// Run immediately on startup, then every hour.
void sweep();
cron.schedule('0 * * * *', () => void sweep());

console.log(
  `[sweep] started — threshold ${thresholdHours}h, ` +
    `notifier: ${notifier.constructor.name}`
);
