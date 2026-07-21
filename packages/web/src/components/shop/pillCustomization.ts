import type { PillCustomization } from '@medication-tracker/core';

// pillCustomizations is a sparse array keyed by jar position (bottleData's
// pillPositions order, stable across renders since pills are consumed from
// the same deterministic layout — see Bottle.tsx). Lower positions may be
// unset, so writing to a higher index pads with empty customizations.
export function withPillCustomization(
  existing: PillCustomization[] | undefined,
  index: number,
  patch: Partial<PillCustomization>
): PillCustomization[] {
  const next = [...(existing ?? [])];
  while (next.length <= index) next.push({});
  next[index] = { ...next[index], ...patch };
  return next;
}

export const PILL_EMOJI_PALETTE = ['💊', '⭐', '🌙', '☀️', '❤️', '🌿', '✨', '🔸'] as const;
