import { apothecary } from '@/theme/apothecary';
import { slotCenter, totalSlots, type SceneLayout } from './sceneLayout';

const { glass } = apothecary;

// Contents for the decorative shelf jars — dried herbs, petals, seeds. Never
// the medication colours; these jars carry no name label, so they read as
// scenery, not medicine.
const HERB_FILLS = ['#7C8A45', '#D98E2B', '#9B7FB8', '#5C3040', '#C9A94E', '#6E8B54'];

interface Props {
  layout: SceneLayout;
  bottleCount: number;
}

// A small corked jar of herbs, standing at (cx, baseY). Deliberately squatter
// and label-less so it can't be mistaken for a medication bottle.
function HerbJar({ cx, baseY, fill }: { cx: number; baseY: number; fill: string }) {
  return (
    <g aria-hidden="true">
      <rect x={cx - 22} y={baseY - 56} width="44" height="56" rx="7" fill={glass.DEFAULT} fillOpacity="0.16" stroke={glass.DEFAULT} strokeOpacity="0.4" />
      <rect x={cx - 18} y={baseY - 46} width="36" height="42" rx="6" fill={fill} />
      <rect x={cx - 10} y={baseY - 64} width="20" height="10" rx="2" fill="#C9A86A" />
      <line x1={cx - 14} y1={baseY - 48} x2={cx - 14} y2={baseY - 8} stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

// A rounded jar of amber liquid on the table — honey, a tincture — with a soft
// glow, like the ones on the reference table.
function HoneyJar({ cx, baseY, scale = 1 }: { cx: number; baseY: number; scale?: number }) {
  const w = 50 * scale;
  const h = 66 * scale;
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={baseY - h * 0.45} r={w * 0.55} fill="#F2CE82" fillOpacity="0.18" />
      <rect x={cx - w / 2} y={baseY - h} width={w} height={h} rx={w * 0.28} fill={glass.DEFAULT} fillOpacity="0.2" stroke={glass.DEFAULT} strokeOpacity="0.5" />
      <rect x={cx - w / 2 + 4} y={baseY - h * 0.62} width={w - 8} height={h * 0.55} rx={w * 0.2} fill="#E0982C" />
      <rect x={cx - w * 0.3} y={baseY - h - 8} width={w * 0.6} height="10" rx="3" fill="#C9A86A" />
      <line x1={cx - w * 0.28} y1={baseY - h + 6} x2={cx - w * 0.28} y2={baseY - 8} stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

// A potted plant for the windowsill.
function PottedPlant({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g aria-hidden="true">
      <path d={`M${cx - 16} ${baseY - 22} L${cx + 16} ${baseY - 22} L${cx + 12} ${baseY} L${cx - 12} ${baseY} Z`} fill="#A65B38" />
      <rect x={cx - 17} y={baseY - 26} width="34" height="6" rx="2" fill="#B96A44" />
      <ellipse cx={cx - 9} cy={baseY - 34} rx="10" ry="7" fill="#5B7A4B" />
      <ellipse cx={cx + 9} cy={baseY - 33} rx="10" ry="7" fill="#6E8B54" />
      <ellipse cx={cx} cy={baseY - 44} rx="9" ry="8" fill="#46603B" />
      <circle cx={cx - 4} cy={baseY - 48} r="3" fill="#E8952F" />
    </g>
  );
}

// A little six-petal flower head, lying on the table — a proper flower shape
// (ring of petals rotated around a coloured centre) rather than an
// abstracted dot-and-stem sprig.
function Flower({
  cx,
  cy,
  petalFill,
  centerFill,
  size = 1,
}: {
  cx: number;
  cy: number;
  petalFill: string;
  centerFill: string;
  size?: number;
}) {
  const petalRx = 4.2 * size;
  const petalRy = 6.4 * size;
  const petalDist = 4.6 * size;
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g aria-hidden="true">
      {angles.map((angle) => (
        <ellipse
          key={angle}
          cx={cx}
          cy={cy - petalDist}
          rx={petalRx}
          ry={petalRy}
          fill={petalFill}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={2.8 * size} fill={centerFill} />
    </g>
  );
}

// Static scenery that fills the shop out like the reference: the shelves'
// spare slots hold herb jars, the table and windowsill carry amber jars, a
// potted plant, and scattered flowers. None of it is interactive.
export function SceneDecor({ layout, bottleCount }: Props) {
  const { windowBox, tableY, width } = layout;
  const free: number[] = [];
  for (let i = bottleCount; i < totalSlots(layout); i++) free.push(i);

  // The plant, both honey jars, and the herb jar all sit on the same table
  // line — mixing tableY and windowBox.sillY (only ~20px apart) used to put
  // the plant almost on top of the first jar. Spacing four items evenly
  // across the window's width keeps them clear of each other regardless of
  // how wide the window ends up being (desktop vs compact).
  const zoneLeft = windowBox.x + 20;
  const zoneWidth = windowBox.w - 40;
  const step = zoneWidth / 4;
  const slotX = (i: number) => zoneLeft + step * (i + 0.5);

  return (
    <g aria-hidden="true">
      {free.map((slot, i) => {
        const { x, shelfY } = slotCenter(layout, slot);
        return <HerbJar key={slot} cx={x} baseY={shelfY} fill={HERB_FILLS[i % HERB_FILLS.length] ?? HERB_FILLS[0]} />;
      })}

      <PottedPlant cx={slotX(0)} baseY={tableY} />
      <HoneyJar cx={slotX(1)} baseY={tableY} scale={0.85} />
      <HoneyJar cx={slotX(2)} baseY={tableY} scale={0.7} />
      <HerbJar cx={slotX(3)} baseY={tableY} fill="#D98E2B" />

      <Flower cx={width * 0.1} cy={tableY + 15} petalFill="#F0A6C4" centerFill="#F9C74F" size={0.9} />
      <Flower cx={width * 0.22} cy={tableY + 20} petalFill="#C9A0DC" centerFill="#F9C74F" size={0.75} />
      <Flower cx={width * 0.34} cy={tableY + 13} petalFill="#F0A6C4" centerFill="#F9C74F" size={0.8} />
    </g>
  );
}
