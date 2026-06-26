import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';

const BASE = import.meta.env['VITE_API_URL'] ?? '';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
  return res.json() as Promise<T>;
}

export const apiClient = {
  getMedications: () =>
    fetch(`${BASE}/medications`).then((r) => json<Medication[]>(r)),

  // All of today's doses (taken and pending) so taken ones stay visible to un-tick.
  getTodaysDoses: () => {
    const today = new Date().toISOString().slice(0, 10);
    return fetch(`${BASE}/doses/today?date=${today}`).then((r) => json<Dose[]>(r));
  },

  markTaken: (medicationId: string, scheduledFor: string) =>
    fetch(`${BASE}/doses/taken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId, scheduledFor }),
    }).then((r) => json<void>(r)),

  markUntaken: (medicationId: string, scheduledFor: string) =>
    fetch(`${BASE}/doses/taken`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId, scheduledFor }),
    }).then((r) => json<void>(r)),

  addMedication: (data: Omit<Medication, 'id'>) =>
    fetch(`${BASE}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => json<Medication>(r)),

  deleteMedication: (id: string) =>
    fetch(`${BASE}/medications/${id}`, { method: 'DELETE' }).then((r) => json<void>(r)),

  getRefillStatuses: () =>
    fetch(`${BASE}/refill-status`).then((r) => json<RefillStatus[]>(r)),
};
