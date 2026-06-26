import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from './server.js';
import { InMemoryMedicationRepository } from './inMemoryRepository.js';

const MED = {
  id: 'med-1',
  name: 'Metformin',
  pillsAtPickup: 30,
  lastPickupDate: '2026-06-25',
  dosesPerDay: 1,
  refillLeadTimeDays: 7,
  schedule: ['08:00'],
};

// A dose that was due 4 hours ago (overdue past the 3h default threshold)
const OVERDUE_DOSE = { medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z', takenAt: null };
// A dose due in the future
const FUTURE_DOSE = { medicationId: 'med-1', scheduledFor: '2026-06-25T21:00:00Z', takenAt: null };

const FIXED_NOW = '2026-06-25T12:00:00Z'; // 4h after OVERDUE_DOSE

function makeApp() {
  const repo = new InMemoryMedicationRepository([MED], [OVERDUE_DOSE, FUTURE_DOSE]);
  return createServer(repo, () => FIXED_NOW);
}

describe('GET /medications', () => {
  it('returns the medication list', async () => {
    const res = await request(makeApp()).get('/medications');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('med-1');
  });
});

describe('POST /medications', () => {
  it('creates a medication and returns 201 with an id', async () => {
    const repo = new InMemoryMedicationRepository([], []);
    const app = createServer(repo, () => FIXED_NOW);
    const res = await request(app).post('/medications').send({
      name: 'Aspirin',
      pillsAtPickup: 60,
      lastPickupDate: '2026-06-25',
      dosesPerDay: 1,
      refillLeadTimeDays: 5,
      schedule: ['09:00'],
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Aspirin');
    expect(typeof res.body.id).toBe('string');
  });

  it('creates doses for today based on the schedule', async () => {
    const repo = new InMemoryMedicationRepository([], []);
    const app = createServer(repo, () => FIXED_NOW);
    await request(app).post('/medications').send({
      name: 'Aspirin',
      pillsAtPickup: 60,
      lastPickupDate: '2026-06-25',
      dosesPerDay: 1,
      refillLeadTimeDays: 5,
      schedule: ['09:00'],
    });
    const due = await request(app).get('/doses/due');
    expect(due.body).toHaveLength(1);
    expect(due.body[0].scheduledFor).toBe('2026-06-25T09:00:00Z');
  });
});

describe('PATCH /medications/:id', () => {
  it('reschedules the medication, moving today\'s untaken dose to the new time', async () => {
    const app = makeApp();
    const res = await request(app)
      .patch('/medications/med-1')
      .send({ oldTime: '08:00', newTime: '10:00' });
    expect(res.status).toBe(200);

    const today = await request(app).get('/doses/today?date=2026-06-25');
    const times = today.body.map((d: { scheduledFor: string }) => d.scheduledFor);
    expect(times).toContain('2026-06-25T10:00:00Z');
    expect(times).not.toContain('2026-06-25T08:00:00Z');
  });

  it('returns 404 when the medication does not exist', async () => {
    const res = await request(makeApp())
      .patch('/medications/nope')
      .send({ oldTime: '08:00', newTime: '10:00' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /medications/:id', () => {
  it('deletes the medication and its doses', async () => {
    const app = makeApp();
    const res = await request(app).delete('/medications/med-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('med-1');

    const meds = await request(app).get('/medications');
    expect(meds.body).toHaveLength(0);
    const today = await request(app).get('/doses/today?date=2026-06-25');
    expect(today.body).toHaveLength(0);
  });

  it('returns 404 when the medication does not exist', async () => {
    const res = await request(makeApp()).delete('/medications/nope');
    expect(res.status).toBe(404);
  });
});

describe('GET /doses/due', () => {
  it('returns doses due at the injected now by default', async () => {
    const res = await request(makeApp()).get('/doses/due');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
  });

  it('accepts an explicit ?now= override', async () => {
    const res = await request(makeApp()).get('/doses/due?now=2026-06-25T07:00:00Z');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /doses/taken', () => {
  it('marks a dose taken and returns the recorded takenAt', async () => {
    const res = await request(makeApp())
      .post('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.takenAt).toBe(FIXED_NOW);
  });

  it('returns 404 when the dose does not exist', async () => {
    const res = await request(makeApp())
      .post('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T99:00:00Z' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /doses/taken', () => {
  it('un-marks a previously taken dose so it is due again', async () => {
    const app = makeApp();
    await request(app)
      .post('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z' });

    const res = await request(app)
      .delete('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.takenAt).toBeNull();

    const due = await request(app).get('/doses/due');
    expect(due.body).toHaveLength(1);
    expect(due.body[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
  });

  it('returns 404 when the dose does not exist', async () => {
    const res = await request(makeApp())
      .delete('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T99:00:00Z' });
    expect(res.status).toBe(404);
  });
});

describe('GET /doses/today', () => {
  it('returns all of today\'s doses including taken ones', async () => {
    const app = makeApp();
    await request(app)
      .post('/doses/taken')
      .send({ medicationId: 'med-1', scheduledFor: '2026-06-25T08:00:00Z' });

    const res = await request(app).get('/doses/today?date=2026-06-25');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const taken = res.body.find((d: { scheduledFor: string }) => d.scheduledFor === '2026-06-25T08:00:00Z');
    expect(taken.takenAt).toBe(FIXED_NOW);
  });

  it('defaults to the injected now date when no ?date= is given', async () => {
    const res = await request(makeApp()).get('/doses/today');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('materialises doses from the schedule for a day that has none yet', async () => {
    // med-1 is scheduled at 08:00; no doses exist for 2026-06-28 until requested.
    const res = await request(makeApp()).get('/doses/today?date=2026-06-28');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].scheduledFor).toBe('2026-06-28T08:00:00Z');
    expect(res.body[0].takenAt).toBeNull();
  });
});

describe('GET /refill-status', () => {
  it('returns refill status for all medications', async () => {
    const res = await request(makeApp()).get('/refill-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].medicationId).toBe('med-1');
    expect(res.body[0].pillsRemaining).toBe(30);
    expect(res.body[0].daysUntilRefill).toBe(23);
    expect(res.body[0].refillDate).toBe('2026-07-18');
  });
});

describe('POST /sweep', () => {
  it('reports overdue doses without notifying', async () => {
    const res = await request(makeApp()).post('/sweep');
    expect(res.status).toBe(200);
    expect(res.body.checked).toBe(FIXED_NOW);
    expect(res.body.overdueDoses).toHaveLength(1);
    expect(res.body.overdueDoses[0].scheduledFor).toBe('2026-06-25T08:00:00Z');
  });

  it('reports nothing when no doses are overdue', async () => {
    const repo = new InMemoryMedicationRepository([MED], [FUTURE_DOSE]);
    const app = createServer(repo, () => FIXED_NOW);
    const res = await request(app).post('/sweep');
    expect(res.status).toBe(200);
    expect(res.body.overdueDoses).toHaveLength(0);
  });
});
