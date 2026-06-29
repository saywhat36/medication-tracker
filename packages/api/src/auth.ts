import { timingSafeEqual } from 'node:crypto';
import type express from 'express';

// Constant-time string comparison (avoids leaking length/content via timing).
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Bearer-token auth. If no token is configured, auth is disabled (all requests
// allowed) — handy for local dev. In production, set API_TOKEN to enforce it.
export function createAuthMiddleware(token?: string): express.RequestHandler {
  if (!token) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (safeEqual(provided, token)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized' });
  };
}
