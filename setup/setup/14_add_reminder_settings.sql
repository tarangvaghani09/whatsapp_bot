ALTER TABLE settings
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 60;
