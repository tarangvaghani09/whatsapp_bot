-- Adds per-business safe fallback message for no-match cases
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS no_match_message text;

