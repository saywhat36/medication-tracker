import cron from 'node-cron';
import { dateInZone } from '@medication-tracker/core';
import { createRepository } from '@medication-tracker/api';
import { ResendEmailSender } from './emailSender.js';
import { ConsoleNotifier, EmailNotifier } from './notifier.js';
import { TelegramNotifier } from './telegramNotifier.js';
import { runSweep } from './sweep.js';

async function main(): Promise<void> {
  // Same backend selection as the API: Postgres if DATABASE_URL is set, else SQLite.
  const repo = await createRepository();
  const timeZone = process.env['APP_TIMEZONE'] || 'UTC';

  // RESEND_API_KEY (per-medication recipient/companion emails) also powers
  // the operator channel when NOTIFY_EMAIL is set, taking priority over
  // Telegram — which stays as a fallback for anyone not yet on email.
  const emailSender = process.env['RESEND_API_KEY'] ? ResendEmailSender.fromEnv() : undefined;
  const notifyEmail = process.env['NOTIFY_EMAIL'];
  const notifier =
    emailSender && notifyEmail
      ? new EmailNotifier(emailSender, notifyEmail)
      : process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']
        ? TelegramNotifier.fromEnv()
        : new ConsoleNotifier();

  const thresholdHours = Number(process.env['SWEEP_THRESHOLD_HOURS'] ?? 3);

  async function sweep(): Promise<void> {
    const now = new Date().toISOString();
    console.log(`[sweep] running at ${now}`);
    try {
      // Make sure today's doses exist before checking for overdue ones, so
      // reminders fire even on days the dashboard was never opened.
      await repo.ensureDosesForDay(dateInZone(now, timeZone));
      await runSweep(repo, notifier, now, timeZone, emailSender);
    } catch (err) {
      console.error('[sweep] error:', err);
    }
  }

  // Run immediately on startup, then every hour.
  void sweep();
  cron.schedule('0 * * * *', () => void sweep());

  console.log(
    `[sweep] started — threshold ${thresholdHours}h, ` +
      `notifier: ${notifier.constructor.name}, per-medication email: ${emailSender ? 'on' : 'off'}`
  );
}

void main();
