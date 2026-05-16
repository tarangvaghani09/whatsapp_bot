ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
