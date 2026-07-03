import { describe, it, expect, vi } from 'vitest';
import { GmailSmtpSender } from './emailSender.js';

describe('GmailSmtpSender', () => {
  it('sends via the injected transporter with from/to/subject/text', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const sender = new GmailSmtpSender({ sendMail }, 'sarah@gmail.com');
    await sender.send('gavin@example.com', 'Reminder: Fluoxetine is due', 'Sarah needs to take Fluoxetine.');
    expect(sendMail).toHaveBeenCalledWith({
      from: 'sarah@gmail.com',
      to: 'gavin@example.com',
      subject: 'Reminder: Fluoxetine is due',
      text: 'Sarah needs to take Fluoxetine.',
    });
  });

  it('propagates a send failure rather than swallowing it', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP auth failed'));
    const sender = new GmailSmtpSender({ sendMail }, 'sarah@gmail.com');
    await expect(sender.send('gavin@example.com', 'subject', 'body')).rejects.toThrow('SMTP auth failed');
  });

  describe('fromEnv', () => {
    it('throws a clear error when GMAIL_USER or GMAIL_APP_PASSWORD is missing', () => {
      const original = { ...process.env };
      delete process.env['GMAIL_USER'];
      delete process.env['GMAIL_APP_PASSWORD'];
      expect(() => GmailSmtpSender.fromEnv()).toThrow('GMAIL_USER and GMAIL_APP_PASSWORD must be set');
      process.env = original;
    });
  });
});
