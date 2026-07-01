import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';

export type MedicationFormData = Omit<Medication, 'id'>;

interface Props {
  title: string;
  submitLabel: string;
  initial?: Partial<MedicationFormData>;
  initialPillsNow?: number; // current pills remaining (for prefilling on edit)
  showTime?: boolean; // include the daily dose time field (used when adding)
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

const DAY_MS = 24 * 60 * 60 * 1000;

export function MedicationForm({
  title,
  submitLabel,
  initial,
  initialPillsNow,
  showTime = false,
  onSubmit,
  onCancel,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  // Two ways to set the starting count: state "pills now", or derive it from a
  // pickup date + amount collected. Either way we baseline as of today.
  const [mode, setMode] = useState<'now' | 'pickup'>('now');

  const [name, setName] = useState(initial?.name ?? '');
  const [pillsNow, setPillsNow] = useState(initialPillsNow != null ? String(initialPillsNow) : '');
  const [pickupDate, setPickupDate] = useState(today);
  const [pillsCollected, setPillsCollected] = useState('');
  const [dosesPerDay, setDosesPerDay] = useState(String(initial?.dosesPerDay ?? 1));
  const [refillLeadTimeDays, setRefillLeadTimeDays] = useState(String(initial?.refillLeadTimeDays ?? 7));
  const [scheduleTime, setScheduleTime] = useState(initial?.schedule?.[0] ?? '09:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // How many pills are left today, either stated directly or worked out from the
  // pickup: collected minus a dose per day for each day since pickup.
  function currentPills(): number {
    if (mode === 'now') return Number(pillsNow);
    const daysSince = Math.max(0, Math.floor((Date.parse(today) - Date.parse(pickupDate)) / DAY_MS));
    return Math.max(0, Number(pillsCollected) - daysSince * Number(dosesPerDay));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        pillsAtPickup: currentPills(),
        lastPickupDate: today,
        priorDosesTaken: 0,
        dosesPerDay: Number(dosesPerDay),
        refillLeadTimeDays: Number(refillLeadTimeDays),
        // When not editing the time, preserve the existing schedule.
        schedule: showTime ? [scheduleTime] : (initial?.schedule ?? [scheduleTime]),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
      active ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
    }`;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metformin" className={inputClass} />
      </label>

      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">How do you want to set the pill count?</span>
        <div className="flex gap-2">
          <button type="button" className={tabClass(mode === 'now')} onClick={() => setMode('now')}>
            I have this many now
          </button>
          <button type="button" className={tabClass(mode === 'pickup')} onClick={() => setMode('pickup')}>
            I picked up a prescription
          </button>
        </div>
      </div>

      {mode === 'now' ? (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">How many pills do you have now?</span>
          <input required type="number" min="0" value={pillsNow} onChange={(e) => setPillsNow(e.target.value)} placeholder="e.g. 30" className={inputClass} />
        </label>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Date you picked it up</span>
            <input required type="date" max={today} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Pills collected at that pickup</span>
            <input required type="number" min="1" value={pillsCollected} onChange={(e) => setPillsCollected(e.target.value)} placeholder="e.g. 30" className={inputClass} />
          </label>
        </>
      )}

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Doses per day</span>
        <input required type="number" min="1" value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)} className={inputClass} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Remind me to refill this many days before running out</span>
        <input required type="number" min="0" value={refillLeadTimeDays} onChange={(e) => setRefillLeadTimeDays(e.target.value)} className={inputClass} />
      </label>

      {showTime && (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Daily dose time</span>
          <input required type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={inputClass} />
        </label>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-primary py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
