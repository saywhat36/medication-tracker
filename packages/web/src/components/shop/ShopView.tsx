import type { Medication, RefillStatus } from '@medication-tracker/core';
import { Parchment } from './Parchment';
import { ShelfUnit } from './ShelfUnit';
import { toBottles } from './bottleData';

interface Props {
  medications: Medication[];
  refillStatuses: RefillStatus[];
  onSwitchToClassic: () => void;
}

// The apothecary shop dashboard. The cabinet is stocked with one bottle per
// medication; later MRs make the bottles editable (MR 3) and lay the REMEMBER
// note (MR 4) and due-today paper (MR 5) on the counter.
export function ShopView({ medications, refillStatuses, onSwitchToClassic }: Props) {
  const bottles = toBottles(medications, refillStatuses);
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

        <ShelfUnit bottles={bottles} />

        <div className="rounded-sm bg-apothecary-wood-counter p-5 sm:p-8">
          <Parchment className="text-center">
            {bottles.length === 0 ? (
              <>
                <p className="font-apothecary text-lg tracking-widest">THE SHELVES ARE BARE</p>
                <p className="font-hand text-xl text-apothecary-ink-faded mt-1">
                  Add your first medication in classic view and a bottle will appear.
                </p>
              </>
            ) : (
              <p className="font-hand text-xl text-apothecary-ink-faded">
                The shopkeeper&apos;s papers arrive with the next updates.
              </p>
            )}
          </Parchment>
        </div>
      </div>
    </div>
  );
}
