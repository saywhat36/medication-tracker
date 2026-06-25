import type { Notifier } from './notifier.js';

export class TelegramNotifier implements Notifier {
  private readonly token: string;
  private readonly chatId: string;

  constructor(token: string, chatId: string) {
    this.token = token;
    this.chatId = chatId;
  }

  static fromEnv(): TelegramNotifier {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    const chatId = process.env['TELEGRAM_CHAT_ID'];
    if (!token || !chatId) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set. ' +
          'See .env.example for setup instructions.'
      );
    }
    return new TelegramNotifier(token, chatId);
  }

  async send(message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text: message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram API error ${res.status}: ${body}`);
    }
  }
}
