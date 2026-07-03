import { dateInZone } from '@medication-tracker/core';
import { createRepository } from '@medication-tracker/api';
import { ResendEmailSender } from './emailSender.js';
import { ConsoleNotifier, EmailNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep } from './sweep.js';

// A single overdue-check that then exits — invoked by the GitHub Actions cron.
// (The always-on scheduler.ts is the local equivalent.) Idempotency is handled
// by the DB notification log, so repeated runs won't re-notify the same dose.
async function main(): Promise<void> {
  const repo = await createRepository();

  const emailSender = process.env['RESEND_API_KEY'] ? ResendEmailSender.fromEnv() : undefined;
  const notifyEmail = process.env['NOTIFY_EMAIL'];
  const notifier =
    emailSender && notifyEmail
      ? new EmailNotifier(emailSender, notifyEmail)
      : process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
        ? TelegramNotifier.fromEnv()
        : new ConsoleNotifier();

  const timeZone = process.env['APP_TIMEZONE'] || 'UTC';
  const now = new Date().toISOString();
  console.log(
    `[sweep:once] running at ${now}, tz: ${timeZone}, notifier: ${notifier.constructor.name}, per-medication email: ${emailSender ? 'on' : 'off'}`
  );
  await repo.ensureDosesForDay(dateInZone(now, timeZone));
  await runSweep(repo, notifier, now, timeZone, emailSender);
  console.log('[sweep:once] done');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[sweep:once] error:', err);
    process.exit(1);
  });
