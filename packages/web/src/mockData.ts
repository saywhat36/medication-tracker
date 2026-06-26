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

export const mockDueDoses: Dose[] = [
  {
    medicationId: 'med-1',
    scheduledFor: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    takenAt: null,
  },
];

export const mockRefillStatuses: RefillStatus[] = [
  { medicationId: 'med-1', pillsRemaining: 30, daysUntilRefill: 23, refillDate: '2026-07-18' },
  { medicationId: 'med-2', pillsRemaining: 10, daysUntilRefill: 3, refillDate: '2026-06-28' },
];

export const mockClient = {
  getMedications: () => Promise.resolve(mockMedications),
  getDueDoses: () => Promise.resolve(mockDueDoses),
  markTaken: (_medicationId: string, scheduledFor: string) => {
    const dose = mockDueDoses.find((d) => d.scheduledFor === scheduledFor);
    if (dose) dose.takenAt = new Date().toISOString();
    return Promise.resolve();
  },
  addMedication: (data: Omit<Medication, 'id'>) => {
    const med: Medication = { id: `med-mock-${Date.now()}`, ...data };
    mockMedications.push(med);
    return Promise.resolve(med);
  },
  getRefillStatuses: () => Promise.resolve(mockRefillStatuses),
};
