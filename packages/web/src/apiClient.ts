import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';

const BASE = import.meta.env['VITE_API_URL'] ?? '';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
  return res.json() as Promise<T>;
}

export const apiClient = {
  getMedications: () =>
    fetch(`${BASE}/medications`).then((r) => json<Medication[]>(r)),

  getDueDoses: () => {
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    return fetch(`${BASE}/doses/due?now=${endOfToday.toISOString()}`).then((r) => json<Dose[]>(r));
  },

  markTaken: (medicationId: string, scheduledFor: string) =>
    fetch(`${BASE}/doses/taken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId, scheduledFor }),
    }).then((r) => json<void>(r)),

  addMedication: (data: Omit<Medication, 'id'>) =>
    fetch(`${BASE}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => json<Medication>(r)),

  getRefillStatuses: () =>
    fetch(`${BASE}/refill-status`).then((r) => json<RefillStatus[]>(r)),
};
