import type { Medication, Dose, RefillStatus, MedicationAdherence } from '@medication-tracker/core';

const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'mt_token';

// An error that carries the HTTP status, so callers can react to 401 (login).
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The bearer token comes from localStorage (set after login) so it's never baked
// into the public bundle. VITE_API_TOKEN is a fallback for local dev convenience.
function authToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? import.meta.env.VITE_API_TOKEN ?? '';
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Build request headers, adding the bearer token when one is available and the
// JSON content-type when there's a request body.
function headers(hasBody = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (hasBody) h['Content-Type'] = 'application/json';
  const token = authToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}: ${res.url}`);
  return res.json() as Promise<T>;
}

export const apiClient = {
  // Exchange the password for a bearer token, stored for subsequent requests.
  login: async (password: string): Promise<boolean> => {
    const res = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const { token } = (await res.json()) as { token: string };
    setToken(token);
    return true;
  },

  getMedications: () =>
    fetch(`${BASE}/medications`, { headers: headers() }).then((r) => json<Medication[]>(r)),

  // All of today's doses (taken and pending) so taken ones stay visible to un-tick.
  // The server resolves "today" in the configured timezone.
  getTodaysDoses: () =>
    fetch(`${BASE}/doses/today`, { headers: headers() }).then((r) => json<Dose[]>(r)),

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

  updateMedication: (id: string, data: Omit<Medication, 'id'>) =>
    fetch(`${BASE}/medications/${id}`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(data),
    }).then((r) => json<Medication>(r)),

  rescheduleMedication: (id: string, oldTime: string, newTime: string) =>
    fetch(`${BASE}/medications/${id}`, {
      method: 'PATCH',
      headers: headers(true),
      body: JSON.stringify({ oldTime, newTime }),
    }).then((r) => json<void>(r)),

  getRefillStatuses: () =>
    fetch(`${BASE}/refill-status`, { headers: headers() }).then((r) => json<RefillStatus[]>(r)),

  getAdherenceStatuses: () =>
    fetch(`${BASE}/adherence`, { headers: headers() }).then((r) => json<MedicationAdherence[]>(r)),
};
