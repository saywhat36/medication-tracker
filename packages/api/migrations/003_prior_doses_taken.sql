-- Doses already taken since pickup, entered at registration, so the pill count
-- starts accurate even for prescriptions picked up before app tracking began.
ALTER TABLE medications ADD COLUMN IF NOT EXISTS prior_doses_taken INTEGER NOT NULL DEFAULT 0;
