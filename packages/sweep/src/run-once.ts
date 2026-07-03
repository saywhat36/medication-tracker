import { dateInZone } from '@medication-tracker/core';
import { createRepository } from '@medication-tracker/api';
import { ResendEmailSender } from './emailSender.js';
import { ConsoleNotifier, EmailNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep, type TakeLinkOptions } from './sweep.js';

// Both LINK_SIGNING_SECRET and API_PUBLIC_URL must be set for tap-to-take
// links to appear — omitted gracefully (plain-text emails, no link) if either
// is missing. The secret must match the API service's LINK_SIGNING_SECRET
// exactly, since that's what verifies the link when it's tapped.
function takeLinkOptionsFromEnv(): TakeLinkOptions | undefined {
  const secret = process.env['LINK_SIGNING_SECRET'];
  const baseUrl = process.env['API_PUBLIC_URL'];
  if (!secret || !baseUrl) return undefined;
  return { secret, baseUrl: baseUrl.replace(/\/$/, '') };
}

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
  const linkOptions = takeLinkOptionsFromEnv();

  const timeZone = process.env['APP_TIMEZONE'] || 'UTC';
  const now = new Date().toISOString();
  console.log(
    `[sweep:once] running at ${now}, tz: ${timeZone}, notifier: ${notifier.constructor.name}, per-medication email: ${emailSender ? 'on' : 'off'}, tap-to-take links: ${linkOptions ? 'on' : 'off'}`
  );
  await repo.ensureDosesForDay(dateInZone(now, timeZone));
  await runSweep(repo, notifier, now, timeZone, emailSender, linkOptions);
  console.log('[sweep:once] done');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[sweep:once] error:', err);
    process.exit(1);
  });
