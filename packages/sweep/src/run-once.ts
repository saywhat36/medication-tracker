import { dateInZone } from '@medication-tracker/core';
import { createRepository } from '@medication-tracker/api';
import { ConsoleNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep } from './sweep.js';

// A single overdue-check that then exits — invoked by the GitHub Actions cron.
// (The always-on scheduler.ts is the local equivalent.) Idempotency is handled
// by the DB notification log, so repeated runs won't re-notify the same dose.
async function main(): Promise<void> {
  const repo = await createRepository();
  const notifier =
    process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
      ? TelegramNotifier.fromEnv()
      : new ConsoleNotifier();

  const timeZone = process.env['APP_TIMEZONE'] ?? 'UTC';
  const now = new Date().toISOString();
  console.log(`[sweep:once] running at ${now}, tz: ${timeZone}, notifier: ${notifier.constructor.name}`);
  await repo.ensureDosesForDay(dateInZone(now, timeZone));
  await runSweep(repo, notifier, now, timeZone);
  console.log('[sweep:once] done');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[sweep:once] error:', err);
    process.exit(1);
  });
