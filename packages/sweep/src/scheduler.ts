import cron from 'node-cron';
import { dateInZone } from '@medication-tracker/core';
import { createRepository } from '@medication-tracker/api';
import { emailSenderFromEnv } from './emailSender.js';
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

async function main(): Promise<void> {
  // Same backend selection as the API: Postgres if DATABASE_URL is set, else SQLite.
  const repo = await createRepository();
  const timeZone = process.env['APP_TIMEZONE'] || 'UTC';

  // Powers per-medication recipient/companion emails, and (when NOTIFY_EMAIL
  // is also set) the operator channel, taking priority over Telegram — which
  // stays as a fallback for anyone not yet on email.
  const emailSender = emailSenderFromEnv();
  const notifyEmail = process.env['NOTIFY_EMAIL'];
  const notifier =
    emailSender && notifyEmail
      ? new EmailNotifier(emailSender, notifyEmail)
      : process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
        ? TelegramNotifier.fromEnv()
        : new ConsoleNotifier();
  const linkOptions = takeLinkOptionsFromEnv();

  const thresholdHours = Number(process.env['SWEEP_THRESHOLD_HOURS'] ?? 3);

  async function sweep(): Promise<void> {
    const now = new Date().toISOString();
    console.log(`[sweep] running at ${now}`);
    try {
      // Make sure today's doses exist before checking for overdue ones, so
      // reminders fire even on days the dashboard was never opened.
      await repo.ensureDosesForDay(dateInZone(now, timeZone));
      await runSweep(repo, notifier, now, timeZone, emailSender, linkOptions);
    } catch (err) {
      console.error('[sweep] error:', err);
    }
  }

  // Run immediately on startup, then every hour.
  void sweep();
  cron.schedule('0 * * * *', () => void sweep());

  console.log(
    `[sweep] started — threshold ${thresholdHours}h, ` +
      `notifier: ${notifier.constructor.name}, per-medication email: ${emailSender ? emailSender.constructor.name : 'off'}, ` +
      `tap-to-take links: ${linkOptions ? 'on' : 'off'}`
  );
}

void main();
