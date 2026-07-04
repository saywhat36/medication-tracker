import type { Medication, MedicationAdherence, RefillStatus } from '@medication-tracker/core';
import { streakLabel } from '@/adherenceLabel';
import { refillUrgency, urgencyRank, type RefillUrgency } from '@/refillUrgency';
import { Parchment } from './Parchment';

interface Props {
  medications: Medication[];
  statuses: RefillStatus[];
  adherenceStatuses: MedicationAdherence[];
}

interface Entry {
  id: string;
  name: string;
  urgency: RefillUrgency;
  daysLeft: number;
  runOutDate: string;
  currentStreakDays: number;
}

// e.g. "Thu 9 Jul" — UTC-anchored so the shown day matches the stored date.
function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function countdown(entry: Entry): { text: string; className: string } {
  const days = `${entry.daysLeft} ${entry.daysLeft === 1 ? 'day' : 'days'} left`;
  switch (entry.urgency) {
    case 'out':
      return { text: 'out of pills', className: 'text-apothecary-wax-red' };
    case 'reorder-now':
      return { text: days, className: 'text-apothecary-wax-red' };
    case 'order-soon':
      return { text: days, className: 'text-apothecary-wax-amber' };
    case 'ok':
      return { text: days, className: 'text-apothecary-ink' };
  }
}

// Only urgent entries get a second line — a call to action, not a schedule.
// (The reminder itself arrives by notification; no need to say when.)
function reminder(entry: Entry): string | null {
  switch (entry.urgency) {
    case 'out':
      return 'visit the pharmacy today';
    case 'reorder-now':
      return `reorder now — runs out ${formatDay(entry.runOutDate)}`;
    default:
      return null;
  }
}

const sealColor: Record<RefillUrgency, string> = {
  out: 'bg-apothecary-wax-red',
  'reorder-now': 'bg-apothecary-wax-red',
  'order-soon': 'bg-apothecary-wax-amber',
  ok: 'bg-apothecary-wax-green',
};

const sealMeaning: Record<RefillUrgency, string> = {
  out: 'a medication is out of pills',
  'reorder-now': 'a medication needs reordering now',
  'order-soon': 'a medication needs reordering soon',
  ok: 'no refills due yet',
};

// The REMEMBER parchment on the counter: one line per medication counting
// down the days of pills left, most urgent first, sealed in wax whose colour
// gives the worst case at a glance — green wax means all is well, amber means
// order soon, red means act.
export function RememberNote({ medications, statuses, adherenceStatuses }: Props) {
  const entries: Entry[] = statuses
    .map((s) => {
      const med = medications.find((m) => m.id === s.medicationId);
      const daysUntilRunOut = s.daysUntilRefill + (med?.refillLeadTimeDays ?? 0);
      return {
        id: s.medicationId,
        name: med?.name ?? s.medicationId,
        urgency: refillUrgency(s.daysUntilRefill, daysUntilRunOut),
        daysLeft: Math.max(0, daysUntilRunOut),
        runOutDate: s.runOutDate,
        currentStreakDays:
          adherenceStatuses.find((a) => a.medicationId === s.medicationId)?.currentStreakDays ?? 0,
      };
    })
    .sort(
      (a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || a.daysLeft - b.daysLeft
    );

  const worst = entries[0]?.urgency ?? 'ok';

  return (
    <Parchment className="-rotate-1">
      <p className="text-center font-apothecary text-lg tracking-[0.25em]">REMEMBER</p>
      <div className="mx-auto mt-1 mb-3 w-24 border-b border-apothecary-parchment-edge" />
      <ul className="space-y-2.5">
        {entries.map((entry) => {
          const { text, className } = countdown(entry);
          const action = reminder(entry);
          return (
            <li key={entry.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-hand text-xl">{entry.name}</span>
                <span className={`font-hand text-xl ${className}`}>{text}</span>
              </div>
              {action && (
                <p className="font-hand text-base leading-tight text-apothecary-ink-faded">
                  {action}
                </p>
              )}
              <p className="font-hand text-base leading-tight text-apothecary-ink-faded">
                {streakLabel(entry.currentStreakDays)}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/25 ${sealColor[worst]}`}
          role="img"
          aria-label={`Wax seal: ${sealMeaning[worst]}`}
        >
          <div className="h-5 w-5 rounded-full border border-black/25" />
        </div>
      </div>
    </Parchment>
  );
}
