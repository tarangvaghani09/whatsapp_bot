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
