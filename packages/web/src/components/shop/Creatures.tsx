import { useEffect, useState } from 'react';

interface Props {
  zoneXs: number[]; // x-centres to spawn from — the same spots HangingFoliage's back row hangs from
  baseline: number; // the foliage's baseline y, so creatures emerge from where the leaves are
}

type CreatureType = 'ladybug' | 'butterfly' | 'spider' | 'bottle';
const CREATURE_TYPES: CreatureType[] = ['ladybug', 'butterfly', 'spider', 'bottle'];
const SPAWN_INTERVAL_MS = 3000;
const MAX_CONCURRENT = 2;

interface SpawnedCreature {
  id: number;
  type: CreatureType;
  x: number;
}

let nextCreatureId = 0;

// A handful of small easter eggs that occasionally emerge from the hanging
// foliage — a ladybug crawling out, a butterfly fluttering off, a spider
// dropping on its thread, or a bottle rolling free for a second. Purely
// decorative (pointer-events none, aria-hidden) and off entirely under
// prefers-reduced-motion, matching the candle flicker and leaf sway.
export function Creatures({ zoneXs, baseline }: Props) {
  const [creatures, setCreatures] = useState<SpawnedCreature[]>([]);
  const [enabled] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (!enabled || zoneXs.length === 0) return;
    const interval = setInterval(() => {
      setCreatures((prev) => {
        if (prev.length >= MAX_CONCURRENT) return prev;
        const type = CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)] ?? 'ladybug';
        const x = zoneXs[Math.floor(Math.random() * zoneXs.length)] ?? 0;
        return [...prev, { id: nextCreatureId++, type, x }];
      });
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, zoneXs]);

  if (!enabled) return null;

  function remove(id: number) {
    setCreatures((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <g aria-hidden="true" pointerEvents="none">
      {creatures.map((c) => (
        <Creature key={c.id} creature={c} baseline={baseline} onDone={() => remove(c.id)} />
      ))}
    </g>
  );
}

// Each creature is a static positioning wrapper (plain translate to its spawn
// spot) around an inner group that carries the CSS keyframe animation. Kept
// separate because a CSS animation on `transform` replaces the whole
// property, inline value included — so the per-instance x/baseline position
// can't live on the same element as the shared animation class.
function Creature({
  creature,
  baseline,
  onDone,
}: {
  creature: SpawnedCreature;
  baseline: number;
  onDone: () => void;
}) {
  const { type, x } = creature;
  const at = { transform: `translate(${x}px, ${baseline}px)` };

  if (type === 'ladybug') {
    return (
      <g style={at}>
        <g className="creature-ladybug" onAnimationEnd={onDone}>
          <ellipse cx="0" cy="0" rx="4" ry="3" fill="#B23A2E" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#1A1A1A" strokeWidth="0.6" />
          <circle cx="-1.5" cy="-1" r="0.6" fill="#1A1A1A" />
          <circle cx="1.5" cy="-1" r="0.6" fill="#1A1A1A" />
          <circle cx="0" cy="-2.5" r="1.1" fill="#1A1A1A" />
        </g>
      </g>
    );
  }

  if (type === 'butterfly') {
    return (
      <g style={at}>
        <g className="creature-butterfly" onAnimationEnd={onDone}>
          <g className="creature-butterfly-wings">
            <ellipse cx="-2.5" cy="0" rx="3" ry="4" fill="#E8A33D" fillOpacity="0.85" />
            <ellipse cx="2.5" cy="0" rx="3" ry="4" fill="#C58ABF" fillOpacity="0.85" />
          </g>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#3B2A1A" strokeWidth="0.8" />
        </g>
      </g>
    );
  }

  if (type === 'spider') {
    return (
      <g style={at}>
        <line x1="0" y1="0" x2="0" y2="22" stroke="#00000055" strokeWidth="0.7" />
        <g className="creature-spider" onAnimationEnd={onDone}>
          <circle cx="0" cy="0" r="2.5" fill="#2A2320" />
          {[-1, 1].map((side) =>
            [-2, 0, 2].map((offset, i) => (
              <line
                key={`${side}-${i}`}
                x1="0"
                y1="0"
                x2={side * 5}
                y2={offset}
                stroke="#2A2320"
                strokeWidth="0.5"
              />
            ))
          )}
        </g>
      </g>
    );
  }

  // Rolling bottle
  return (
    <g style={at}>
      <g className="creature-bottle" onAnimationEnd={onDone}>
        <rect x="-4" y="-8" width="8" height="8" rx="2" fill="#E8DFC8" fillOpacity="0.9" stroke="#2F2A26" strokeWidth="0.5" />
        <rect x="-2" y="-10" width="4" height="2.5" rx="1" fill="#2F2A26" />
      </g>
    </g>
  );
}
