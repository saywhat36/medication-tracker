interface Props {
  width: number;
  baseline: number;
}

// The five clumps of the back foliage row, as fractions of scene width.
// Exported so Creatures.tsx can spawn its easter eggs from the same spots.
export const FOLIAGE_ZONE_FRACTIONS = [0.08, 0.3, 0.52, 0.74, 0.96] as const;

// Leafy greenery hanging from the ceiling across the top of the scene. Built
// in layers for depth — a dark back row, a lighter front row, a scalloped
// leafy underside, and a few strands trailing down with flower or berry tips.
// Deterministic from the width so it doesn't reshuffle between renders.
export function HangingFoliage({ width, baseline }: Props) {
  // Back row: large, dark, sitting high.
  const back = FOLIAGE_ZONE_FRACTIONS.map((f) => ({ cx: width * f }));
  // Front row: medium, lighter, offset to break the silhouette.
  const front = [0.0, 0.19, 0.4, 0.62, 0.85, 1.0].map((f) => ({ cx: width * f }));
  // Scalloped leafy underside so the bottom edge isn't a straight line.
  const scallops = Array.from({ length: Math.ceil(width / 34) }, (_, i) => ({
    cx: 8 + i * 34,
    fill: i % 2 === 0 ? '#5B7A4B' : '#46603B',
  }));
  const strands = [
    { x: width * 0.13, len: 52, tip: '#E8952F' },
    { x: width * 0.31, len: 72, tip: '#C58ABF' },
    { x: width * 0.46, len: 44, tip: '#E8952F' },
    { x: width * 0.64, len: 64, tip: '#F2CE82' },
    { x: width * 0.83, len: 50, tip: '#C58ABF' },
  ];

  return (
    <g aria-hidden="true">
      {back.map((c, i) => (
        <ellipse key={`b${i}`} cx={c.cx} cy={baseline - 46} rx="66" ry="30" fill="#3E5535" />
      ))}
      {front.map((c, i) => (
        <ellipse key={`f${i}`} cx={c.cx} cy={baseline - 34} rx="52" ry="26" fill="#5B7A4B" />
      ))}
      {scallops.map((s, i) => (
        <ellipse key={`s${i}`} cx={s.cx} cy={baseline - 12} rx="20" ry="16" fill={s.fill} />
      ))}
      {strands.map((s, i) => {
        const top = baseline - 14;
        const bottom = top + s.len;
        return (
          <g key={`v${i}`} className="leaf-sway" style={{ animationDelay: `${i * 0.4}s` }}>
            <path
              d={`M${s.x} ${top} Q${s.x + 6} ${(top + bottom) / 2} ${s.x} ${bottom}`}
              fill="none"
              stroke="#3E5535"
              strokeWidth="2"
            />
            <ellipse cx={s.x - 7} cy={top + s.len * 0.35} rx="7" ry="4" fill="#5B7A4B" transform={`rotate(-22 ${s.x - 7} ${top + s.len * 0.35})`} />
            <ellipse cx={s.x + 7} cy={top + s.len * 0.58} rx="7" ry="4" fill="#6E8B54" transform={`rotate(22 ${s.x + 7} ${top + s.len * 0.58})`} />
            <circle cx={s.x} cy={bottom} r="4" fill={s.tip} />
          </g>
        );
      })}
    </g>
  );
}
