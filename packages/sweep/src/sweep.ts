import { isOverdue } from '@medication-tracker/core';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';

function doseKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}:${scheduledFor}`;
}

// Notify once for each overdue, untaken dose. Idempotency is backed by the
// repository's notification log, so this is safe to run as repeated one-shot
// processes (e.g. a GitHub Actions cron) without re-notifying the same dose.
export async function runSweep(
  repo: MedicationRepository,
  notifier: Notifier,
  now: string
): Promise<void> {
  const notified = new Set(await repo.getNotifiedDoseKeys());
  const dueDoses = await repo.getDueDoses(now);

  for (const dose of dueDoses) {
    if (!isOverdue(dose, now)) continue;
    const key = doseKey(dose.medicationId, dose.scheduledFor);
    if (notified.has(key)) continue;
    await notifier.send(`Overdue dose — ${dose.medicationId} was due at ${dose.scheduledFor}`);
    await repo.recordDoseNotified(key);
    notified.add(key);
  }
}
