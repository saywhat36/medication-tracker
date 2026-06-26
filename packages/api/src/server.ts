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
      pillsAtPickup: number;
      lastPickupDate: string;
      dosesPerDay: number;
      refillLeadTimeDays: number;
      schedule: string[];
    };
    const med = { id: randomUUID(), ...body };
    repo.addMedication(med);
    repo.ensureDosesForDay(now().slice(0, 10));
    res.status(201).json(med);
  });

  app.patch('/medications/:id', (req, res) => {
    const { id } = req.params;
    const { oldTime, newTime } = req.body as { oldTime: string; newTime: string };
    const fromDate = now().slice(0, 10);
    try {
      repo.rescheduleMedication(id, oldTime, newTime, fromDate);
      res.json({ id, oldTime, newTime });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.delete('/medications/:id', (req, res) => {
    const { id } = req.params;
    try {
      repo.deleteMedication(id);
      res.json({ id });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  app.get('/doses/due', (req, res) => {
    const at = (req.query['now'] as string | undefined) ?? now();
    res.json(repo.getDueDoses(at));
  });

  app.get('/doses/today', (req, res) => {
    const date = (req.query['date'] as string | undefined) ?? now().slice(0, 10);
    // ensure (not just get) so each medication's scheduled doses exist for the
    // day — this is what makes doses appear every day, not only on the add day.
    res.json(repo.ensureDosesForDay(date));
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

  app.delete('/doses/taken', (req, res) => {
    const { medicationId, scheduledFor } = req.body as {
      medicationId: string;
      scheduledFor: string;
    };
    try {
      repo.markUntaken(medicationId, scheduledFor);
      res.json({ medicationId, scheduledFor, takenAt: null });
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
