-- ============================================================
-- WhatsApp AI Business Bot — PostgreSQL Schema
-- Run this FIRST before sample-data.sql
-- Usage: psql -U postgres -d whatsapp_bot -f db-schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── businesses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id                        SERIAL PRIMARY KEY,
  name                      TEXT NOT NULL DEFAULT 'My Business',
  whatsapp_phone_number_id  TEXT UNIQUE,
  whatsapp_access_token     TEXT,
  verify_token              TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── customers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone        TEXT NOT NULL,
  name         TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_business_phone_uniq ON customers(business_id, phone);

-- ── faqs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  hit_count    INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faqs_business_id ON faqs(business_id);

-- ── services ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2),
  duration     INTEGER,
  category     TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);

-- ── bookings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service         TEXT,
  requested_date  TEXT,
  requested_time  TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  rating          INTEGER,
  rating_asked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);

-- ── bot_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_messages (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  direction    TEXT NOT NULL,
  content      TEXT NOT NULL,
  reply_type   TEXT NOT NULL DEFAULT 'none',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bot_messages_business_id ON bot_messages(business_id);

-- ── ai_usage ─────────────────────────────────────────────────
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

-- ── settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id               SERIAL PRIMARY KEY,
  business_id      INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  business_name    TEXT NOT NULL DEFAULT 'My Business',
  business_type    TEXT NOT NULL DEFAULT 'general',
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  website          TEXT,
  opening_hours    TEXT,
  description      TEXT,
  currency         TEXT NOT NULL DEFAULT 'USD',
  custom_ai_prompt TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── canned_responses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canned_responses (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canned_responses_business_id ON canned_responses(business_id);

-- ── conversations (AI canvas) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── messages (AI canvas) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── auto-update trigger for updated_at ───────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['businesses','customers','faqs','services','bookings','bot_messages','settings']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;

SELECT 'Schema created successfully ✓' AS status;
