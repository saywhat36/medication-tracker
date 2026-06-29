import { createRepository } from './createRepository.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const repo = await createRepository();
  const apiToken = process.env['API_TOKEN'];
  if (!apiToken) {
    console.warn('[api] API_TOKEN not set — auth disabled (all requests allowed)');
  }
  const port = Number(process.env['PORT'] ?? 3000);
  createServer(repo, undefined, {
    apiToken,
    timeZone: process.env['APP_TIMEZONE'] ?? 'UTC',
    appPassword: process.env['APP_PASSWORD'],
    corsOrigin: process.env['WEB_ORIGIN'],
  }).listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });
}

void main();
