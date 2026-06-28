import { createRepository } from './createRepository.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const repo = await createRepository();
  const port = Number(process.env['PORT'] ?? 3000);
  createServer(repo).listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });
}

void main();
