ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS flow_state text,
ADD COLUMN IF NOT EXISTS flow_data text;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS no_match_message text,
ADD COLUMN IF NOT EXISTS ai_fallback_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS welcome_menu_message text,
ADD COLUMN IF NOT EXISTS welcome_menu_options text,
ADD COLUMN IF NOT EXISTS payment_methods text,
ADD COLUMN IF NOT EXISTS staff_contact_message text,
ADD COLUMN IF NOT EXISTS custom_ai_prompt text;
