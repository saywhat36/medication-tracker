-- The recipient's first name, so companion emails can say "Sarah needs to
-- take her Fluoxetine" instead of an impersonal "the recipient". Optional —
-- companion wording falls back to "The recipient" when unset.
ALTER TABLE medications ADD COLUMN IF NOT EXISTS recipient_name TEXT;
