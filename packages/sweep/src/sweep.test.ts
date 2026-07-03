import { describe, it, expect, vi } from 'vitest';
import { runSweep } from './sweep.js';
import type { Notifier } from './notifier.js';
import type { EmailSender } from './emailSender.js';
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

// Fake repo with mutable doses and a real (in-memory) notification log, so the
// idempotency behaviour can be exercised across multiple runSweep calls.
function fakeRepo(initial: Dose[], meds: Medication[] = [], statuses: RefillStatus[] = []) {
  let doses = initial;
  const notified = new Set<string>();
  const repo = {
    getDueDoses: async (now: string) =>
      doses.filter((d) => d.takenAt === null && d.scheduledFor <= now),
    // The taken-notification tier scans "today" via getDosesForDay — the
    // fake repo ignores the date and just returns everything, since these
    // tests only ever seed doses for a single day.
    getDosesForDay: async () => doses,
    getNotifiedDoseKeys: async () => [...notified],
    recordDoseNotified: async (key: string) => {
      notified.add(key);
    },
    listMedications: async () => meds,
    markTaken: async () => {
      throw new Error('not implemented');
    },
    getRefillStatuses: async () => statuses,
  } as unknown as MedicationRepository;
  return { repo, setDoses: (d: Dose[]) => { doses = d; } };
}

function fakeEmailSender(): EmailSender & { messages: { to: string; subject: string; body: string }[] } {
  const messages: { to: string; subject: string; body: string }[] = [];
  return {
    messages,
    send: vi.fn(async (to: string, subject: string, body: string) => {
      messages.push({ to, subject, body });
    }),
  };
}

const MED: Medication = {
  id: 'med-1',
  name: 'Metformin',
  pillsAtPickup: 30,
  lastPickupDate: '2026-06-25',
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['08:00'],
};

function refillStatus(daysUntilRefill: number): RefillStatus {
  return {
    medicationId: 'med-1',
    pillsRemaining: 5,
    daysUntilRefill,
    runOutDate: '2026-07-02',
    refillDate: '2026-06-25',
  };
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

  it('sends a refill reminder when a medication reaches its reorder point', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([], [MED], [refillStatus(0)]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(1);
    expect(notifier.messages[0]).toContain('Reorder Metformin');
  });

  it('does not send a refill reminder before the reorder point', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([], [MED], [refillStatus(5)]);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(0);
  });

  it('does not re-send the refill reminder for the same pickup cycle', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([], [MED], [refillStatus(-2)]);
    await runSweep(repo, notifier, NOW);
    await runSweep(repo, notifier, NOW);
    expect(notifier.messages).toHaveLength(1);
    expect(await repo.getNotifiedDoseKeys()).toContain('refill:med-1:2026-06-25');
  });
});

const MED_WITH_EMAILS: Medication = {
  ...MED,
  recipientEmail: 'sarah@example.com',
  recipientName: 'Sarah',
  companionEmails: ['gavin@example.com', 'mum@example.com'],
};

