-- Records which doses we've already sent an overdue reminder for, so a fresh
-- one-shot sweep (e.g. a GitHub Actions cron) doesn't re-notify the same dose.
CREATE TABLE IF NOT EXISTS dose_notifications (
  dose_key    TEXT PRIMARY KEY,   -- "<medicationId>:<scheduledFor>"
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
