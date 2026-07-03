import { isOverdue, formatInZone, dateInZone } from '@medication-tracker/core';
import type { Medication } from '@medication-tracker/core';
import { signDoseToken } from '@medication-tracker/api';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';
import type { EmailSender } from './emailSender.js';

// How long a tap-to-take link stays valid — generous enough to cover a
// genuinely late dose, without leaving very old email links live forever.
const TAKE_LINK_EXPIRY_MS = 72 * 60 * 60 * 1000; // 3 days

export interface TakeLinkOptions {
  secret: string;
  baseUrl: string; // the API's public origin, e.g. https://api.example.com (no trailing slash)
}

function takeLink(
  medicationId: string,
  scheduledFor: string,
  opts: TakeLinkOptions,
  nowMs: number
): string {
  const token = signDoseToken(medicationId, scheduledFor, nowMs + TAKE_LINK_EXPIRY_MS, opts.secret);
  return `${opts.baseUrl}/take/${token}`;
}

// Appends a "mark as taken" link to a message body when link signing is
// configured, so the reminder/missed emails are actionable from a phone lock
// screen with no login. Omitted gracefully when unconfigured.
function withTakeLink(
  body: string,
  medicationId: string,
  scheduledFor: string,
  linkOptions: TakeLinkOptions | undefined,
  nowMs: number
): string {
  if (!linkOptions) return body;
  return `${body}\n\nMark as taken: ${takeLink(medicationId, scheduledFor, linkOptions, nowMs)}`;
}

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

// Sends to the recipient and each companion independently — one bad address
// (or one provider hiccup) must not stop the others from getting their copy,
// and must not cause a retry that duplicates the ones that already went out.
//
// If every send fails (e.g. the provider itself is down or misconfigured),
// this rethrows so the caller doesn't record the dose as notified — the next
// sweep run will retry the whole thing, matching the pre-existing behaviour
// for a total outage. If only some fail, those are logged but the call
// succeeds, since re-attempting would re-send to whichever addresses already
// received it.
async function notifyRecipientAndCompanions(
  emailSender: EmailSender,
  med: Medication,
  recipientSubject: string,
  recipientBody: string,
  companionSubject: string,
  companionBody: string
): Promise<void> {
  const targets: { to: string; subject: string; body: string }[] = [];
  if (med.recipientEmail) targets.push({ to: med.recipientEmail, subject: recipientSubject, body: recipientBody });
  for (const email of med.companionEmails ?? []) {
    targets.push({ to: email, subject: companionSubject, body: companionBody });
  }

  let successCount = 0;
  const failures: { to: string; error: unknown }[] = [];
  for (const target of targets) {
    try {
      await emailSender.send(target.to, target.subject, target.body);
      successCount++;
    } catch (error) {
      failures.push({ to: target.to, error });
    }
  }

  for (const failure of failures) {
    console.error(`[sweep] failed to email ${failure.to} for ${med.name}:`, failure.error);
  }
  if (successCount === 0 && failures.length > 0) {
    throw failures[0]!.error;
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
  emailSender?: EmailSender,
  linkOptions?: TakeLinkOptions
): Promise<void> {
  const nowMs = Date.parse(now);
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
        withTakeLink(`${med.name} is due now (${time}).`, dose.medicationId, dose.scheduledFor, linkOptions, nowMs),
        `Reminder: ${med.name} is due`,
        // No take link for companions — marking a dose taken is the
        // recipient's call, not something a companion should be able to do
        // with one tap on someone else's behalf.
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
        withTakeLink(
          `${med.name} was due at ${time} and hasn't been marked taken.`,
          dose.medicationId,
          dose.scheduledFor,
          linkOptions,
          nowMs
        ),
        `${name} hasn't taken ${med.name} yet`,
        // No take link for companions — same reasoning as the due-now
        // reminder above.
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
