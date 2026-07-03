import { skyPalettes, type SkyPhase } from '@/lib/skyPhase';
import { apothecary } from '@/theme/apothecary';

const { wood } = apothecary;

interface Props {
  box: { x: number; y: number; w: number; h: number; sillY: number };
  phase: SkyPhase;
}

// Deterministic star field (fractions of the window's upper sky), so the
// stars don't twinkle to new spots on every render.
const STARS = [
  [0.16, 0.14],
  [0.34, 0.22],
  [0.48, 0.1],
  [0.62, 0.28],
  [0.82, 0.16],
  [0.9, 0.36],
  [0.24, 0.4],
  [0.56, 0.44],
] as const;

// The window on the right wall, looking onto a garden that changes with the
// time of day: a bright blue day, a peach dawn, a golden dusk, and a starry
// moonlit night. A four-pane sash with a wooden frame and sill.
export function WindowView({ box, phase }: Props) {
  const { x, y, w, h } = box;
  const p = skyPalettes[phase];
  const clipId = `win-clip-${Math.round(x)}-${Math.round(y)}`;
  const midX = x + w / 2;
  const midY = y + h / 2;
  const body = p.body;

  return (
    <g aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx="6" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={w} height={h} fill={p.skyTop} />
        <rect x={x} y={y + h * 0.42} width={w} height={h * 0.58} fill={p.skyBottom} />
        {p.stars &&
          STARS.map(([sx, sy], i) => (
            <circle key={i} cx={x + w * sx} cy={y + h * sy} r={i % 3 === 0 ? 1.6 : 1} fill="#EFEAD2" />
          ))}
        <circle cx={x + w * body.xf} cy={y + h * body.yf} r={body.r + 8} fill={body.halo} fillOpacity="0.4" />
        <circle cx={x + w * body.xf} cy={y + h * body.yf} r={body.r} fill={body.halo} />
        <circle cx={x + w * body.xf} cy={y + h * body.yf} r={body.r - 8} fill={body.core} />
        <rect x={x} y={y + h * 0.6} width={w} height={h * 0.4} fill={p.ground} />
        <ellipse cx={x + w * 0.2} cy={y + h * 0.62} rx="52" ry="34" fill={p.gardenFront} />
        <ellipse cx={x + w * 0.68} cy={y + h * 0.66} rx="64" ry="40" fill={p.gardenBack} />
        <ellipse cx={x + w * 0.95} cy={y + h * 0.6} rx="46" ry="32" fill={p.gardenFront} />
        {p.flowers && (
          <>
            <circle cx={x + w * 0.32} cy={y + h * 0.56} r="4" fill="#E8952F" />
            <circle cx={x + w * 0.5} cy={y + h * 0.62} r="4" fill="#E8952F" />
            <circle cx={x + w * 0.78} cy={y + h * 0.54} r="4" fill="#C58ABF" />
          </>
        )}
      </g>

      <rect x={x} y={y} width={w} height={h} rx="6" fill="none" stroke={wood.frame} strokeWidth="10" />
      <rect x={midX - 4} y={y} width="8" height={h} fill={wood.frame} />
      <rect x={x} y={midY - 4} width={w} height="8" fill={wood.frame} />

      <rect x={x - 12} y={box.sillY - 4} width={w + 24} height="12" rx="2" fill={wood.shelf} />
      <rect x={x - 12} y={box.sillY - 4} width={w + 24} height="3" fill={wood['shelf-edge']} />
    </g>
  );
}
