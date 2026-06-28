import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';

const BASE = import.meta.env['VITE_API_URL'] ?? '';
const TOKEN = import.meta.env['VITE_API_TOKEN'];

// Build request headers, adding the bearer token when one is configured and the
// JSON content-type when there's a request body.
function headers(hasBody = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (hasBody) h['Content-Type'] = 'application/json';
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  return h;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
  return res.json() as Promise<T>;
}

export const apiClient = {
  getMedications: () =>
    fetch(`${BASE}/medications`, { headers: headers() }).then((r) => json<Medication[]>(r)),

  // All of today's doses (taken and pending) so taken ones stay visible to un-tick.
  getTodaysDoses: () => {
    const today = new Date().toISOString().slice(0, 10);
    return fetch(`${BASE}/doses/today?date=${today}`, { headers: headers() }).then((r) =>
      json<Dose[]>(r)
    );
  },

  markTaken: (medicationId: string, scheduledFor: string) =>
    fetch(`${BASE}/doses/taken`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ medicationId, scheduledFor }),
    }).then((r) => json<void>(r)),

  markUntaken: (medicationId: string, scheduledFor: string) =>
    fetch(`${BASE}/doses/taken`, {
      method: 'DELETE',
      headers: headers(true),
      body: JSON.stringify({ medicationId, scheduledFor }),
    }).then((r) => json<void>(r)),

  addMedication: (data: Omit<Medication, 'id'>) =>
    fetch(`${BASE}/medications`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify(data),
    }).then((r) => json<Medication>(r)),

  deleteMedication: (id: string) =>
    fetch(`${BASE}/medications/${id}`, { method: 'DELETE', headers: headers() }).then((r) =>
      json<void>(r)
    ),

  rescheduleMedication: (id: string, oldTime: string, newTime: string) =>
    fetch(`${BASE}/medications/${id}`, {
      method: 'PATCH',
      headers: headers(true),
      body: JSON.stringify({ oldTime, newTime }),
    }).then((r) => json<void>(r)),

  getRefillStatuses: () =>
    fetch(`${BASE}/refill-status`, { headers: headers() }).then((r) => json<RefillStatus[]>(r)),
};
