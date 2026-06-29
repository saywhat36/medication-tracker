import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';

export const mockMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformin',
    pillsAtPickup: 30,
    lastPickupDate: '2026-06-25',
    dosesPerDay: 1,
    refillLeadTimeDays: 7,
    schedule: ['08:00'],
  },
  {
    id: 'med-2',
    name: 'Lisinopril',
    pillsAtPickup: 10,
    lastPickupDate: '2026-06-25',
    dosesPerDay: 1,
    refillLeadTimeDays: 7,
    schedule: ['21:00'],
  },
];

const todayAt = (hour: number) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const mockTodaysDoses: Dose[] = [
  // One already taken (so you can try un-ticking it), one still pending.
  { medicationId: 'med-1', scheduledFor: todayAt(8), takenAt: todayAt(8) },
  { medicationId: 'med-2', scheduledFor: todayAt(21), takenAt: null },
];

export const mockRefillStatuses: RefillStatus[] = [
  { medicationId: 'med-1', pillsRemaining: 30, daysUntilRefill: 23, runOutDate: '2026-07-25', refillDate: '2026-07-18' },
  { medicationId: 'med-2', pillsRemaining: 10, daysUntilRefill: 3, runOutDate: '2026-07-05', refillDate: '2026-06-28' },
];

export const mockClient = {
  login: (_password: string) => Promise.resolve(true),
  getMedications: () => Promise.resolve(mockMedications),
  getTodaysDoses: () => Promise.resolve(mockTodaysDoses),
  markTaken: (_medicationId: string, scheduledFor: string) => {
    const dose = mockTodaysDoses.find((d) => d.scheduledFor === scheduledFor);
    if (dose) dose.takenAt = new Date().toISOString();
    return Promise.resolve();
  },
  markUntaken: (_medicationId: string, scheduledFor: string) => {
    const dose = mockTodaysDoses.find((d) => d.scheduledFor === scheduledFor);
    if (dose) dose.takenAt = null;
    return Promise.resolve();
  },
  addMedication: (data: Omit<Medication, 'id'>) => {
    const med: Medication = { id: `med-mock-${Date.now()}`, ...data };
    mockMedications.push(med);
    return Promise.resolve(med);
  },
  deleteMedication: (id: string) => {
    const index = mockMedications.findIndex((m) => m.id === id);
    if (index !== -1) mockMedications.splice(index, 1);
    return Promise.resolve();
  },
  rescheduleMedication: (id: string, oldTime: string, newTime: string) => {
    const med = mockMedications.find((m) => m.id === id);
    if (med) med.schedule = med.schedule.map((t) => (t === oldTime ? newTime : t));
    const localHHMM = (iso: string) =>
      new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (const dose of mockTodaysDoses) {
      if (dose.medicationId === id && dose.takenAt === null && localHHMM(dose.scheduledFor) === oldTime) {
        const [h, m] = newTime.split(':').map(Number);
        const d = new Date(dose.scheduledFor);
        d.setHours(h, m, 0, 0);
        dose.scheduledFor = d.toISOString();
      }
    }
    return Promise.resolve();
  },
  getRefillStatuses: () => Promise.resolve(mockRefillStatuses),
};
