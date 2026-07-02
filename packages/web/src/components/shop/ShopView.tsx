import { Parchment } from './Parchment';
import { ShelfUnit } from './ShelfUnit';

interface Props {
  onSwitchToClassic: () => void;
}

// The apothecary shop dashboard. This MR lays the scene — wall, cabinet,
// counter, papers area — and later MRs stock it: bottles (MR 2), bottle
// editing (MR 3), the REMEMBER note (MR 4), and the due-today paper (MR 5).
export function ShopView({ onSwitchToClassic }: Props) {
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

        <ShelfUnit />

        <div className="rounded-sm bg-apothecary-wood-counter p-5 sm:p-8">
          <Parchment className="text-center">
            <p className="font-apothecary text-lg tracking-widest">OPENING SOON</p>
            <p className="font-hand text-xl text-apothecary-ink-faded mt-1">
              The shelves are being stocked — your bottles arrive in the next update.
            </p>
          </Parchment>
        </div>
      </div>
    </div>
  );
}
