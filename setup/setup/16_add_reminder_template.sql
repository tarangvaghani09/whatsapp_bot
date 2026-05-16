ALTER TABLE settings
ADD COLUMN IF NOT EXISTS reminder_message_template text;
