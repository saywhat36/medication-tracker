import { isOverdue, formatInZone, dateInZone } from '@medication-tracker/core';
import type { Medication } from '@medication-tracker/core';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';
import type { EmailSender } from './emailSender.js';

function doseKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}:${scheduledFor}`;
}

function dueKey(medicationId: string, scheduledFor: string): string {
  return `due:${medicationId}:${scheduledFor}`;
}

function takenKey(medicationId: string, scheduledFor: string): string {
  return `taken:${medicationId}:${scheduledFor}`;
}

// One refill reminder per medication per pickup cycle. The lastPickupDate in the
// key means a new prescription (new pickup date) earns a fresh reminder.
function refillKey(medicationId: string, lastPickupDate: string): string {
  return `refill:${medicationId}:${lastPickupDate}`;
}

// "2026-07-25" -> "25 Jul"
function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

// "Sarah" if a name is set, else a generic stand-in — avoids guessing
// pronouns for companion messages when only an email address is on file.
function displayName(med: Medication): string {
  return med.recipientName?.trim() || 'The recipient';
}

function hasEmailAudience(med: Medication): boolean {
  return Boolean(med.recipientEmail) || (med.companionEmails?.length ?? 0) > 0;
}

async function notifyRecipientAndCompanions(
  emailSender: EmailSender,
  med: Medication,
  recipientSubject: string,
  recipientBody: string,
  companionSubject: string,
  companionBody: string
): Promise<void> {
  if (med.recipientEmail) {
    await emailSender.send(med.recipientEmail, recipientSubject, recipientBody);
  }
  for (const email of med.companionEmails ?? []) {
    await emailSender.send(email, companionSubject, companionBody);
  }
}

// Sends, each at most once thanks to the repository's notification log (so
// this is safe to run as a repeated cron):
//   1. a due-now reminder for a not-yet-overdue dose (opt-in — only for
//      medications with a recipient/companion email configured)
//   2. an overdue, untaken dose — the personalised recipient/companion
//      version when configured, else the original generic operator message
//   3. a "just taken" reassurance ping to companions only
//   4. a medication that has reached its reorder point (unchanged: always
//      the generic operator message, regardless of recipient/companion setup)
//
// emailSender is optional so existing deployments without Resend configured
// keep working exactly as before (steps 1 and 3 are skipped entirely; step 2
// always falls back to the generic notifier).
export async function runSweep(
  repo: MedicationRepository,
  notifier: Notifier,
  now: string,
  timeZone = 'UTC',
  emailSender?: EmailSender
): Promise<void> {
  const notified = new Set(await repo.getNotifiedDoseKeys());
  const meds = await repo.listMedications();
  const medById = new Map(meds.map((m) => [m.id, m]));
  const dueDoses = await repo.getDueDoses(now);

  // 1) Due-now reminders.
  if (emailSender) {
    for (const dose of dueDoses) {
      if (isOverdue(dose, now)) continue; // handled by the overdue tier below
      const med = medById.get(dose.medicationId);
      if (!med || !hasEmailAudience(med)) continue;
      const key = dueKey(dose.medicationId, dose.scheduledFor);
      if (notified.has(key)) continue;
      const time = formatInZone(dose.scheduledFor, timeZone);
      const name = displayName(med);
      await notifyRecipientAndCompanions(
        emailSender,
        med,
        `Time to take your ${med.name}`,
        `${med.name} is due now (${time}).`,
        `Reminder: ${med.name} is due`,
        `${name} needs to take ${med.name} — due ${time}.`
      );
      await repo.recordDoseNotified(key);
      notified.add(key);
    }
  }

  // 2) Overdue doses.
  for (const dose of dueDoses) {
    if (!isOverdue(dose, now)) continue;
    const key = doseKey(dose.medicationId, dose.scheduledFor);
    if (notified.has(key)) continue;
    const med = medById.get(dose.medicationId);
    const time = formatInZone(dose.scheduledFor, timeZone);
    if (emailSender && med && hasEmailAudience(med)) {
      const name = displayName(med);
      await notifyRecipientAndCompanions(
        emailSender,
        med,
        `You missed your ${med.name} dose`,
        `${med.name} was due at ${time} and hasn't been marked taken.`,
        `${name} hasn't taken ${med.name} yet`,
        `${name} hasn't taken ${med.name} yet — it was due at ${time}.`
      );
    } else {
      const label = med?.name ?? dose.medicationId;
      await notifier.send(`Overdue: ${label} was due at ${time}`);
    }
    await repo.recordDoseNotified(key);
    notified.add(key);
  }

  // 3) Just-taken doses — reassurance ping to companions only; the recipient
  // doesn't need telling they took their own pill. Fires within one sweep
  // cycle of the tick, not instantly.
  if (emailSender) {
    const today = await repo.getDosesForDay(dateInZone(now, timeZone));
    for (const dose of today) {
      if (dose.takenAt === null) continue;
      const med = medById.get(dose.medicationId);
      if (!med || !med.companionEmails?.length) continue;
      const key = takenKey(dose.medicationId, dose.scheduledFor);
      if (notified.has(key)) continue;
      const name = displayName(med);
      for (const email of med.companionEmails) {
        await emailSender.send(email, `${name} took ${med.name}`, `${name} just took ${med.name}.`);
      }
      await repo.recordDoseNotified(key);
      notified.add(key);
    }
  }

  // 4) Refills due — daysUntilRefill <= 0 means supply has dropped to within
  // the medication's lead time of running out. Always the generic operator
  // message, unchanged from before recipient/companion emails existed.
  const statuses = await repo.getRefillStatuses(dateInZone(now, timeZone));
  for (const status of statuses) {
    if (status.daysUntilRefill > 0) continue;
    const med = medById.get(status.medicationId);
    if (!med) continue;
    const key = refillKey(med.id, med.lastPickupDate);
    if (notified.has(key)) continue;
    await notifier.send(
      `Reorder ${med.name} — about ${status.pillsRemaining} left, runs out ${formatDate(status.runOutDate)}`
    );
    await repo.recordDoseNotified(key);
    notified.add(key);
  }
}
