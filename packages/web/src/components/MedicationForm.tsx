import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';

export type MedicationFormData = Omit<Medication, 'id'>;

interface Props {
  title: string;
  submitLabel: string;
  initial?: Partial<MedicationFormData>;
  showTime?: boolean; // include the daily dose time field (used when adding)
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

export function MedicationForm({ title, submitLabel, initial, showTime = false, onSubmit, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(initial?.name ?? '');
  const [pillsAtPickup, setPillsAtPickup] = useState(
    initial?.pillsAtPickup != null ? String(initial.pillsAtPickup) : ''
  );
  const [lastPickupDate, setLastPickupDate] = useState(initial?.lastPickupDate ?? today);
  const [priorDosesTaken, setPriorDosesTaken] = useState(String(initial?.priorDosesTaken ?? 0));
  const [dosesPerDay, setDosesPerDay] = useState(String(initial?.dosesPerDay ?? 1));
  const [refillLeadTimeDays, setRefillLeadTimeDays] = useState(String(initial?.refillLeadTimeDays ?? 7));
  const [scheduleTime, setScheduleTime] = useState(initial?.schedule?.[0] ?? '09:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        pillsAtPickup: Number(pillsAtPickup),
        lastPickupDate,
        priorDosesTaken: Number(priorDosesTaken),
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

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Metformin" className={inputClass} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Date of last prescription pickup</span>
        <input required type="date" value={lastPickupDate} onChange={(e) => setLastPickupDate(e.target.value)} className={inputClass} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Pills collected at that pickup</span>
        <input required type="number" min="1" value={pillsAtPickup} onChange={(e) => setPillsAtPickup(e.target.value)} placeholder="e.g. 30" className={inputClass} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Pills already taken since pickup</span>
        <input required type="number" min="0" value={priorDosesTaken} onChange={(e) => setPriorDosesTaken(e.target.value)} placeholder="0" className={inputClass} />
      </label>

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
