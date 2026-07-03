import type { EmailSender } from './emailSender.js';

export interface Notifier {
  send(message: string): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  async send(message: string): Promise<void> {
    console.log(`[sweep] ${new Date().toISOString()} ${message}`);
  }
}

// Wraps an EmailSender as a single-target Notifier — the operator channel for
// refill reminders and the overdue fallback (medications without their own
// recipientEmail configured). See emailSender.ts for the per-recipient sender
// used for the richer, medication-specific reminder/missed/taken emails.
export class EmailNotifier implements Notifier {
  private readonly sender: EmailSender;
  private readonly to: string;

  constructor(sender: EmailSender, to: string) {
    this.sender = sender;
    this.to = to;
  }

  async send(message: string): Promise<void> {
    await this.sender.send(this.to, 'Medication Tracker', message);
  }
}
