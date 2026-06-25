import { randomUUID } from 'node:crypto';
import express from 'express';
import { isOverdue } from '@medication-tracker/core';
import type { MedicationRepository } from './repository.js';

export function createServer(
  repo: MedicationRepository,
  now: () => string = () => new Date().toISOString()
): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/medications', (_req, res) => {
    res.json(repo.listMedications());
  });

  app.post('/medications', (req, res) => {
    const body = req.body as {
      name: string;
      pillsRemaining: number;
      dosesPerDay: number;
      refillLeadTimeDays: number;
      schedule: string[];
    };
    const med = { id: randomUUID(), ...body };
    repo.addMedication(med);
    const today = now().slice(0, 10);
    const todaysDoses = med.schedule.map((time) => ({
      medicationId: med.id,
      scheduledFor: `${today}T${time}:00Z`,
      takenAt: null,
    }));
    repo.addDoses(todaysDoses);
    res.status(201).json(med);
  });

  app.get('/doses/due', (req, res) => {
    const at = (req.query['now'] as string | undefined) ?? now();
    res.json(repo.getDueDoses(at));
  });

  app.post('/doses/taken', (req, res) => {
    const { medicationId, scheduledFor } = req.body as {
      medicationId: string;
      scheduledFor: string;
    };
    const takenAt = now();
    try {
      repo.markTaken(medicationId, scheduledFor, takenAt);
      res.json({ medicationId, scheduledFor, takenAt });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.get('/refill-status', (_req, res) => {
    const today = now().slice(0, 10);
    res.json(repo.getRefillStatuses(today));
  });

  app.post('/sweep', (_req, res) => {
    const current = now();
    const dueDoses = repo.getDueDoses(current);
    const overdueDoses = dueDoses.filter((d) => isOverdue(d, current));
    res.json({ checked: current, overdueDoses });
  });

  return app;
}
