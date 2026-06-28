import { describe, it, expect, vi } from 'vitest';
import { runSweep } from './sweep.js';
import type { Notifier } from './notifier.js';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';

const NOW = '2026-06-25T12:00:00Z'; // 4h after OVERDUE, before FUTURE

const OVERDUE_DOSE: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T08:00:00Z', // 4h ago — past 3h threshold
  takenAt: null,
};

const RECENT_DOSE: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T11:30:00Z', // 30 min ago — within threshold
  takenAt: null,
};

const TAKEN_DOSE: Dose = {
  medicationId: 'med-1',
  scheduledFor: '2026-06-25T08:00:00Z',
  takenAt: '2026-06-25T08:05:00Z',
};

function fakeRepo(doses: Dose[]): MedicationRepository {
  // Only getDueDoses is exercised by runSweep; the rest are unused stubs.
  return {
    listMedications: async (): Promise<Medication[]> => [],
    getDueDoses: async (now: string) =>
      doses.filter((d) => d.takenAt === null && d.scheduledFor <= now),
    markTaken: async () => { throw new Error('not implemented'); },
    getRefillStatuses: async (): Promise<RefillStatus[]> => [],
  } as MedicationRepository;
}

function fakeNotifier(): Notifier & { messages: string[] } {
  const messages: string[] = [];
  return {
    messages,
    send: vi.fn(async (msg: string) => { messages.push(msg); }),
  };
}

describe('runSweep', () => {
  it('notifies once for each overdue dose', async () => {
    const notifier = fakeNotifier();
    await runSweep(fakeRepo([OVERDUE_DOSE]), notifier, NOW);
    expect(notifier.messages).toHaveLength(1);
    expect(notifier.messages[0]).toContain('med-1');
  });

  it('does not notify for a dose within the threshold', async () => {
    const notifier = fakeNotifier();
    await runSweep(fakeRepo([RECENT_DOSE]), notifier, NOW);
    expect(notifier.messages).toHaveLength(0);
  });

  it('does not notify for a taken dose', async () => {
    const notifier = fakeNotifier();
    await runSweep(fakeRepo([TAKEN_DOSE]), notifier, NOW);
    expect(notifier.messages).toHaveLength(0);
  });

  it('is idempotent — re-running does not re-notify the same dose', async () => {
    const notifier = fakeNotifier();
    const notified = await runSweep(fakeRepo([OVERDUE_DOSE]), notifier, NOW);
    await runSweep(fakeRepo([OVERDUE_DOSE]), notifier, NOW, notified);
    expect(notifier.messages).toHaveLength(1); // still just 1 from the first run
  });

  it('notifies a new overdue dose that was not in a previous run', async () => {
    const notifier = fakeNotifier();
    const dose2: Dose = { medicationId: 'med-2', scheduledFor: '2026-06-25T07:00:00Z', takenAt: null };
    const notified = await runSweep(fakeRepo([OVERDUE_DOSE]), notifier, NOW);
    await runSweep(fakeRepo([OVERDUE_DOSE, dose2]), notifier, NOW, notified);
    expect(notifier.messages).toHaveLength(2); // original + new
  });

  it('returns a set containing the notified dose key', async () => {
    const notifier = fakeNotifier();
    const notified = await runSweep(fakeRepo([OVERDUE_DOSE]), notifier, NOW);
    expect(notified.has('med-1:2026-06-25T08:00:00Z')).toBe(true);
  });
});
