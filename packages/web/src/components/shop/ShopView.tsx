import { useState } from 'react';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import { DueTodayPaper } from './DueTodayPaper';
import { EditBottleModal } from './EditBottleModal';
import { Parchment } from './Parchment';
import { RememberNote } from './RememberNote';
import { ShelfUnit } from './ShelfUnit';
import { toBottles } from './bottleData';

interface Props {
  medications: Medication[];
  refillStatuses: RefillStatus[];
  doses: Dose[];
  onDoseTaken: (medicationId: string, scheduledFor: string) => void;
  onDoseUntaken: (medicationId: string, scheduledFor: string) => void;
  onMedicationUpdated: () => void;
  onSwitchToClassic: () => void;
}

// The apothecary shop dashboard. The cabinet is stocked with one bottle per
// medication; double-clicking (or double-tapping) a bottle opens its edit
// form on parchment. Later MRs lay the REMEMBER note (MR 4) and due-today
// paper (MR 5) on the counter.
export function ShopView({
  medications,
  refillStatuses,
  doses,
  onDoseTaken,
  onDoseUntaken,
  onMedicationUpdated,
  onSwitchToClassic,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const bottles = toBottles(medications, refillStatuses);

  // A pill pops out of the medication's bottle, arcs down, and lands on the
  // due-today paper beside the name that was just ticked. Returns whether the
  // flight actually started, so the paper knows to hold the landed pill back.
  function flyPill(medicationId: string, nameEl: HTMLElement): boolean {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const bottleEl = document.querySelector(`[data-bottle-id="${CSS.escape(medicationId)}"]`);
    if (!bottleEl) return false;

    const color = bottles.find((b) => b.id === medicationId)?.color ?? '#7B6BA8';
    const from = bottleEl.getBoundingClientRect();
    const to = nameEl.getBoundingClientRect();
    // Launch from the bottle's neck; land just to the right of the name.
    const x0 = from.left + from.width / 2 - 6;
    const y0 = from.top + from.height * 0.15;
    const x1 = to.right + 8;
    const y1 = to.top + to.height / 2 - 6;

    const pill = document.createElement('div');
    pill.setAttribute('aria-hidden', 'true');
    pill.style.cssText =
      'position:fixed;left:0;top:0;width:12px;height:12px;border-radius:9999px;' +
      `z-index:60;pointer-events:none;background:${color};border:1px solid rgba(0,0,0,0.25)`;
    document.body.appendChild(pill);

    const hop = 36;
    const animation = pill.animate(
      [
        { transform: `translate(${x0}px, ${y0}px)`, easing: 'ease-out' },
        { transform: `translate(${x0 + (x1 - x0) * 0.3}px, ${y0 - hop}px)`, offset: 0.3, easing: 'ease-in' },
        { transform: `translate(${x1}px, ${y1}px)`, offset: 0.75, easing: 'ease-out' },
        { transform: `translate(${x1}px, ${y1 - 10}px)`, offset: 0.88, easing: 'ease-in' },
        { transform: `translate(${x1}px, ${y1}px)` },
      ],
      { duration: 700 }
    );
    animation.onfinish = () => pill.remove();
    // Belt and braces — never leave a stray pill on the page.
    setTimeout(() => pill.remove(), 1500);
    return true;
  }
  const selected = bottles.find((b) => b.id === selectedId);
  const editing = medications.find((m) => m.id === editingId);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-apothecary-wood-wall">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="font-apothecary text-3xl text-apothecary-parchment-light">
              The apothecary
            </h1>
            <p className="font-hand text-xl text-apothecary-parchment-edge">{today}</p>
          </div>
          <button
            onClick={onSwitchToClassic}
            className="font-hand text-lg text-apothecary-parchment-edge underline hover:text-apothecary-parchment-light"
          >
            classic view
          </button>
        </header>

        <div>
          <ShelfUnit
            bottles={bottles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(id) => setEditingId(id)}
          />
          <p className="mt-1 min-h-[1.75rem] text-center font-hand text-lg text-apothecary-parchment-edge">
            {selected ? (
              <button
                onClick={() => setEditingId(selected.id)}
                className="underline decoration-dotted underline-offset-4 hover:text-apothecary-parchment-light"
              >
                {selected.name} — {selected.pillsRemaining}{' '}
                {selected.pillsRemaining === 1 ? 'pill' : 'pills'} left · edit
              </button>
            ) : bottles.length > 0 ? (
              'double-tap a bottle to edit it'
            ) : null}
          </p>
        </div>

        <div className="rounded-sm bg-apothecary-wood-counter p-5 sm:p-8">
          {bottles.length === 0 ? (
            <Parchment className="text-center">
              <p className="font-apothecary text-lg tracking-widest">THE SHELVES ARE BARE</p>
              <p className="font-hand text-xl text-apothecary-ink-faded mt-1">
                Add your first medication in classic view and a bottle will appear.
              </p>
            </Parchment>
          ) : (
            <div className="grid items-start gap-5 sm:grid-cols-2">
              <DueTodayPaper
                doses={doses}
                medications={medications}
                onTaken={onDoseTaken}
                onUntaken={onDoseUntaken}
                onPillTaken={flyPill}
              />
              <RememberNote medications={medications} statuses={refillStatuses} />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditBottleModal
          medication={editing}
          pillsRemaining={bottles.find((b) => b.id === editing.id)?.pillsRemaining ?? 0}
          onSaved={() => {
            setEditingId(null);
            onMedicationUpdated();
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
