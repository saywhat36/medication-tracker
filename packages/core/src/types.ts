export interface Medication {
  id: string;
  name: string;
  pillsAtPickup: number;         // pills collected at last prescription pickup
  lastPickupDate: string;        // ISO date of that pickup, e.g. "2026-06-25"
  priorDosesTaken?: number;      // doses already taken since pickup before app tracking (default 0)
  dosesPerDay: number;           // doses taken each day (must be > 0)
  refillLeadTimeDays: number;    // days before running out to reorder
  schedule: string[];            // times of day, 24h, e.g. ["08:00", "21:00"]
  recipientEmail?: string | null; // who takes this medication, for dose reminders (optional)
  recipientName?: string | null;  // first name, used in companion emails, e.g. "Sarah needs to take..."
  companionEmails?: string[];     // others notified if a dose is missed (optional, default [])
}

export interface Dose {
  medicationId: string;
  scheduledFor: string;          // ISO timestamp the dose is due
  takenAt: string | null;        // ISO timestamp when ticked off, else null
}

export interface RefillStatus {
  medicationId: string;
  pillsRemaining: number;        // computed: pills left as of today
  daysUntilRefill: number;       // may be negative (already overdue to reorder)
  runOutDate: string;            // ISO date the pills are expected to run out
  refillDate: string;            // ISO date to reorder by (when a reminder is due)
}
