import type { Medication, PillCustomization, RefillStatus } from '@medication-tracker/core';
// Relative import (not @/) so this module also resolves under the root vitest
// run, which doesn't know the web package's path alias.
import { bottleContents } from '../../theme/apothecary.js';

// Everything a Bottle needs to draw itself. Built by joining a medication
// with its refill status; the bottle shows its actual pills, so it empties
// pill by pill as doses are taken.
export interface BottleData {
  id: string;
  name: string;
  pillsRemaining: number;
  color: string;
  customBottleColor?: string;
  pillCustomizations?: PillCustomization[];
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
  return medications.map((med) => ({
    id: med.id,
    name: med.name,
    pillsRemaining: statuses.find((s) => s.medicationId === med.id)?.pillsRemaining ?? 0,
    color: med.customBottleColor ?? contentColorFor(med.name),
    customBottleColor: med.customBottleColor,
    pillCustomizations: med.pillCustomizations,
  }));
}
