import { apothecary } from '@/theme/apothecary';
import type { BottleData } from './bottleData';

const { glass, ink, parchment, wood, flame } = apothecary;

interface Props {
  bottle: BottleData;
  // Where the bottle stands: horizontal centre and the shelf-board top it
  // sits on, in ShopScene's coordinate space.
  x: number;
  shelfY: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

// How the pills sit in the jar: rows of five and four alternating, stacked
// from the bottom, up to the bottle's shoulders. Beyond 32 the jar simply
// looks full — like a real bottle, you can't see past the front layer.
const PILL_RADIUS = 5;
// Exported so the pill customization panel knows how many jar positions are
// actually visible/editable — customizing beyond this would never render.
export const MAX_VISIBLE_PILLS = 32;

function pillPositions(count: number): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = [];
  let row = 0;
  while (positions.length < Math.min(count, MAX_VISIBLE_PILLS)) {
    const cols = row % 2 === 0 ? [-24, -12, 0, 12, 24] : [-18, -6, 6, 18];
    const cy = -10 - row * 10.5;
    for (const cx of cols) {
      if (positions.length >= Math.min(count, MAX_VISIBLE_PILLS)) break;
      positions.push({ cx, cy });
    }
    row += 1;
  }
  return positions;
}

// One glass bottle with a metal cap, a parchment label, and the actual pills
// stacked inside — the jar empties pill by pill as doses are taken. Drawn in
// local coordinates (centre x = 0, base y = 0) and translated into place, so
// ShopScene can lay bottles out freely.
//
// Interactions: click/tap or focus picks the bottle up off the shelf;
// double-click, double-tap, or Enter/Space opens the edit form.
export function Bottle({ bottle, x, shelfY, selected, onSelect, onEdit }: Props) {
  const pillWord = bottle.pillsRemaining === 1 ? 'pill' : 'pills';
  // An empty bottle has tipped onto its side — much harder to ignore than a
  // badge. Rotated about its base, then nudged so it rests on the shelf.
  const empty = bottle.pillsRemaining <= 0;
  const lift = selected ? 8 : 0;
  const transform = empty
    ? `translate(${x + 58}px, ${shelfY - 38 - lift}px) rotate(-90deg)`
    : `translate(${x}px, ${shelfY - lift}px)`;

  return (
    <g
      data-bottle-id={bottle.id}
      role="button"
      tabIndex={0}
      aria-label={`${bottle.name}, ${bottle.pillsRemaining} ${pillWord} left — press Enter to edit`}
      className="cursor-pointer focus:outline-none"
      // CSS transform (not the SVG attribute) so the lift animates, and
      // touch-action so a double-tap edits instead of zooming on mobile.
      style={{
        transform,
        transition: 'transform 300ms ease-out',
        touchAction: 'manipulation',
      }}
      onClick={onSelect}
      onDoubleClick={onEdit}
      onFocus={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      <title>{`${bottle.name} — ${bottle.pillsRemaining} ${pillWord} left`}</title>
      {selected && (
        <rect
          x="-38"
          y="-117"
          width="76"
          height="121"
          rx="10"
          fill="none"
          stroke={flame.core}
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
      )}
      {pillPositions(bottle.pillsRemaining).map(({ cx, cy }, i) => {
        const custom = bottle.pillCustomizations?.[i];
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={PILL_RADIUS}
              fill={custom?.customColor ?? bottle.color}
              stroke="#000000"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
            {/* Small offset highlight so each pill reads as a rounded bead, not a flat disc. */}
            <circle cx={cx - 1.4} cy={cy - 1.4} r={PILL_RADIUS * 0.35} fill="#FFFFFF" fillOpacity="0.35" />
            {custom?.drawingData && (
              <image
                href={custom.drawingData}
                x={cx - PILL_RADIUS}
                y={cy - PILL_RADIUS}
                width={PILL_RADIUS * 2}
                height={PILL_RADIUS * 2}
                style={{ clipPath: 'circle(50%)' }}
              />
            )}
            {custom?.emoji && (
              <text x={cx} y={cy + 2.5} textAnchor="middle" fontSize="7">
                {custom.emoji}
              </text>
            )}
          </g>
        );
      })}
      <rect
        x="-34"
        y="-86"
        width="68"
        height="86"
        rx="8"
        fill="url(#shop-glass-gradient)"
        stroke={glass.DEFAULT}
        strokeOpacity="0.45"
      />
      <rect
        x="-13"
        y="-101"
        width="26"
        height="15"
        fill={glass.DEFAULT}
        fillOpacity="0.2"
        stroke={glass.DEFAULT}
        strokeOpacity="0.4"
      />
      {/* Cap: knurled band under a slightly domed top for a screw-cap silhouette. */}
      <rect x="-17" y="-113" width="34" height="13" rx="3" fill="url(#shop-cap-gradient)" />
      <path
        d="M-14 -113 L-14 -108 M-8 -113 L-8 -108 M-2 -113 L-2 -108 M4 -113 L4 -108 M10 -113 L10 -108"
        stroke="#000000"
        strokeOpacity="0.2"
        strokeWidth="1"
      />
      <ellipse cx="0" cy="-113" rx="17" ry="3.5" fill={glass.metal} />
      <ellipse cx="0" cy="-114" rx="17" ry="2.5" fill="#FFFFFF" fillOpacity="0.15" />
      <circle cx="0" cy="-117" r="4" fill={glass.metal} />
      {/* Glass shine: a soft diagonal streak, distinct from the per-pill highlight above. */}
      <ellipse
        cx="-22"
        cy="-68"
        rx="6"
        ry="20"
        fill="#FFFFFF"
        fillOpacity="0.16"
        transform="rotate(-8 -22 -68)"
      />
      <line
        x1="-24"
        y1="-78"
        x2="-24"
        y2="-12"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="-31" y="-62" width="62" height="26" fill={parchment.light} stroke={wood.frame} />
      <text
        y="-45"
        textAnchor="middle"
        fontSize="11"
        fill={ink.DEFAULT}
        className="font-apothecary"
        {...(bottle.name.length > 9
          ? { textLength: 56, lengthAdjust: 'spacingAndGlyphs' as const }
          : {})}
      >
        {bottle.name}
      </text>
    </g>
  );
}
