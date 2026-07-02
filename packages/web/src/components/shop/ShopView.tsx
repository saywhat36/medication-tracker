import { useState } from 'react';
import type { Medication, RefillStatus } from '@medication-tracker/core';
import { EditBottleModal } from './EditBottleModal';
import { Parchment } from './Parchment';
import { RememberNote } from './RememberNote';
import { ShelfUnit } from './ShelfUnit';
import { toBottles } from './bottleData';

interface Props {
  medications: Medication[];
  refillStatuses: RefillStatus[];
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
  onMedicationUpdated,
  onSwitchToClassic,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const bottles = toBottles(medications, refillStatuses);
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
            <RememberNote medications={medications} statuses={refillStatuses} />
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
