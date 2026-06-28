-- Initial schema. IF NOT EXISTS so it's safe on a database that already has
-- these tables (e.g. created by the pre-migration ensureSchema in MR-19).
CREATE TABLE IF NOT EXISTS medications (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  pills_at_pickup       DOUBLE PRECISION NOT NULL,
  last_pickup_date      TEXT NOT NULL,
  doses_per_day         DOUBLE PRECISION NOT NULL,
  refill_lead_time_days INTEGER NOT NULL,
  schedule              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doses (
  medication_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  taken_at      TEXT,
  PRIMARY KEY (medication_id, scheduled_for)
);
