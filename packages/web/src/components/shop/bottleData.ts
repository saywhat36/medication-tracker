import type { Medication, RefillStatus } from '@medication-tracker/core';
// Relative import (not @/) so this module also resolves under the root vitest
// run, which doesn't know the web package's path alias.
import { bottleContents } from '../../theme/apothecary.js';

// Everything a Bottle needs to draw itself. Built by joining a medication
// with its refill status; the glass drains as pills are taken.
export interface BottleData {
  id: string;
  name: string;
  pillsRemaining: number;
  // 0..1 — how full the glass looks. 1 = as full as at pickup.
  fill: number;
  color: string;
}

// The bottle was fullest at pickup, so that's what "full glass" means.
// Clamped so a manually-bumped count never overflows the bottle and an
// empty/unknown pickup can't divide by zero.
export function bottleFill(pillsRemaining: number, pillsAtPickup: number): number {
  if (pillsAtPickup <= 0) return 0;
  return Math.min(1, Math.max(0, pillsRemaining / pillsAtPickup));
}

// Deterministic name → contents color, so a medication keeps its color
// across reloads and devices without storing anything.
export function contentColorFor(name: string): string {
  let hash = 0;
  for (const ch of name.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return bottleContents[Math.abs(hash) % bottleContents.length] ?? bottleContents[0];
}

export function toBottles(medications: Medication[], statuses: RefillStatus[]): BottleData[] {
  return medications.map((med) => {
    const pillsRemaining = statuses.find((s) => s.medicationId === med.id)?.pillsRemaining ?? 0;
    return {
      id: med.id,
      name: med.name,
      pillsRemaining,
      fill: bottleFill(pillsRemaining, med.pillsAtPickup),
      color: contentColorFor(med.name),
    };
  });
}
