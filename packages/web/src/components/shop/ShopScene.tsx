import type { SkyPhase } from '@/lib/skyPhase';
import { apothecary } from '@/theme/apothecary';
import { Bottle } from './Bottle';
import { Creatures } from './Creatures';
import { FOLIAGE_ZONE_FRACTIONS, HangingFoliage } from './HangingFoliage';
import { SceneDecor } from './SceneDecor';
import { WindowView } from './WindowView';
import type { BottleData } from './bottleData';
import { sceneLayout, slotCenter } from './sceneLayout';

const { wood, glass, flame } = apothecary;

interface Props {
  bottles: BottleData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  compact?: boolean;
  evening?: boolean;
  phase: SkyPhase;
}

// The whole apothecary corner in one SVG: shelves of medicine bottles on the
// left, a sunlit garden window on the right, a table running across the
// bottom with the candle on it, and foliage trailing from the ceiling. The
// bottles are the interactive medications; everything else is scenery.
export function ShopScene({ bottles, selectedId, onSelect, onEdit, compact, evening, phase }: Props) {
  const layout = sceneLayout(bottles.length, compact ?? false);
  const { width, height, cabinet, interiorX, interiorW, shelfYs, tableY, candle } = layout;
  const candleFlameY = candle.y - 56;

  const label =
    bottles.length === 0
      ? 'An apothecary corner with an empty shelf, a sunlit window, and a table'
      : `An apothecary corner: a shelf of ${bottles.length} medicine ${bottles.length === 1 ? 'bottle' : 'bottles'}, a sunlit window, and a table`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        {/* Off-centre highlight so the glass reads as curved, not flat. */}
        <radialGradient id="shop-glass-gradient" cx="30%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="55%" stopColor={glass.DEFAULT} stopOpacity="0.16" />
          <stop offset="100%" stopColor={glass.DEFAULT} stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id="shop-cap-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4A433D" />
          <stop offset="100%" stopColor={glass.metal} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={tableY} fill={wood.wall} />

      <WindowView box={layout.windowBox} phase={phase} />

      <rect
        x={interiorX}
        y={cabinet.y}
        width={interiorW}
        height={cabinet.baseY - cabinet.y}
        fill={wood.panel}
      />
      {[1, 2].map((k) => (
        <line
          key={k}
          x1={interiorX + (interiorW * k) / 3}
          y1={cabinet.y}
          x2={interiorX + (interiorW * k) / 3}
          y2={cabinet.baseY}
          stroke={wood.grain}
          strokeWidth="2"
          aria-hidden="true"
        />
      ))}
      <rect x={cabinet.x} y={cabinet.y - 4} width={cabinet.w} height="12" fill={wood.frame} />
      <rect x={cabinet.x} y={cabinet.y - 4} width="12" height={cabinet.baseY - cabinet.y + 4} fill={wood.frame} />
      <rect x={cabinet.x + cabinet.w - 12} y={cabinet.y - 4} width="12" height={cabinet.baseY - cabinet.y + 4} fill={wood.frame} />
      {shelfYs.map((y) => (
        <g key={y} aria-hidden="true">
          <rect x={interiorX} y={y} width={interiorW} height="12" fill={wood.shelf} />
          <rect x={interiorX} y={y} width={interiorW} height="3" fill={wood['shelf-edge']} />
        </g>
      ))}
      {bottles.map((bottle, i) => {
        const { x, shelfY } = slotCenter(layout, i);
        return (
          <Bottle
            key={bottle.id}
            bottle={bottle}
            x={x}
            shelfY={shelfY}
            selected={selectedId === bottle.id}
            onSelect={() => onSelect(bottle.id)}
            onEdit={() => onEdit(bottle.id)}
          />
        );
      })}

      <rect x="0" y={tableY} width={width} height={height - tableY} fill={wood['counter-top']} />
      <rect x="0" y={tableY} width={width} height="3" fill={wood['shelf-edge']} />

      <SceneDecor layout={layout} bottleCount={bottles.length} />

      <g aria-hidden="true" className="candle">
        <ellipse cx={candle.x} cy={candle.y + 4} rx="17" ry="5" fill={glass.metal} />
        <rect x={candle.x - 7} y={candle.y - 42} width="14" height="44" rx="4" fill={glass.DEFAULT} />
        <line x1={candle.x} y1={candle.y - 42} x2={candle.x} y2={candle.y - 48} stroke={wood.wall} strokeWidth="1.5" />
        <g className="candle-flame">
          <ellipse cx={candle.x} cy={candleFlameY} rx="5" ry="10" fill={flame.DEFAULT} />
          <ellipse
            className="candle-flame-core"
            cx={candle.x}
            cy={candleFlameY + 3}
            rx="2.5"
            ry="5"
            fill={flame.core}
          />
        </g>
      </g>

      {evening && (
        <g aria-hidden="true" pointerEvents="none">
          <rect x="0" y="0" width={width} height={height} fill="#000000" fillOpacity="0.22" />
          <circle cx={candle.x} cy={candleFlameY} r="44" fill={flame.DEFAULT} fillOpacity="0.1" />
          <circle cx={candle.x} cy={candleFlameY} r="22" fill={flame.DEFAULT} fillOpacity="0.16" />
        </g>
      )}

      <HangingFoliage width={width} baseline={layout.foliageBaseline} />
      <Creatures
        zoneXs={FOLIAGE_ZONE_FRACTIONS.map((f) => width * f)}
        baseline={layout.foliageBaseline}
      />
    </svg>
  );
}
