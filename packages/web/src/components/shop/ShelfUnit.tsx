import { apothecary } from '@/theme/apothecary';
import { Bottle } from './Bottle';
import type { BottleData } from './bottleData';

const { wood, glass, flame } = apothecary;

interface Props {
  bottles: BottleData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  // Narrow-screen geometry: a slimmer cabinet with fewer bottles per shelf,
  // so labels stay legible instead of scaling down with the viewBox.
  compact?: boolean;
  // After dusk the shop dims and the candle throws a warm glow.
  evening?: boolean;
}

const SHELF_TOP = 158;
const SHELF_SPACING = 148;

// The apothecary cabinet: dark panelled wall, wooden frame, as many shelf
// boards as the stock needs, and the counter top running along the bottom.
// Drawn as SVG so it scales to any width; geometry is parameterised so the
// phone gets a slim tall cabinet and wide screens get the full dresser.
export function ShelfUnit({ bottles, selectedId, onSelect, onEdit, compact, evening }: Props) {
  const width = compact ? 360 : 680;
  const interiorX = compact ? 24 : 44;
  const interiorWidth = width - interiorX * 2;
  const perShelf = compact ? 3 : 4;

  // Chunk the bottles into shelves of perShelf; always show at least two
  // boards so the cabinet looks like furniture even when barely stocked.
  const rows: BottleData[][] = [];
  for (let i = 0; i < bottles.length; i += perShelf) {
    rows.push(bottles.slice(i, i + perShelf));
  }
  const shelfCount = Math.max(2, rows.length);
  const shelfYs = Array.from({ length: shelfCount }, (_, i) => SHELF_TOP + i * SHELF_SPACING);
  const counterY = (shelfYs[shelfCount - 1] ?? SHELF_TOP) + 62;
  const height = counterY + 22;

  const candleX = interiorX + interiorWidth - 36;

  const label =
    bottles.length === 0
      ? 'An empty apothecary cabinet, waiting to be stocked'
      : `An apothecary cabinet stocked with ${bottles.length} medicine ${bottles.length === 1 ? 'bottle' : 'bottles'}`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <rect x="0" y="0" width={width} height={counterY} fill={wood.wall} />
      <rect x={interiorX} y="30" width={interiorWidth} height={counterY - 30} fill={wood.panel} />
      {[1, 2].map((k) => (
        <line
          key={k}
          x1={interiorX + (interiorWidth * k) / 3}
          y1="30"
          x2={interiorX + (interiorWidth * k) / 3}
          y2={counterY}
          stroke={wood.grain}
          strokeWidth="2"
        />
      ))}
      <rect x={interiorX - 14} y="16" width={interiorWidth + 28} height="14" fill={wood.frame} />
      <rect x={interiorX - 14} y="16" width="14" height={counterY - 16} fill={wood.frame} />
      <rect x={interiorX + interiorWidth} y="16" width="14" height={counterY - 16} fill={wood.frame} />
      {shelfYs.map((y) => (
        <g key={y}>
          <rect x={interiorX} y={y} width={interiorWidth} height="12" fill={wood.shelf} />
          <rect x={interiorX} y={y} width={interiorWidth} height="3" fill={wood['shelf-edge']} />
        </g>
      ))}
      {rows.map((row, shelfIndex) =>
        row.map((bottle, i) => {
          const slotWidth = interiorWidth / row.length;
          return (
            <Bottle
              key={bottle.id}
              bottle={bottle}
              x={Math.round(interiorX + slotWidth * (i + 0.5))}
              shelfY={shelfYs[shelfIndex] ?? SHELF_TOP}
              selected={selectedId === bottle.id}
              onSelect={() => onSelect(bottle.id)}
              onEdit={() => onEdit(bottle.id)}
            />
          );
        })
      )}
      <rect x="0" y={counterY} width={width} height="20" fill={wood['counter-top']} />
      <rect x="0" y={counterY} width={width} height="3" fill={wood['shelf-edge']} />
      <g aria-hidden="true" className="candle">
        <ellipse cx={candleX} cy={counterY + 4} rx="17" ry="5" fill={glass.metal} />
        <rect x={candleX - 7} y={counterY - 42} width="14" height="44" rx="4" fill={glass.DEFAULT} />
        <line
          x1={candleX}
          y1={counterY - 42}
          x2={candleX}
          y2={counterY - 48}
          stroke={wood.wall}
          strokeWidth="1.5"
        />
        <g className="candle-flame">
          <ellipse cx={candleX} cy={counterY - 56} rx="5" ry="10" fill={flame.DEFAULT} />
          <ellipse cx={candleX} cy={counterY - 53} rx="2.5" ry="5" fill={flame.core} />
        </g>
      </g>
      {evening && (
        <g aria-hidden="true" pointerEvents="none">
          <rect x="0" y="0" width={width} height={height} fill="#000000" fillOpacity="0.22" />
          <circle cx={candleX} cy={counterY - 56} r="44" fill={flame.DEFAULT} fillOpacity="0.1" />
          <circle cx={candleX} cy={counterY - 56} r="22" fill={flame.DEFAULT} fillOpacity="0.16" />
        </g>
      )}
    </svg>
  );
}
