import { apothecary } from '@/theme/apothecary';
import { Bottle } from './Bottle';
import type { BottleData } from './bottleData';

const { wood, glass, flame } = apothecary;

// Shelf-board top edges, where bottles stand.
const SHELF_YS = [158, 306];
// The cabinet interior the bottles are spread across.
const INTERIOR_X = 44;
const INTERIOR_WIDTH = 592;

interface Props {
  bottles: BottleData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}

// The apothecary cabinet: dark panelled wall, wooden frame, two shelf boards
// stocked with one bottle per medication, and the counter top running along
// the bottom. Drawn as SVG so it scales to any width and the bottles can
// become interactive elements in a later MR.
export function ShelfUnit({ bottles, selectedId, onSelect, onEdit }: Props) {
  // Up to four bottles sit together on the top shelf; beyond that the two
  // shelves split evenly (top gets the odd one). Beyond ~8 bottles a shelf
  // they start to touch — plenty for a personal app.
  const perShelf = Math.max(4, Math.ceil(bottles.length / 2));
  const rows = [bottles.slice(0, perShelf), bottles.slice(perShelf)];
  const label =
    bottles.length === 0
      ? 'An empty apothecary cabinet with two shelves, waiting to be stocked'
      : `An apothecary cabinet stocked with ${bottles.length} medicine ${bottles.length === 1 ? 'bottle' : 'bottles'}`;

  return (
    <svg width="100%" viewBox="0 0 680 390" role="img" aria-label={label}>
      <rect x="0" y="0" width="680" height="370" fill={wood.wall} />
      <rect x="44" y="30" width="592" height="340" fill={wood.panel} />
      {[192, 340, 488].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="370" stroke={wood.grain} strokeWidth="2" />
      ))}
      <rect x="30" y="16" width="620" height="14" fill={wood.frame} />
      <rect x="30" y="16" width="14" height="354" fill={wood.frame} />
      <rect x="636" y="16" width="14" height="354" fill={wood.frame} />
      {SHELF_YS.map((y) => (
        <g key={y}>
          <rect x={INTERIOR_X} y={y} width={INTERIOR_WIDTH} height="12" fill={wood.shelf} />
          <rect x={INTERIOR_X} y={y} width={INTERIOR_WIDTH} height="3" fill={wood['shelf-edge']} />
        </g>
      ))}
      {rows.map((row, shelfIndex) =>
        row.map((bottle, i) => {
          const slotWidth = INTERIOR_WIDTH / row.length;
          return (
            <Bottle
              key={bottle.id}
              bottle={bottle}
              x={Math.round(INTERIOR_X + slotWidth * (i + 0.5))}
              shelfY={SHELF_YS[shelfIndex] ?? 158}
              selected={selectedId === bottle.id}
              onSelect={() => onSelect(bottle.id)}
              onEdit={() => onEdit(bottle.id)}
            />
          );
        })
      )}
      <rect x="0" y="370" width="680" height="20" fill={wood['counter-top']} />
      <rect x="0" y="370" width="680" height="3" fill={wood['shelf-edge']} />
      <g aria-hidden="true">
        <ellipse cx="600" cy="372" rx="17" ry="5" fill={glass.metal} />
        <rect x="593" y="326" width="14" height="44" rx="4" fill={glass.DEFAULT} />
        <line x1="600" y1="326" x2="600" y2="320" stroke={wood.wall} strokeWidth="1.5" />
        <ellipse cx="600" cy="312" rx="5" ry="10" fill={flame.DEFAULT} />
        <ellipse cx="600" cy="315" rx="2.5" ry="5" fill={flame.core} />
      </g>
    </svg>
  );
}
