import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { isOverdue, dateInZone } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';
import { createAuthMiddleware, safeEqual } from './auth.js';

// Wrap an async handler so a rejected promise is forwarded to Express's error
// middleware (a 500) instead of leaving the request hanging.
type AsyncHandler = (req: express.Request, res: express.Response) => Promise<void>;
function asyncHandler(fn: AsyncHandler): express.RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export interface ServerOptions {
  apiToken?: string; // bearer token required on data routes (auth off if unset)
  timeZone?: string; // zone for resolving "today" (default UTC)
  appPassword?: string; // password the /login endpoint checks
  corsOrigin?: string; // allowed browser origin (any if unset)
}

export function createServer(
  repo: MedicationRepository,
  now: () => string = () => new Date().toISOString(),
  options: ServerOptions = {}
): express.Application {
  const { apiToken, timeZone = 'UTC', appPassword, corsOrigin } = options;
  const today = () => dateInZone(now(), timeZone);
  const app = express();
  // Allow the browser to call the API cross-origin (e.g. the Pages site). Lock to
  // corsOrigin when set, otherwise reflect any origin (access still needs the token).
  app.use(cors({ origin: corsOrigin ?? true, allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json());

  // Public, unauthenticated — used by the container healthcheck.
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public — exchange the app password for the bearer token. The token is never
  // shipped in the web bundle; the browser only gets it after a correct password.
  app.post('/login', (req, res) => {
    const { password } = req.body as { password?: string };
    if (appPassword && apiToken && typeof password === 'string' && safeEqual(password, appPassword)) {
      res.json({ token: apiToken });
      return;
    }
    res.status(401).json({ error: 'Invalid password' });
  });

  // Everything below requires the bearer token (unless none is configured).
  app.use(createAuthMiddleware(apiToken));

  app.get(
    '/medications',
    asyncHandler(async (_req, res) => {
      res.json(await repo.listMedications());
    })
  );

  app.post(
    '/medications',
    asyncHandler(async (req, res) => {
      const body = req.body as {
        name: string;
        pillsAtPickup: number;
        lastPickupDate: string;
        priorDosesTaken?: number;
        dosesPerDay: number;
        refillLeadTimeDays: number;
        schedule: string[];
        recipientEmail?: string | null;
        recipientName?: string | null;
        companionEmails?: string[];
      };
      const med = { id: randomUUID(), priorDosesTaken: 0, ...body };
      await repo.addMedication(med);
      await repo.ensureDosesForDay(today());
      res.status(201).json(med);
    })
  );

  app.patch(
    '/medications/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { oldTime, newTime } = req.body as { oldTime: string; newTime: string };
      const fromDate = today();
      try {
        await repo.rescheduleMedication(id, oldTime, newTime, fromDate);
        res.json({ id, oldTime, newTime });
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  app.put(
    '/medications/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const body = req.body as {
        name: string;
        pillsAtPickup: number;
        lastPickupDate: string;
        priorDosesTaken?: number;
        dosesPerDay: number;
        refillLeadTimeDays: number;
        schedule: string[];
        recipientEmail?: string | null;
        recipientName?: string | null;
        companionEmails?: string[];
      };
      const med = { id, priorDosesTaken: 0, ...body };
      try {
        await repo.updateMedication(med);
        res.json(med);
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  app.delete(
    '/medications/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        await repo.deleteMedication(id);
        res.json({ id });
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  app.get(
    '/doses/due',
    asyncHandler(async (req, res) => {
      const at = (req.query['now'] as string | undefined) ?? now();
      res.json(await repo.getDueDoses(at));
    })
  );

  app.get(
    '/doses/today',
    asyncHandler(async (req, res) => {
      const date = (req.query['date'] as string | undefined) ?? today();
      // ensure (not just get) so each medication's scheduled doses exist for the
      // day — this is what makes doses appear every day, not only on the add day.
      res.json(await repo.ensureDosesForDay(date));
    })
  );

  app.post(
    '/doses/taken',
    asyncHandler(async (req, res) => {
      const { medicationId, scheduledFor } = req.body as {
        medicationId: string;
        scheduledFor: string;
      };
      const takenAt = now();
      try {
        await repo.markTaken(medicationId, scheduledFor, takenAt);
        res.json({ medicationId, scheduledFor, takenAt });
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  app.delete(
    '/doses/taken',
    asyncHandler(async (req, res) => {
      const { medicationId, scheduledFor } = req.body as {
        medicationId: string;
        scheduledFor: string;
      };
      try {
        await repo.markUntaken(medicationId, scheduledFor);
        res.json({ medicationId, scheduledFor, takenAt: null });
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  app.get(
    '/refill-status',
    asyncHandler(async (_req, res) => {
      res.json(await repo.getRefillStatuses(today()));
    })
  );

  app.post(
    '/sweep',
    asyncHandler(async (_req, res) => {
      const current = now();
      const dueDoses = await repo.getDueDoses(current);
      const overdueDoses = dueDoses.filter((d) => isOverdue(d, current));
      res.json({ checked: current, overdueDoses });
    })
  );

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  );

  return app;
}
