import { isOverdue } from '@medication-tracker/core';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Notifier } from './notifier.js';

function doseKey(medicationId: string, scheduledFor: string): string {
  return `${medicationId}:${scheduledFor}`;
}

export async function runSweep(
  repo: MedicationRepository,
  notifier: Notifier,
  now: string,
  alreadyNotified: ReadonlySet<string> = new Set()
): Promise<Set<string>> {
  const notified = new Set(alreadyNotified);
  const dueDoses = await repo.getDueDoses(now);

  for (const dose of dueDoses) {
    if (!isOverdue(dose, now)) continue;
    const key = doseKey(dose.medicationId, dose.scheduledFor);
    if (notified.has(key)) continue;
    const med = dose.medicationId;
    await notifier.send(`Overdue dose — ${med} was due at ${dose.scheduledFor}`);
    notified.add(key);
  }

  return notified;
}
