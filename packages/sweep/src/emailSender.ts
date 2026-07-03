import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Separate from Notifier (a single-target broadcast channel) because dose
// reminders address a different recipient per medication — the sender needs
// a "to" on every call, not just a message.
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Sends via a real Gmail account over SMTP, using an App Password rather than
// the account password. Unlike ResendEmailSender's default sandbox sender,
// this can deliver to any recipient immediately — no domain to verify — since
// it's genuinely sending as your own already-trusted Gmail address. The
// tradeoff is Gmail's own sending limits (roughly 500/day), which is far more
// than this app needs.
export class GmailSmtpSender implements EmailSender {
  // Narrowed to just the method used, so a test can inject a fake without
  // depending on nodemailer's full Transporter shape.
  private readonly transporter: Pick<Transporter, 'sendMail'>;
  private readonly from: string;

  constructor(transporter: Pick<Transporter, 'sendMail'>, from: string) {
    this.transporter = transporter;
    this.from = from;
  }

  static fromEnv(): GmailSmtpSender {
    const user = process.env['GMAIL_USER'];
    const pass = process.env['GMAIL_APP_PASSWORD'];
    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set. See .env.example for setup instructions.');
    }
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    return new GmailSmtpSender(transporter, user);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, text: body });
  }
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

// Gmail (free, sends to any recipient immediately) takes priority over Resend
// (blocked to your own address until you verify a domain — see .env.example)
// when both happen to be configured. Shared by scheduler.ts and run-once.ts.
export function emailSenderFromEnv(): EmailSender | undefined {
  if (process.env['GMAIL_USER'] && process.env['GMAIL_APP_PASSWORD']) return GmailSmtpSender.fromEnv();
  if (process.env['RESEND_API_KEY']) return ResendEmailSender.fromEnv();
  return undefined;
}
