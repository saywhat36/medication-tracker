-- Optional email of who a medication is for (dose reminders), and a list of
-- others who want to be told if it's missed. Both default to "nobody" so
-- existing medications are unaffected until someone opts in.
ALTER TABLE medications ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS companion_emails TEXT NOT NULL DEFAULT '[]';
