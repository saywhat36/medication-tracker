export interface Medication {
  id: string;
  name: string;
  pillsRemaining: number;
  dosesPerDay: number;
  refillLeadTimeDays: number;
  schedule: string[];
}

export interface Dose {
  medicationId: string;
  scheduledFor: string;
  takenAt: string | null;
}
