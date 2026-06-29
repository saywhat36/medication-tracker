import { isOverdue, formatInZone, dateInZone } from '@medication-tracker/core';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';

function doseKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}:${scheduledFor}`;
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

// Sends two kinds of reminder, each at most once thanks to the repository's
// notification log (so this is safe to run as a repeated cron):
//   1. an overdue, untaken dose
//   2. a medication that has reached its reorder point (within the lead time)
export async function runSweep(
  repo: MedicationRepository,
  notifier: Notifier,
  now: string,
  timeZone = 'UTC'
): Promise<void> {
  const notified = new Set(await repo.getNotifiedDoseKeys());
  const meds = await repo.listMedications();
  const medById = new Map(meds.map((m) => [m.id, m]));

  // 1) Overdue doses
  const dueDoses = await repo.getDueDoses(now);
  for (const dose of dueDoses) {
    if (!isOverdue(dose, now)) continue;
    const key = doseKey(dose.medicationId, dose.scheduledFor);
    if (notified.has(key)) continue;
    const name = medById.get(dose.medicationId)?.name ?? dose.medicationId;
    await notifier.send(`Overdue: ${name} was due at ${formatInZone(dose.scheduledFor, timeZone)}`);
    await repo.recordDoseNotified(key);
    notified.add(key);
  }

  // 2) Refills due — daysUntilRefill <= 0 means supply has dropped to within the
  // medication's lead time of running out.
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
