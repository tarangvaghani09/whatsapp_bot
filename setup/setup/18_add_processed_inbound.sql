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

