import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';
import { api } from '@/api';
import { bottleContents, apothecary } from '@/theme/apothecary';
import { contentColorFor } from './bottleData';

interface Props {
  medication: Medication;
  onChanged: () => void;
}

// Lets you recolor a bottle: a preset swatch row drawn from the same muted
// palette bottles already get by default, a native color input for anything
// else, and a reset back to the deterministic default. Saves immediately —
// there's no separate "apply" step, matching how ticking a dose or deleting
// a bottle are both immediate elsewhere in the shop view.
export function BottleColorPicker({ medication, onChanged }: Props) {
  const [saving, setSaving] = useState(false);
  const defaultColor = contentColorFor(medication.name);
  const current = medication.customBottleColor ?? defaultColor;
  const isPreset = (bottleContents as readonly string[]).includes(current);

  async function save(customBottleColor: string | undefined) {
    setSaving(true);
    try {
      const { id, ...rest } = medication;
      await api.updateMedication(id, { ...rest, customBottleColor });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-apothecary-parchment-edge pt-3">
      <p className="font-hand text-lg text-apothecary-ink">bottle colour</p>
      <div className="flex flex-wrap items-center gap-2">
        {bottleContents.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color} for this bottle`}
            aria-pressed={current === color}
            disabled={saving}
            onClick={() => void save(color)}
            className="h-7 w-7 rounded-full border-2 disabled:opacity-50"
            style={{
              backgroundColor: color,
              borderColor: current === color ? apothecary.ink.DEFAULT : 'transparent',
            }}
          />
        ))}
        <label
          className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2"
          style={{ borderColor: !isPreset ? apothecary.ink.DEFAULT : 'transparent' }}
        >
          <input
            type="color"
            aria-label="Pick a custom bottle colour"
            disabled={saving}
            value={current}
            onChange={(e) => void save(e.target.value)}
            className="absolute -inset-2 cursor-pointer"
          />
        </label>
        {medication.customBottleColor && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(undefined)}
            className="font-hand text-sm text-apothecary-ink-faded underline decoration-dotted underline-offset-4 hover:text-apothecary-ink disabled:opacity-50"
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}
