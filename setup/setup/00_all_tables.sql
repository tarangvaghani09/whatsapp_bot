-- One-shot setup: creates/updates all required tables for this project.
-- Run with:
-- psql -U postgres -d whatsapp_bot -f ".\setup\setup\00_all_tables.sql"

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Auth: admin users
-- =========================
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

-- Ensure old admin_users tables are upgraded with auth-reset columns.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Optional default admin from your request (upsert).
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

-- =========================
-- Core app schema
-- =========================
\i ./setup/setup/01_schema.sql

