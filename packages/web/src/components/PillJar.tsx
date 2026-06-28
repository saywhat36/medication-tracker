import { useEffect, useRef, useState } from 'react';

interface Props {
  name: string;
  count: number;
}

const MAX_DRAWN = 24; // cap the drawn pills; the exact number is always labelled
const COLS = 6;

const ink = {
  lid: { fill: 'hsl(var(--muted-foreground) / 0.45)' },
  neck: { fill: 'hsl(var(--muted-foreground) / 0.2)' },
  body: { fill: 'hsl(var(--muted) / 0.7)', stroke: 'hsl(var(--border))' },
  pill: { fill: 'hsl(var(--primary) / 0.75)' },
  popPill: { fill: 'hsl(var(--primary))' },
};

export function PillJar({ name, count }: Props) {
  // Replay the pop animation whenever the count drops (a dose was ticked).
  const [popKey, setPopKey] = useState(0);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count < prevCount.current) {
      setPopKey((k) => k + 1);
    }
    prevCount.current = count;
  }, [count]);

  const drawn = Math.min(Math.max(count, 0), MAX_DRAWN);
  const pills = Array.from({ length: drawn }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return { key: i, x: 30 + col * 10, y: 124 - row * 10 };
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 120 150"
        width="84"
        height="105"
        role="img"
        aria-label={`${count} ${name} pills left`}
      >
        {/* jar */}
        <rect x="38" y="6" width="44" height="12" rx="3" style={ink.lid} />
        <rect x="46" y="16" width="28" height="8" style={ink.neck} />
        <rect x="20" y="24" width="80" height="112" rx="14" style={ink.body} strokeWidth="2" />

        {/* pills resting in the jar */}
        {pills.map((p) => (
          <rect key={p.key} x={p.x} y={p.y} width="9" height="6" rx="3" style={ink.pill} />
        ))}

        {/* the pill that pops out on tick — remounting via key replays the animation */}
        {popKey > 0 && (
          <rect
            key={popKey}
            x="53"
            y="26"
            width="9"
            height="6"
            rx="3"
            style={ink.popPill}
            className="pill-pop"
          />
        )}
      </svg>

      <div className="-mt-1 text-center">
        <div className="text-sm font-semibold tabular-nums">{count}</div>
        <div className="text-xs text-muted-foreground">{name}</div>
      </div>
    </div>
  );
}
