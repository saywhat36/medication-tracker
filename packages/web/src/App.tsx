import { useEffect, useState } from 'react';
import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';
import { api } from './api.js';

export default function App() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dueDoses, setDueDoses] = useState<Dose[]>([]);
  const [refillStatuses, setRefillStatuses] = useState<RefillStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMedications(), api.getDueDoses(), api.getRefillStatuses()])
      .then(([meds, doses, statuses]) => {
        setMedications(meds);
        setDueDoses(doses);
        setRefillStatuses(statuses);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Medication Tracker</h1>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Due today</h2>
        {dueDoses.length === 0 ? (
          <p className="text-sm text-muted-foreground">All doses taken ✓</p>
        ) : (
          <ul className="space-y-2">
            {dueDoses.map((dose) => {
              const med = medications.find((m) => m.id === dose.medicationId);
              return (
                <li key={dose.scheduledFor} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex-1 text-sm">{med?.name ?? dose.medicationId}</span>
                  <span className="text-xs text-muted-foreground">
                    {dose.scheduledFor.slice(11, 16)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Refill status</h2>
        <ul className="space-y-2">
          {refillStatuses.map((s) => {
            const med = medications.find((m) => m.id === s.medicationId);
            const overdue = s.daysUntilRefill < 0;
            const soon = s.daysUntilRefill >= 0 && s.daysUntilRefill <= 7;
            return (
              <li key={s.medicationId} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex-1 text-sm">{med?.name ?? s.medicationId}</span>
                <span className={`text-xs font-medium ${overdue ? 'text-destructive' : soon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {overdue
                    ? 'Reorder now'
                    : soon
                    ? `${s.daysUntilRefill}d — order soon`
                    : `${s.daysUntilRefill}d`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
