-- Neon All-in-One Bootstrap
-- Generated on 2026-05-19 11:13:57


-- ===== BEGIN whatsapp-bot/setup/setup/01_schema.sql =====

-- =============================================================
--  WhatsApp AI Business Bot — Database Schema
--  Run this first against your local PostgreSQL database.
--  Usage:  psql -U postgres -d whatsapp_bot -f 01_schema.sql
-- =============================================================

-- 1. businesses
CREATE TABLE IF NOT EXISTS businesses (
  id                        SERIAL PRIMARY KEY,
  name                      TEXT NOT NULL DEFAULT 'My Business',
  whatsapp_phone_number_id  TEXT UNIQUE,
  whatsapp_access_token     TEXT,
  verify_token              TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. customers  (one per business+phone pair)
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  name        TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  flow_state  TEXT,
  flow_data   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_business_phone_uniq UNIQUE (business_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);

-- 3. faqs
CREATE TABLE IF NOT EXISTS faqs (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  hit_count   INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faqs_business_id ON faqs(business_id);

-- 4. services
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2),
  duration    INTEGER,
  category    TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);

-- 5. bookings
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service        TEXT,
  requested_date TEXT,
  requested_time TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);

-- 6. bot_messages
CREATE TABLE IF NOT EXISTS bot_messages (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  content     TEXT NOT NULL,
  reply_type  TEXT NOT NULL DEFAULT 'none'
                CHECK (reply_type IN ('faq','service','booking','ai','none')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bot_messages_business_id ON bot_messages(business_id);

-- 7. ai_usage
CREATE TABLE IF NOT EXISTS ai_usage (
  id                SERIAL PRIMARY KEY,
  business_id       INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  prompt            TEXT NOT NULL,
  response          TEXT NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  estimated_cost    NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_business_id ON ai_usage(business_id);

-- 8. settings  (one row per business)
CREATE TABLE IF NOT EXISTS settings (
  id             SERIAL PRIMARY KEY,
  business_id    INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  business_name  TEXT NOT NULL DEFAULT 'My Business',
  business_type  TEXT NOT NULL DEFAULT 'general',
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  website        TEXT,
  opening_hours  TEXT,
  description    TEXT,
  no_match_message TEXT,
  ai_fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_menu_message TEXT,
  welcome_menu_options TEXT,
  booking_flow_cancel_message TEXT,
  payment_methods TEXT,
  staff_contact_message TEXT,
  currency       TEXT NOT NULL DEFAULT 'USD',
  custom_ai_prompt TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper: auto-update updated_at columns
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_businesses') THEN
    CREATE TRIGGER set_updated_at_businesses BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_customers') THEN
    CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_faqs') THEN
    CREATE TRIGGER set_updated_at_faqs BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_services') THEN
    CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_bookings') THEN
    CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_settings') THEN
    CREATE TRIGGER set_updated_at_settings BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- Done
\echo 'Schema created successfully.'

-- ===== END whatsapp-bot/setup/setup/01_schema.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/03_admin_users.sql =====

CREATE TABLE IF NOT EXISTS admin_users (
  id                      SERIAL PRIMARY KEY,
  email                   TEXT NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  name                    TEXT,
  reset_token_hash        TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== END whatsapp-bot/setup/setup/03_admin_users.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/04_seed_admin_tarang.sql =====

CREATE TABLE IF NOT EXISTS admin_users (
  id                      SERIAL PRIMARY KEY,
  email                   TEXT NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  name                    TEXT,
  reset_token_hash        TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'tarang@test.com',
  '$2a$10$hFl6YhDH.oOjkuj9KxPrvOVleY7wiF1s.fokIcW33fOHpryRu0OVK',
  'Tarang'
)
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  updated_at = NOW();

-- ===== END whatsapp-bot/setup/setup/04_seed_admin_tarang.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/05_business_admin_access_example.sql =====

-- Example: create/update a business_admin and grant access to exactly one business.
-- Run after 00_all_tables.sql.
--
-- Usage:
-- psql -U postgres -d whatsapp_bot -f ".\setup\setup\05_business_admin_access_example.sql"

-- 1) Ensure business exists (change id/name as needed)
INSERT INTO businesses (id, name, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_verify_token)
VALUES (2, 'Salon Owner Business', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2) Create or upgrade admin user role = business_admin
-- Password hash below is for: Owner@123
INSERT INTO admin_users (email, password_hash, role, name)
VALUES (
  'owner@salon.com',
  '$2a$10$WfE7pEes8N8J7L4f6g9ZluAOQY2r4L16SQ6Q8nFiW2Jkk58I.4gci',
  'business_admin',
  'Salon Owner'
)
ON CONFLICT (email) DO UPDATE
SET
  role = 'business_admin',
  name = EXCLUDED.name,
  updated_at = NOW();

-- 3) Map this user to one business only
INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, 2
FROM admin_users u
WHERE u.email = 'owner@salon.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

-- ===== END whatsapp-bot/setup/setup/05_business_admin_access_example.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/08_seed_business_owners.sql =====

-- Add business owners and map each to one business
-- Password for all below users: tarang@123

INSERT INTO admin_users (email, password_hash, role, name)
VALUES
  ('owner@fitnes.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Fitness Owner'),
  ('owner@restaurant.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Restaurant Owner'),
  ('owner@coaching.com', '$2a$10$Z9i4l8s9oQ8n8mS8O2v4He0iR2m8Wf5S5Qk6n3J4y4m5z6A7b8c9K', 'business_admin', 'Coaching Owner')
ON CONFLICT (email) DO UPDATE
SET
  role = 'business_admin',
  name = EXCLUDED.name,
  updated_at = NOW();

DELETE FROM user_business_access
WHERE user_id IN (
  SELECT id FROM admin_users
  WHERE email IN ('owner@fitnes.com', 'owner@restaurant.com', 'owner@coaching.com')
);

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Fitness Gym'
WHERE u.email = 'owner@fitnes.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Restaurant'
WHERE u.email = 'owner@restaurant.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

INSERT INTO user_business_access (user_id, business_id)
SELECT u.id, b.id
FROM admin_users u
JOIN businesses b ON b.name = 'Coaching Center'
WHERE u.email = 'owner@coaching.com'
ON CONFLICT (user_id, business_id) DO NOTHING;

-- ===== END whatsapp-bot/setup/setup/08_seed_business_owners.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/09_add_no_match_message.sql =====

-- Adds per-business safe fallback message for no-match cases
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS no_match_message text;


-- ===== END whatsapp-bot/setup/setup/09_add_no_match_message.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/10_add_ai_fallback_enabled.sql =====

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS ai_fallback_enabled boolean NOT NULL DEFAULT true;


-- ===== END whatsapp-bot/setup/setup/10_add_ai_fallback_enabled.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/11_add_welcome_menu_message.sql =====

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS welcome_menu_message text;

-- ===== END whatsapp-bot/setup/setup/11_add_welcome_menu_message.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/12_add_guided_menu_columns.sql =====

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

-- ===== END whatsapp-bot/setup/setup/12_add_guided_menu_columns.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/13_add_greeting_keywords.sql =====

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS greeting_keywords TEXT;

-- ===== END whatsapp-bot/setup/setup/13_add_greeting_keywords.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/14_add_reminder_settings.sql =====

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 60;

-- ===== END whatsapp-bot/setup/setup/14_add_reminder_settings.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/15_add_booking_reminder_columns.sql =====

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- ===== END whatsapp-bot/setup/setup/15_add_booking_reminder_columns.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/16_add_reminder_template.sql =====

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS reminder_message_template text;

-- ===== END whatsapp-bot/setup/setup/16_add_reminder_template.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/17_add_booking_flow_cancel_message.sql =====

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS booking_flow_cancel_message TEXT;

-- ===== END whatsapp-bot/setup/setup/17_add_booking_flow_cancel_message.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/18_add_processed_inbound.sql =====

CREATE TABLE IF NOT EXISTS processed_inbound (
  id BIGSERIAL PRIMARY KEY,
  business_id INT NOT NULL,
  phone TEXT NOT NULL,
  message_id TEXT NOT NULL,
  message_ts BIGINT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, phone, message_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_inbound_received_at
  ON processed_inbound (received_at);


-- ===== END whatsapp-bot/setup/setup/18_add_processed_inbound.sql =====


-- ===== BEGIN whatsapp-bot/setup/setup/02_sample_data.sql =====

