import cron from 'node-cron';
import { createRepository } from '@medication-tracker/api';
import { ConsoleNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep } from './sweep.js';

async function main(): Promise<void> {
  // Same backend selection as the API: Postgres if DATABASE_URL is set, else SQLite.
  const repo = await createRepository();

  const notifier =
    process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
      ? TelegramNotifier.fromEnv()
      : new ConsoleNotifier();

  const thresholdHours = Number(process.env['SWEEP_THRESHOLD_HOURS'] ?? 3);
  let notified = new Set<string>();

  async function sweep(): Promise<void> {
    const now = new Date().toISOString();
    console.log(`[sweep] running at ${now}`);
    try {
      // Make sure today's doses exist before checking for overdue ones, so
      // reminders fire even on days the dashboard was never opened.
      await repo.ensureDosesForDay(now.slice(0, 10));
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
}

void main();
