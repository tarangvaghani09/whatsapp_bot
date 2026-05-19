-- Neon Quick Setup (safe to run multiple times)
-- Use this in Neon SQL Editor for production bootstrap extras.
-- Note: Core schema should already be created from 01_schema.sql.

BEGIN;

-- 1) Inbound webhook dedupe (prevents duplicate reply bursts)
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

-- 2) Optional cleanup helper (run periodically)
-- DELETE FROM processed_inbound
-- WHERE received_at < NOW() - INTERVAL '7 days';

COMMIT;

-- Optional: example inserts (uncomment and edit)
-- INSERT INTO settings (business_id, business_name, business_type, currency)
-- VALUES (1, 'Glamour Studio', 'salon', 'USD')
-- ON CONFLICT (business_id) DO NOTHING;

