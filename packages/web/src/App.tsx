import { useCallback, useEffect, useState } from 'react';
import type { Dose, Medication, RefillStatus } from '@medication-tracker/core';
import { api } from '@/api';
import { ApiError } from '@/apiClient';
import { AddMedicationForm } from '@/components/AddMedicationForm';
import { DoseList } from '@/components/DoseList';
import { LoginForm } from '@/components/LoginForm';
import { MedicationList } from '@/components/MedicationList';
import { PillJar } from '@/components/PillJar';
import { RefillList } from '@/components/RefillList';
import { ShopView } from '@/components/shop/ShopView';
import { useViewMode } from '@/view';

export default function App() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dueDoses, setDueDoses] = useState<Dose[]>([]);
  const [refillStatuses, setRefillStatuses] = useState<RefillStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [view, setView] = useViewMode();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getMedications(), api.getTodaysDoses(), api.getRefillStatuses()])
      .then(([meds, doses, statuses]) => {
        setMedications(meds);
        setDueDoses(doses);
        setRefillStatuses(statuses);
        setNeedsLogin(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setNeedsLogin(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Adjust a medication's remaining pills locally so the jar pops/refills instantly.
  function adjustPills(medicationId: string, delta: number) {
    setRefillStatuses((prev) =>
      prev.map((s) =>
        s.medicationId === medicationId
          ? { ...s, pillsRemaining: Math.max(0, s.pillsRemaining + delta) }
          : s
      )
    );
  }

  function handleTaken(medicationId: string, scheduledFor: string) {
    setDueDoses((prev) =>
      prev.map((d) =>
        d.scheduledFor === scheduledFor ? { ...d, takenAt: new Date().toISOString() } : d
      )
    );
    adjustPills(medicationId, -1);
  }

  function handleUntaken(medicationId: string, scheduledFor: string) {
    setDueDoses((prev) =>
      prev.map((d) => (d.scheduledFor === scheduledFor ? { ...d, takenAt: null } : d))
    );
    adjustPills(medicationId, +1);
  }

  function handleMedicationAdded(med: Medication) {
    setMedications((prev) => [...prev, med]);
    void Promise.all([api.getTodaysDoses(), api.getRefillStatuses()]).then(([doses, statuses]) => {
      setDueDoses(doses);
      setRefillStatuses(statuses);
    });
  }

  function handleRescheduled() {
    void Promise.all([api.getTodaysDoses(), api.getMedications()]).then(([doses, meds]) => {
      setDueDoses(doses);
      setMedications(meds);
    });
  }

  function handleMedicationDeleted(id: string) {
    setMedications((prev) => prev.filter((m) => m.id !== id));
    void Promise.all([api.getTodaysDoses(), api.getRefillStatuses()]).then(([doses, statuses]) => {
      setDueDoses(doses);
      setRefillStatuses(statuses);
    });
  }

  function handleMedicationUpdated() {
    void Promise.all([api.getMedications(), api.getTodaysDoses(), api.getRefillStatuses()]).then(
      ([meds, doses, statuses]) => {
        setMedications(meds);
        setDueDoses(doses);
        setRefillStatuses(statuses);
      }
    );
  }

  if (needsLogin) {
    return <LoginForm onSuccess={load} />;
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

  if (view === 'shop') {
    return (
      <ShopView
        medications={medications}
        refillStatuses={refillStatuses}
        onMedicationUpdated={handleMedicationUpdated}
        onSwitchToClassic={() => setView('classic')}
      />
    );
  }

  const pendingDoses = dueDoses.filter((d) => d.takenAt === null);

  return (
    <div className="mx-auto max-w-sm p-4 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Medication Tracker</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setView('shop')}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Shop view
        </button>
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
          onUntaken={handleUntaken}
          onRescheduled={handleRescheduled}
        />
      </section>

      {medications.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Supply
          </h2>
          <div className="flex flex-wrap gap-4">
            {medications.map((m) => (
              <PillJar
                key={m.id}
                name={m.name}
                count={refillStatuses.find((s) => s.medicationId === m.id)?.pillsRemaining ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Refill status
        </h2>
        <RefillList statuses={refillStatuses} medications={medications} />
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Medications
        </h2>
        <MedicationList
          medications={medications}
          refillStatuses={refillStatuses}
          onDeleted={handleMedicationDeleted}
          onUpdated={handleMedicationUpdated}
        />
        <AddMedicationForm onAdded={handleMedicationAdded} onSubmit={api.addMedication} />
      </section>
    </div>
  );
}
