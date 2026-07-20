-- Optional apothecary-shop-view customization: a custom bottle color, and
-- per-pill customizations (emoji/label/color/drawing) stored as a JSON
-- string, consistent with how companion_emails is stored.
ALTER TABLE medications ADD COLUMN IF NOT EXISTS custom_bottle_color TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS pill_customizations TEXT;
