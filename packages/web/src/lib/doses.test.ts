import { describe, expect, it } from 'vitest';
import type { Dose } from '@medication-tracker/core';
import { doseKey, setDoseTaken } from './doses.js';

const at9 = '2026-07-02T09:00:00.000Z';
const at18 = '2026-07-02T18:00:00.000Z';

const doses: Dose[] = [
  { medicationId: 'med-a', scheduledFor: at9, takenAt: null },
  { medicationId: 'med-b', scheduledFor: at9, takenAt: null },
  { medicationId: 'med-a', scheduledFor: at18, takenAt: null },
];

describe('setDoseTaken', () => {
  it('should tick only the dose for that medication, not everything at the same time', () => {
    const result = setDoseTaken(doses, 'med-a', at9, '2026-07-02T09:01:00.000Z');
    expect(result[0]?.takenAt).not.toBeNull();
    expect(result[1]?.takenAt).toBeNull(); // med-b, also at 09:00 — untouched
    expect(result[2]?.takenAt).toBeNull(); // med-a's later dose — untouched
  });

  it('should untick the same way', () => {
    const taken = doses.map((d) => ({ ...d, takenAt: at9 }));
    const result = setDoseTaken(taken, 'med-b', at9, null);
    expect(result[0]?.takenAt).not.toBeNull();
    expect(result[1]?.takenAt).toBeNull();
  });

  it('should not mutate the input', () => {
    setDoseTaken(doses, 'med-a', at9, at9);
    expect(doses[0]?.takenAt).toBeNull();
  });
});

describe('doseKey', () => {
  it('should distinguish same-time doses of different medications', () => {
    expect(doseKey({ medicationId: 'med-a', scheduledFor: at9 })).not.toBe(
      doseKey({ medicationId: 'med-b', scheduledFor: at9 })
    );
  });
});
