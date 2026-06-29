import { useState } from 'react';
import type { Medication } from '@medication-tracker/core';

interface Props {
  onAdded: (med: Medication) => void;
  onSubmit: (data: Omit<Medication, 'id'>) => Promise<Medication>;
}

export function AddMedicationForm({ onAdded, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [pillsAtPickup, setPillsAtPickup] = useState('');
  const [lastPickupDate, setLastPickupDate] = useState(today);
  const [priorDosesTaken, setPriorDosesTaken] = useState('0');
  const [dosesPerDay, setDosesPerDay] = useState('1');
  const [refillLeadTimeDays, setRefillLeadTimeDays] = useState('7');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const med = await onSubmit({
        name: name.trim(),
        pillsAtPickup: Number(pillsAtPickup),
        lastPickupDate,
        priorDosesTaken: Number(priorDosesTaken),
        dosesPerDay: Number(dosesPerDay),
        refillLeadTimeDays: Number(refillLeadTimeDays),
        schedule: [scheduleTime],
      });
      onAdded(med);
      setOpen(false);
      setName('');
      setPillsAtPickup('');
      setLastPickupDate(today);
      setPriorDosesTaken('0');
      setDosesPerDay('1');
      setRefillLeadTimeDays('7');
      setScheduleTime('09:00');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
      >
        + Add medication
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold">New medication</h3>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Metformin"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Date of last prescription pickup</span>
        <input
          required
          type="date"
          value={lastPickupDate}
          onChange={(e) => setLastPickupDate(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Pills collected at that pickup</span>
        <input
          required
          type="number"
          min="1"
          value={pillsAtPickup}
          onChange={(e) => setPillsAtPickup(e.target.value)}
          placeholder="e.g. 30"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Pills already taken since pickup</span>
        <input
          required
          type="number"
          min="0"
          value={priorDosesTaken}
          onChange={(e) => setPriorDosesTaken(e.target.value)}
          placeholder="0"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Doses per day</span>
        <input
          required
          type="number"
          min="1"
          value={dosesPerDay}
          onChange={(e) => setDosesPerDay(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Remind me to refill this many days before running out</span>
        <input
          required
          type="number"
          min="0"
          value={refillLeadTimeDays}
          onChange={(e) => setRefillLeadTimeDays(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Daily dose time</span>
        <input
          required
          type="time"
          value={scheduleTime}
          onChange={(e) => setScheduleTime(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-primary py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
