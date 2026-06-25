import { useEffect, useState } from 'react';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import { api } from '@/api';
import { DoseList } from '@/components/DoseList';
import { RefillList } from '@/components/RefillList';

export default function App() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dueDoses, setDueDoses] = useState<Dose[]>([]);
  const [refillStatuses, setRefillStatuses] = useState<RefillStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getMedications(), api.getDueDoses(), api.getRefillStatuses()])
      .then(([meds, doses, statuses]) => {
        setMedications(meds);
        setDueDoses(doses);
        setRefillStatuses(statuses);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  function handleTaken(scheduledFor: string) {
    setDueDoses((prev) =>
      prev.map((d) =>
        d.scheduledFor === scheduledFor ? { ...d, takenAt: new Date().toISOString() } : d
      )
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const pendingDoses = dueDoses.filter((d) => d.takenAt === null);

  return (
    <div className="mx-auto max-w-sm p-4 space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Medication Tracker</h1>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Due today
          {pendingDoses.length > 0 && (
            <span className="ml-2 font-normal normal-case">
              {pendingDoses.length} remaining
            </span>
          )}
        </h2>
        <DoseList
          doses={dueDoses}
          medications={medications}
          onTaken={handleTaken}
        />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Refill status
        </h2>
        <RefillList statuses={refillStatuses} medications={medications} />
      </section>
    </div>
  );
}
