import type { Medication, Dose, RefillStatus } from '@medication-tracker/core';

export const mockMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformin',
    pillsRemaining: 30,
    dosesPerDay: 1,
    refillLeadTimeDays: 7,
    schedule: ['08:00'],
  },
  {
    id: 'med-2',
    name: 'Lisinopril',
    pillsRemaining: 10,
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
  { medicationId: 'med-1', daysUntilRefill: 23, refillDate: '2026-07-18' },
  { medicationId: 'med-2', daysUntilRefill: 3, refillDate: '2026-06-28' },
];

export const mockClient = {
  getMedications: () => Promise.resolve(mockMedications),
  getDueDoses: () => Promise.resolve(mockDueDoses),
  markTaken: (_medicationId: string, scheduledFor: string) => {
    const dose = mockDueDoses.find((d) => d.scheduledFor === scheduledFor);
    if (dose) dose.takenAt = new Date().toISOString();
    return Promise.resolve();
  },
  getRefillStatuses: () => Promise.resolve(mockRefillStatuses),
};
