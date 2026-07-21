import { useEffect, useState } from 'react';
import type { Medication, PillCustomization } from '@medication-tracker/core';
import { api } from '@/api';
import { apothecary } from '@/theme/apothecary';
import { MAX_VISIBLE_PILLS } from './Bottle';
import { contentColorFor } from './bottleData';
import { PILL_EMOJI_PALETTE, withPillCustomization } from './pillCustomization';

interface Props {
  medication: Medication;
  pillsRemaining: number;
  onChanged: () => void;
}

// A strip of the jar's actual pills (capped at what Bottle.tsx can show), so
// you pick one and give it an emoji and/or a short text label — an enlarged
// preview plus Previous/Next lets you page through every pill without
// re-opening the strip each time.
export function PillCustomizationPanel({ medication, pillsRemaining, onChanged }: Props) {
  const visibleCount = Math.min(pillsRemaining, MAX_VISIBLE_PILLS);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Local draft for the text field so typing doesn't fire a save per
  // keystroke — it only persists on blur, once the value has settled.
  const [labelDraft, setLabelDraft] = useState('');

  const persistedLabel = openIndex != null ? (medication.pillCustomizations?.[openIndex]?.textLabel ?? '') : '';
  // Re-sync whenever the open pill changes or its persisted label changes
  // (e.g. after a save round-trip refreshes `medication`).
  useEffect(() => {
    setLabelDraft(persistedLabel);
  }, [openIndex, persistedLabel]);

  if (visibleCount === 0) return null;

  const defaultColor = contentColorFor(medication.name);

  async function save(index: number, patch: Partial<PillCustomization>) {
    setSaving(true);
    try {
      const { id, ...rest } = medication;
      const pillCustomizations = withPillCustomization(medication.pillCustomizations, index, patch);
      await api.updateMedication(id, { ...rest, pillCustomizations });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const current = openIndex != null ? (medication.pillCustomizations?.[openIndex] ?? {}) : null;
  const currentColor = current?.customColor ?? medication.customBottleColor ?? defaultColor;
  const currentHasLabel = current != null && (current.emoji != null || current.textLabel != null);

  return (
    <div className="space-y-2 border-t border-apothecary-parchment-edge pt-3">
      <p className="font-hand text-lg text-apothecary-ink">customize a pill</p>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: visibleCount }, (_, i) => {
          const custom = medication.pillCustomizations?.[i];
          return (
            <button
              key={i}
              type="button"
              aria-label={`Customize pill ${i + 1} of ${visibleCount}`}
              aria-pressed={openIndex === i}
              onClick={() => setOpenIndex(i)}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm"
              style={{
                backgroundColor: custom?.customColor ?? medication.customBottleColor ?? defaultColor,
                borderColor: openIndex === i ? apothecary.ink.DEFAULT : 'transparent',
              }}
            >
              {custom?.emoji ?? ''}
            </button>
          );
        })}
      </div>

      {openIndex != null && current && (
        <div className="space-y-3 rounded-md border border-apothecary-parchment-edge p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={openIndex === 0}
              onClick={() => setOpenIndex((idx) => (idx != null ? Math.max(0, idx - 1) : idx))}
              className="font-hand text-sm text-apothecary-ink underline decoration-dotted underline-offset-4 disabled:opacity-30"
            >
              ← previous
            </button>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
              style={{ backgroundColor: currentColor, borderColor: apothecary.ink.DEFAULT }}
            >
              {current.emoji ?? ''}
            </div>
            <button
              type="button"
              disabled={openIndex === visibleCount - 1}
              onClick={() =>
                setOpenIndex((idx) => (idx != null ? Math.min(visibleCount - 1, idx + 1) : idx))
              }
              className="font-hand text-sm text-apothecary-ink underline decoration-dotted underline-offset-4 disabled:opacity-30"
            >
              next →
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-1">
            {PILL_EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                disabled={saving}
                aria-label={`Set emoji to ${emoji}`}
                aria-pressed={current.emoji === emoji}
                onClick={() => void save(openIndex, { emoji: current.emoji === emoji ? undefined : emoji })}
                className={`rounded px-1.5 py-0.5 text-lg ${
                  current.emoji === emoji ? 'bg-apothecary-parchment-edge' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-apothecary-ink-faded">Text label (optional)</span>
            <input
              value={labelDraft}
              disabled={saving}
              maxLength={20}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={() => {
                if (labelDraft !== persistedLabel) {
                  void save(openIndex, { textLabel: labelDraft === '' ? undefined : labelDraft });
                }
              }}
              placeholder="e.g. morning"
              className="w-full rounded-md border border-apothecary-parchment-edge bg-white px-2 py-1 text-sm"
            />
          </label>

          {currentHasLabel && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setLabelDraft('');
                void save(openIndex, { emoji: undefined, textLabel: undefined });
              }}
              className="w-full text-center font-hand text-sm text-apothecary-ink-faded underline decoration-dotted underline-offset-4 hover:text-apothecary-ink disabled:opacity-50"
            >
              clear this pill&rsquo;s label
            </button>
          )}
        </div>
      )}
    </div>
  );
}
