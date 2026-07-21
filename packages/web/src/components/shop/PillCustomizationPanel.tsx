import { useEffect, useState } from 'react';
import type { Medication, PillCustomization } from '@medication-tracker/core';
import { api } from '@/api';
import { apothecary, bottleContents } from '@/theme/apothecary';
import { MAX_VISIBLE_PILLS } from './Bottle';
import { contentColorFor } from './bottleData';
import { PILL_EMOJI_PALETTE, withPillCustomization } from './pillCustomization';
import { PillDrawingCanvas } from './PillDrawingCanvas';

interface Props {
  medication: Medication;
  pillsRemaining: number;
  onChanged: () => void;
}

type Tab = 'label' | 'color' | 'draw';

const tabs: { id: Tab; label: string }[] = [
  { id: 'label', label: 'label' },
  { id: 'color', label: 'colour' },
  { id: 'draw', label: 'draw' },
];

// A strip of the jar's actual pills (capped at what Bottle.tsx can show), so
// you pick one and customize it: an emoji/text label, its own colour
// (independent of the bottle's), or a small freehand drawing. Previous/Next
// lets you page through every pill without re-opening the strip each time.
export function PillCustomizationPanel({ medication, pillsRemaining, onChanged }: Props) {
  const visibleCount = Math.min(pillsRemaining, MAX_VISIBLE_PILLS);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('label');
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
  const isPresetColor = (bottleContents as readonly string[]).includes(currentColor);

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
              className="relative flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
              style={{ backgroundColor: currentColor, borderColor: apothecary.ink.DEFAULT }}
            >
              {current.drawingData && (
                <img
                  src={current.drawingData}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full rounded-full object-cover"
                />
              )}
              <span className="relative">{current.emoji ?? ''}</span>
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

          <div className="flex justify-center gap-1 border-b border-apothecary-parchment-edge pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  tab === t.id
                    ? 'bg-apothecary-ink text-apothecary-parchment-light'
                    : 'border border-apothecary-parchment-edge text-apothecary-ink hover:bg-apothecary-parchment-edge/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'label' && (
            <div className="space-y-3">
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

          {tab === 'color' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {bottleContents.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use ${color} for this pill`}
                  aria-pressed={currentColor === color}
                  disabled={saving}
                  onClick={() => void save(openIndex, { customColor: color })}
                  className="h-7 w-7 rounded-full border-2 disabled:opacity-50"
                  style={{
                    backgroundColor: color,
                    borderColor: currentColor === color ? apothecary.ink.DEFAULT : 'transparent',
                  }}
                />
              ))}
              <label
                className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2"
                style={{ borderColor: !isPresetColor ? apothecary.ink.DEFAULT : 'transparent' }}
              >
                <input
                  type="color"
                  aria-label="Pick a custom pill colour"
                  disabled={saving}
                  value={currentColor}
                  onChange={(e) => void save(openIndex, { customColor: e.target.value })}
                  className="absolute -inset-2 cursor-pointer"
                />
              </label>
              {current.customColor && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save(openIndex, { customColor: undefined })}
                  className="font-hand text-sm text-apothecary-ink-faded underline decoration-dotted underline-offset-4 hover:text-apothecary-ink disabled:opacity-50"
                >
                  reset
                </button>
              )}
            </div>
          )}

          {tab === 'draw' && (
            <PillDrawingCanvas
              key={openIndex}
              value={current.drawingData}
              disabled={saving}
              onSave={(drawingData) => void save(openIndex, { drawingData })}
            />
          )}
        </div>
      )}
    </div>
  );
}
