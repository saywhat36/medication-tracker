// Separate from Notifier (a single-target broadcast channel) because dose
// reminders address a different recipient per medication — the sender needs
// a "to" on every call, not just a message.
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class ResendEmailSender implements EmailSender {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  static fromEnv(): ResendEmailSender {
    const apiKey = process.env['RESEND_API_KEY'];
    if (!apiKey) {
      throw new Error('RESEND_API_KEY must be set. See .env.example for setup instructions.');
    }
    // onboarding@resend.dev works without verifying a domain — fine to start
    // with; set RESEND_FROM_EMAIL once you've verified your own domain.
    const from = process.env['RESEND_FROM_EMAIL'] || 'Medication Tracker <onboarding@resend.dev>';
    return new ResendEmailSender(apiKey, from);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to, subject, text: body }),
    });
    if (!res.ok) {
      const responseBody = await res.text();
      throw new Error(`Resend API error ${res.status}: ${responseBody}`);
    }
  }
}
