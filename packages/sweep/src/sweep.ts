import { isOverdue } from '@medication-tracker/core';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';

function doseKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}:${scheduledFor}`;
}

// "2026-06-28T13:00:00Z" -> "13:00" (shown as the time that was entered).
function formatTime(scheduledFor: string): string {
  return scheduledFor.slice(11, 16);
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
  const toNotify = dueDoses.filter(
    (d) => isOverdue(d, now) && !notified.has(doseKey(d.medicationId, d.scheduledFor))
  );
  if (toNotify.length === 0) return;

  // Look up names so messages read "Metformin" rather than a raw id.
  const nameById = new Map((await repo.listMedications()).map((m) => [m.id, m.name]));

  for (const dose of toNotify) {
    const name = nameById.get(dose.medicationId) ?? dose.medicationId;
    await notifier.send(`Overdue: ${name} was due at ${formatTime(dose.scheduledFor)}`);
    await repo.recordDoseNotified(doseKey(dose.medicationId, dose.scheduledFor));
  }
}
