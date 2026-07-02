import { useRef, useState } from 'react';
import type { Dose, Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { doseKey } from '@/lib/doses';
import { localHHMM } from '@/lib/time';
import { apothecary } from '@/theme/apothecary';
import { Parchment } from './Parchment';
import { contentColorFor } from './bottleData';

const { ink } = apothecary;

interface Props {
  doses: Dose[];
  medications: Medication[];
  onTaken: (medicationId: string, scheduledFor: string) => void;
  onUntaken: (medicationId: string, scheduledFor: string) => void;
  // Fired when a dose is ticked, with the name element the pill should land
  // beside. Returns true if a flight animation actually started, so the
  // landed pill can be held back until it arrives.
  onPillTaken?: (medicationId: string, nameEl: HTMLElement) => boolean;
  // After dusk, upcoming doses shimmer with candlelight.
  evening?: boolean;
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
export function DueTodayPaper({
  doses,
  medications,
  onTaken,
  onUntaken,
  onPillTaken,
  evening,
}: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  // Doses whose pill is still mid-flight — the landed pill waits for it.
  const [landing, setLanding] = useState<Set<string>>(new Set());
  const nameRefs = useRef(new Map<string, HTMLSpanElement>());

  async function handleToggle(dose: Dose) {
    // Keyed by medication AND time — several medications can share a
    // scheduled time, and per-dose state must not bleed across them.
    const key = doseKey(dose);
    setPending((s) => new Set(s).add(key));
    try {
      if (dose.takenAt === null) {
        const nameEl = nameRefs.current.get(key);
        if (onPillTaken && nameEl && onPillTaken(dose.medicationId, nameEl)) {
          setLanding((s) => new Set(s).add(key));
          setTimeout(() => {
            setLanding((s) => {
              const next = new Set(s);
              next.delete(key);
              return next;
            });
          }, 700);
        }
        await api.markTaken(dose.medicationId, dose.scheduledFor);
        onTaken(dose.medicationId, dose.scheduledFor);
      } else {
        await api.markUntaken(dose.medicationId, dose.scheduledFor);
        onUntaken(dose.medicationId, dose.scheduledFor);
      }
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }

  const now = new Date().toISOString();
  // Every dose ticked and none still landing — the day is dispensed.
  const allDone = doses.length > 0 && doses.every((d) => d.takenAt !== null) && landing.size === 0;

  return (
    <Parchment tone="paper" className="relative rotate-1">
      {allDone && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            role="img"
            aria-label="All of today's doses are taken"
            className="stamp-thunk rounded border-4 border-apothecary-wax-red/60 px-3 py-1 font-apothecary text-3xl tracking-[0.2em] text-apothecary-wax-red/60"
          >
            DISPENSED
          </span>
        </div>
      )}
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
              const key = doseKey(dose);
              const med = medications.find((m) => m.id === dose.medicationId);
              const name = med?.name ?? dose.medicationId;
              const isTaken = dose.takenAt !== null;
              const isBusy = pending.has(key);
              const isUpcoming = !isTaken && dose.scheduledFor > now;
              // The pill lying on the paper once it has dropped in.
              const showLandedPill = isTaken && !landing.has(key);

              return (
                <li key={key} className="border-b border-apothecary-parchment-line last:border-b-0">
                  <button
                    role="checkbox"
                    aria-checked={isTaken}
                    aria-label={`Mark ${name} ${isTaken ? 'not taken' : 'taken'}`}
                    disabled={isBusy}
                    onClick={() => void handleToggle(dose)}
                    className="flex w-full items-center gap-3 py-2 text-left disabled:opacity-50"
                  >
                    <InkCheckbox checked={isTaken} />
                    <span
                      ref={(el) => {
                        if (el) nameRefs.current.set(key, el);
                        else nameRefs.current.delete(key);
                      }}
                      className={`relative font-hand text-xl ${isTaken ? 'opacity-60' : ''}`}
                    >
                      {name}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-[1.5px] bg-apothecary-ink-quill transition-all duration-300"
                        style={{ width: isTaken ? '100%' : '0%' }}
                      />
                    </span>
                    {showLandedPill && (
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          background: contentColorFor(name),
                          border: '1px solid rgba(0, 0, 0, 0.25)',
                        }}
                      />
                    )}
                    <span
                      className={`ml-auto font-hand text-lg ${
                        isUpcoming ? 'text-apothecary-ink-faded/70' : 'text-apothecary-ink-faded'
                      } ${isUpcoming && evening ? '[text-shadow:0_0_10px_rgba(232,163,61,0.9)]' : ''}`}
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
