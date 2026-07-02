import { useState } from 'react';
import type { Dose, Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { localHHMM } from '@/lib/time';
import { apothecary } from '@/theme/apothecary';
import { Parchment } from './Parchment';

const { ink } = apothecary;

interface Props {
  doses: Dose[];
  medications: Medication[];
  onTaken: (medicationId: string, scheduledFor: string) => void;
  onUntaken: (medicationId: string, scheduledFor: string) => void;
}

// A hand-drawn tick box: parchment-cream fill, ink border, and a quill-ink
// check that draws itself in when ticked.
function InkCheckbox({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
        fill="#FDF9EE"
        stroke={ink.DEFAULT}
        strokeWidth="1.5"
      />
      {checked && (
        <path
          d="M4 10 L8.5 15 L16 4"
          fill="none"
          stroke={ink.quill}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ink-draw"
        />
      )}
    </svg>
  );
}

// The due-today sheet on the counter: today's doses as a handwritten
// checklist. Ticking goes through the same markTaken/markUntaken flow as
// classic view — early ticks allowed, "upcoming" is just a hint.
export function DueTodayPaper({ doses, medications, onTaken, onUntaken }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function handleToggle(dose: Dose) {
    setPending((s) => new Set(s).add(dose.scheduledFor));
    try {
      if (dose.takenAt === null) {
        await api.markTaken(dose.medicationId, dose.scheduledFor);
        onTaken(dose.medicationId, dose.scheduledFor);
      } else {
        await api.markUntaken(dose.medicationId, dose.scheduledFor);
        onUntaken(dose.medicationId, dose.scheduledFor);
      }
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(dose.scheduledFor);
        return next;
      });
    }
  }

  const now = new Date().toISOString();

  return (
    <Parchment tone="paper" className="rotate-1">
      <p className="text-center font-apothecary text-lg italic">Due today</p>
      <div className="mx-auto mt-1 mb-3 w-16 border-b border-apothecary-parchment-edge" />
      {doses.length === 0 ? (
        <p className="text-center font-hand text-lg text-apothecary-ink-faded">
          No doses today — the shop is quiet.
        </p>
      ) : (
        <ul>
          {[...doses]
            .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
            .map((dose) => {
              const med = medications.find((m) => m.id === dose.medicationId);
              const name = med?.name ?? dose.medicationId;
              const isTaken = dose.takenAt !== null;
              const isBusy = pending.has(dose.scheduledFor);
              const isUpcoming = !isTaken && dose.scheduledFor > now;

              return (
                <li
                  key={`${dose.medicationId}-${dose.scheduledFor}`}
                  className="border-b border-apothecary-parchment-line last:border-b-0"
                >
                  <button
                    role="checkbox"
                    aria-checked={isTaken}
                    aria-label={`Mark ${name} ${isTaken ? 'not taken' : 'taken'}`}
                    disabled={isBusy}
                    onClick={() => void handleToggle(dose)}
                    className="flex w-full items-center gap-3 py-2 text-left disabled:opacity-50"
                  >
                    <InkCheckbox checked={isTaken} />
                    <span className={`relative font-hand text-xl ${isTaken ? 'opacity-60' : ''}`}>
                      {name}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-[1.5px] bg-apothecary-ink-quill transition-all duration-300"
                        style={{ width: isTaken ? '100%' : '0%' }}
                      />
                    </span>
                    <span
                      className={`ml-auto font-hand text-lg ${
                        isUpcoming ? 'text-apothecary-ink-faded/70' : 'text-apothecary-ink-faded'
                      }`}
                    >
                      {localHHMM(dose.scheduledFor)}
                      {isUpcoming ? ' · upcoming' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </Parchment>
  );
}
