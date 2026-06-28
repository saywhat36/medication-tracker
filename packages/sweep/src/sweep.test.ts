import { describe, it, expect, vi } from 'vitest';
import { runSweep } from './sweep.js';
import type { Notifier } from './notifier.js';
import type { MedicationRepository } from '@medication-tracker/api';
import type { Dose, Medication } from '@medication-tracker/core';

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

// Fake repo with mutable doses and a real (in-memory) notification log, so the
// idempotency behaviour can be exercised across multiple runSweep calls.
function fakeRepo(initial: Dose[], meds: Medication[] = []) {
  let doses = initial;
  const notified = new Set<string>();
  const repo = {
    getDueDoses: async (now: string) =>
      doses.filter((d) => d.takenAt === null && d.scheduledFor <= now),
    getNotifiedDoseKeys: async () => [...notified],
    recordDoseNotified: async (key: string) => {
      notified.add(key);
    },
    listMedications: async () => meds,
    markTaken: async () => {
      throw new Error('not implemented');
    },
    getRefillStatuses: async () => [],
  } as unknown as MedicationRepository;
  return { repo, setDoses: (d: Dose[]) => { doses = d; } };
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
    const { repo } = fakeRepo([OVERDUE_DOSE]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(1);
    expect(notifier.messages[0]).toContain('med-1');
  });

  it('does not notify for a dose within the threshold', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([RECENT_DOSE]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(0);
  });

  it('does not notify for a taken dose', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([TAKEN_DOSE]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(0);
  });

  it('is idempotent — re-running does not re-notify the same dose', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([OVERDUE_DOSE]);
    await runSweep(repo, notifier, NOW);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(1); // still just 1 from the first run
  });

  it('notifies a new overdue dose that was not notified before', async () => {
    const notifier = fakeNotifier();
    const { repo, setDoses } = fakeRepo([OVERDUE_DOSE]);
    await runSweep(repo, notifier, NOW);
    const dose2: Dose = { medicationId: 'med-2', scheduledFor: '2026-06-25T07:00:00Z', takenAt: null };
    setDoses([OVERDUE_DOSE, dose2]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(2); // original + new
  });

  it('includes the medication name and time (not the id) in the message', async () => {
    const notifier = fakeNotifier();
    const med: Medication = {
      id: 'med-1',
      name: 'Metformin',
      pillsAtPickup: 30,
      lastPickupDate: '2026-06-25',
      dosesPerDay: 1,
      refillLeadTimeDays: 7,
      schedule: ['08:00'],
    };
    const { repo } = fakeRepo([OVERDUE_DOSE], [med]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages[0]).toContain('Metformin');
    expect(notifier.messages[0]).toContain('08:00');
    expect(notifier.messages[0]).not.toContain('med-1');
  });

  it('records the notified dose key in the repository', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([OVERDUE_DOSE]);
    await runSweep(repo, notifier, NOW);
    expect(await repo.getNotifiedDoseKeys()).toContain('med-1:2026-06-25T08:00:00Z');
  });
});
