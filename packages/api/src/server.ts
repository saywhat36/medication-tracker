import { randomUUID } from 'node:crypto';
import express from 'express';
import { isOverdue, dateInZone } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';
import { createAuthMiddleware } from './auth.js';

// Wrap an async handler so a rejected promise is forwarded to Express's error
// middleware (a 500) instead of leaving the request hanging.
type AsyncHandler = (req: express.Request, res: express.Response) => Promise<void>;
function asyncHandler(fn: AsyncHandler): express.RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export function createServer(
  repo: MedicationRepository,
  now: () => string = () => new Date().toISOString(),
  apiToken?: string,
  timeZone = 'UTC'
): express.Application {
  const today = () => dateInZone(now(), timeZone);
  const app = express();
  app.use(express.json());

  // Public, unauthenticated — used by the container healthcheck.
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
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
        dosesPerDay: number;
        refillLeadTimeDays: number;
        schedule: string[];
      };
      const med = { id: randomUUID(), ...body };
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
