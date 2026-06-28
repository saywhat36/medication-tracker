import { timingSafeEqual } from 'node:crypto';
import type express from 'express';

// Bearer-token auth. If no token is configured, auth is disabled (all requests
// allowed) — handy for local dev. In production, set API_TOKEN to enforce it.
export function createAuthMiddleware(token?: string): express.RequestHandler {
  if (!token) {
    return (_req, _res, next) => next();
  }

  const expected = Buffer.from(token);

  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    const providedBuf = Buffer.from(provided);

    // timingSafeEqual requires equal-length buffers, so check length first.
    if (providedBuf.length === expected.length && timingSafeEqual(providedBuf, expected)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized' });
  };
}