describe('runSweep — email notifications', () => {
  it('does nothing extra when no emailSender is passed, even with emails configured', async () => {
    const notifier = fakeNotifier();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW); // no emailSender
    expect(notifier.messages).toHaveLength(0); // RECENT_DOSE isn't overdue either
  });

  it('sends a due-now reminder to the recipient and each companion', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(3); // recipient + 2 companions
    const toSarah = emailSender.messages.find((m) => m.to === 'sarah@example.com');
    expect(toSarah?.subject).toContain('Time to take your Metformin');
    const toGavin = emailSender.messages.find((m) => m.to === 'gavin@example.com');
    expect(toGavin?.subject).toContain('Reminder');
    expect(toGavin?.body).toContain('Sarah needs to take Metformin');
  });

  it('does not send a due-now reminder for a medication without any recipient/companion email', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED]); // MED has no emails
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(0);
  });

  it('is idempotent — a due-now reminder is not re-sent on the next run', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(3); // still just the first run's 3
  });

  it('sends the personalised missed-dose emails instead of the generic notifier', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([OVERDUE_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(notifier.messages).toHaveLength(0); // generic channel untouched
    expect(emailSender.messages).toHaveLength(3);
    const toSarah = emailSender.messages.find((m) => m.to === 'sarah@example.com');
    expect(toSarah?.subject).toContain('You missed your Metformin dose');
    const toMum = emailSender.messages.find((m) => m.to === 'mum@example.com');
    expect(toMum?.body).toContain("Sarah hasn't taken Metformin yet");
  });

  it('falls back to the generic notifier for a missed dose with no recipient/companion configured', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([OVERDUE_DOSE], [MED]); // MED has no emails
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(notifier.messages).toHaveLength(1);
    expect(notifier.messages[0]).toContain('Overdue: Metformin');
    expect(emailSender.messages).toHaveLength(0);
  });

  it('falls back to "The recipient" in companion wording when no name is set', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const unnamed: Medication = { ...MED, companionEmails: ['gavin@example.com'] }; // no recipientEmail or name
    const { repo } = fakeRepo([OVERDUE_DOSE], [unnamed]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(1);
    expect(emailSender.messages[0]?.body).toContain("The recipient hasn't taken Metformin yet");
  });

  it('sends a "just taken" ping to companions only, not the recipient', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([TAKEN_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(2); // 2 companions, no recipient
    expect(emailSender.messages.some((m) => m.to === 'sarah@example.com')).toBe(false);
    expect(emailSender.messages.every((m) => m.subject.includes('Sarah took Metformin'))).toBe(true);
  });

  it('does not send a "just taken" ping when the medication has no companions', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const recipientOnly: Medication = { ...MED, recipientEmail: 'sarah@example.com' };
    const { repo } = fakeRepo([TAKEN_DOSE], [recipientOnly]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(0);
  });

  it('is idempotent — a "just taken" ping is not re-sent on the next run', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([TAKEN_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(emailSender.messages).toHaveLength(2); // still just the first run's 2
  });

  it('still sends the refill reminder through the generic notifier, unaffected by recipient emails', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([], [MED_WITH_EMAILS], [refillStatus(0)]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender);
    expect(notifier.messages).toHaveLength(1);
    expect(notifier.messages[0]).toContain('Reorder Metformin');
    expect(emailSender.messages).toHaveLength(0);
  });
});

const LINK_OPTIONS = { secret: 'test-secret', baseUrl: 'https://api.example.com' };

describe('runSweep — tap-to-take links', () => {
  it('appends a take link to the due-now reminder for both recipient and companions', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender, LINK_OPTIONS);
    expect(emailSender.messages).toHaveLength(3);
    for (const m of emailSender.messages) {
      expect(m.body).toContain('Mark as taken: https://api.example.com/take/');
    }
  });

  it('appends a take link to the missed-dose email', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([OVERDUE_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender, LINK_OPTIONS);
    expect(emailSender.messages.every((m) => m.body.includes('/take/'))).toBe(true);
  });

  it('does not append a take link when linkOptions is not provided', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender); // no linkOptions
    expect(emailSender.messages.some((m) => m.body.includes('/take/'))).toBe(false);
  });

  it('does not append a take link to the "just taken" ping (nothing to tap)', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([TAKEN_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender, LINK_OPTIONS);
    expect(emailSender.messages.some((m) => m.body.includes('/take/'))).toBe(false);
  });

  it('produces a token that verifies back to the correct dose', async () => {
    const notifier = fakeNotifier();
    const emailSender = fakeEmailSender();
    const { repo } = fakeRepo([RECENT_DOSE], [MED_WITH_EMAILS]);
    await runSweep(repo, notifier, NOW, 'UTC', emailSender, LINK_OPTIONS);
    const link = emailSender.messages[0]?.body.match(/https:\/\/api\.example\.com\/take\/(\S+)/)?.[1];
    expect(link).toBeDefined();
    const { verifyDoseToken } = await import('@medication-tracker/api');
    const dose = verifyDoseToken(link!, LINK_OPTIONS.secret, Date.parse(NOW));
    expect(dose).toEqual({ medicationId: RECENT_DOSE.medicationId, scheduledFor: RECENT_DOSE.scheduledFor });
  });
});
