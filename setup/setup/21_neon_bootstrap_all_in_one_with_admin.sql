-- Neon All-in-One Bootstrap (WITH ADMIN)
-- Generated on 2026-05-19 11:14:16


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

-- ===== Compatibility fix for admin owner APIs =====
-- Required by /api/business-owners routes
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS user_business_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, business_id)
);


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

-- =============================================================
--  WhatsApp AI Business Bot — Sample Data (Hair Salon)
--  Run AFTER 01_schema.sql.
--  Usage:  psql -U postgres -d whatsapp_bot -f 02_sample_data.sql
-- =============================================================

BEGIN;

-- ── 1. Business ──────────────────────────────────────────────
INSERT INTO businesses (id, name) VALUES (1, 'Glamour Hair Salon')
ON CONFLICT (id) DO NOTHING;
SELECT setval('businesses_id_seq', 1, true);

-- ── 2. Settings ───────────────────────────────────────────────
INSERT INTO settings (business_id, business_name, business_type, phone, email, address, opening_hours, description, currency)
VALUES (
  1,
  'Glamour Hair Salon',
  'salon',
  '+1-555-0100',
  'hello@glamoursalon.com',
  '123 Beauty Street, Downtown',
  'Mon–Sat 9 AM – 8 PM, Sun 10 AM – 6 PM',
  'Premium hair salon offering cuts, coloring, bridal styling, and beauty treatments.',
  'USD'
) ON CONFLICT (business_id) DO UPDATE SET
  business_name  = EXCLUDED.business_name,
  business_type  = EXCLUDED.business_type,
  phone          = EXCLUDED.phone,
  email          = EXCLUDED.email,
  address        = EXCLUDED.address,
  opening_hours  = EXCLUDED.opening_hours,
  description    = EXCLUDED.description;

-- ── 3. FAQs ──────────────────────────────────────────────────
INSERT INTO faqs (business_id, question, answer, keywords, active) VALUES
(1, 'What are your opening hours?',
 'We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.',
 ARRAY['hours','open','opening','close','closing','time','schedule','when'],
 true),

(1, 'Where are you located?',
 'We are at 123 Beauty Street, Downtown. Easy parking available right in front!',
 ARRAY['location','address','where','find','directions','map','located'],
 true),

(1, 'How can I book an appointment?',
 'You can book by replying here, calling us at +1-555-0100, or visiting our salon. We''ll confirm your slot shortly!',
 ARRAY['book','appointment','booking','reserve','schedule','slot'],
 true),

(1, 'What payment methods do you accept?',
 'We accept cash, all major credit/debit cards, and mobile payments (Apple Pay, Google Pay).',
 ARRAY['payment','pay','cash','card','credit','debit','apple pay','google pay'],
 true),

(1, 'Do you accept walk-ins?',
 'Yes! We welcome walk-ins based on availability. Booking in advance guarantees your preferred time slot.',
 ARRAY['walk-in','walk in','without appointment','no appointment','drop in'],
 true),

(1, 'Do you offer bridal packages?',
 'Absolutely! We offer full bridal packages including hair styling, makeup trials, and day-of services. Contact us for a custom quote.',
 ARRAY['bridal','bride','wedding','bridal package','wedding hair'],
 true),

(1, 'Is parking available?',
 'Yes, free parking is available right in front of the salon.',
 ARRAY['parking','park','car'],
 true),

(1, 'Do you have a loyalty program?',
 'Yes! Every 10th visit is on us. Ask our staff about our loyalty card when you visit.',
 ARRAY['loyalty','reward','points','membership','discount','offer'],
 true);

-- ── 4. Services ───────────────────────────────────────────────
INSERT INTO services (business_id, name, description, price, duration, category, active, keywords) VALUES
(1, 'Haircut (Women)',
 'Wash, cut & blow dry. Includes consultation.',
 35.00, 60, 'Hair', true,
 ARRAY['haircut','cut','trim','women','female','ladies']),

(1, 'Haircut (Men)',
 'Classic cut, shampoo & style.',
 20.00, 30, 'Hair', true,
 ARRAY['haircut','cut','trim','men','male','gents','barber']),

(1, 'Hair Coloring',
 'Full hair color with premium products. Patch test required 48 hrs before.',
 80.00, 120, 'Color', true,
 ARRAY['color','colour','coloring','dye','hair color']),

(1, 'Highlights',
 'Full or partial highlights using balayage or foil technique.',
 95.00, 150, 'Color', true,
 ARRAY['highlights','highlight','balayage','foil','streaks']),

(1, 'Keratin Treatment',
 'Smoothing treatment that eliminates frizz for up to 3 months.',
 150.00, 180, 'Treatment', true,
 ARRAY['keratin','smoothing','frizz','treatment','straight']),

(1, 'Hair Spa',
 'Deep conditioning spa treatment for dry or damaged hair.',
 50.00, 60, 'Treatment', true,
 ARRAY['spa','conditioning','deep condition','mask','damaged']),

(1, 'Bridal Hair Styling',
 'Complete bridal hair design including trial session.',
 200.00, 180, 'Bridal', true,
 ARRAY['bridal','bride','wedding','bridal hair','bridal styling']),

(1, 'Blow Dry & Style',
 'Shampoo, blow dry and style of your choice.',
 25.00, 45, 'Hair', true,
 ARRAY['blowdry','blow dry','style','blowout','shampoo']),

(1, 'Eyebrow Threading',
 'Precise shaping and threading for defined brows.',
 10.00, 15, 'Beauty', true,
 ARRAY['eyebrow','brow','threading','thread']),

(1, 'Head Massage',
 'Relaxing scalp and head massage with aromatic oils.',
 30.00, 30, 'Wellness', true,
 ARRAY['massage','head massage','scalp','relax']);

-- ── 5. Customers ─────────────────────────────────────────────
INSERT INTO customers (id, business_id, phone, name, created_at) VALUES
(1, 1, '+1-555-1001', 'Aisha Rahman',   NOW() - INTERVAL '30 days'),
(2, 1, '+1-555-1002', 'Maria Santos',   NOW() - INTERVAL '25 days'),
(3, 1, '+1-555-1003', 'Priya Nair',     NOW() - INTERVAL '20 days'),
(4, 1, '+1-555-1004', 'Fatima Al-Zahra',NOW() - INTERVAL '15 days'),
(5, 1, '+1-555-1005', 'Chen Wei',       NOW() - INTERVAL '10 days'),
(6, 1, '+1-555-1006', 'Sofia Müller',   NOW() - INTERVAL '7 days'),
(7, 1, '+1-555-1007', 'Amara Osei',     NOW() - INTERVAL '5 days'),
(8, 1, '+1-555-1008', 'Zara Patel',     NOW() - INTERVAL '2 days')
ON CONFLICT (business_id, phone) DO NOTHING;
SELECT setval('customers_id_seq', 8, true);

-- ── 6. Bot Messages ──────────────────────────────────────────
INSERT INTO bot_messages (business_id, customer_id, direction, content, reply_type, created_at) VALUES

-- Customer 1 conversation
(1,1,'inbound','Hi, what are your opening hours?','none', NOW()-INTERVAL '29 days 4 hours'),
(1,1,'outbound','We are open Monday to Saturday, 9:00 AM – 8:00 PM, and Sunday 10:00 AM – 6:00 PM.','faq', NOW()-INTERVAL '29 days 3 hours 54 minutes'),
(1,1,'inbound','I''d like to book a haircut for Saturday','none', NOW()-INTERVAL '29 days 3 hours'),
(1,1,'outbound','I''ve noted your booking request for a haircut on Saturday. Our team will confirm shortly!','booking', NOW()-INTERVAL '29 days 2 hours 55 minutes'),

-- Customer 2 conversation
(1,2,'inbound','Do you do hair coloring?','none', NOW()-INTERVAL '24 days 5 hours'),
(1,2,'outbound','Yes! We offer Full Hair Coloring for $80 (120 mins) using premium products. Patch test required 48hrs before. Interested in booking?','service', NOW()-INTERVAL '24 days 4 hours 58 minutes'),
(1,2,'inbound','How much is highlights?','none', NOW()-INTERVAL '24 days 4 hours'),
(1,2,'outbound','Highlights (balayage or foil) are $95 for 150 mins. Would you like to book an appointment?','service', NOW()-INTERVAL '24 days 3 hours 58 minutes'),

-- Customer 3 conversation
(1,3,'inbound','Where are you located?','none', NOW()-INTERVAL '19 days 6 hours'),
(1,3,'outbound','We are at 123 Beauty Street, Downtown. Easy parking available right in front!','faq', NOW()-INTERVAL '19 days 5 hours 58 minutes'),
(1,3,'inbound','Can I walk in without an appointment?','none', NOW()-INTERVAL '19 days 5 hours'),
(1,3,'outbound','Yes! We welcome walk-ins based on availability. Booking in advance guarantees your preferred time slot.','faq', NOW()-INTERVAL '19 days 4 hours 58 minutes'),
(1,3,'inbound','Book a hair spa please','none', NOW()-INTERVAL '19 days 4 hours'),
(1,3,'outbound','I''ve noted your booking request for Hair Spa. Our team will confirm shortly!','booking', NOW()-INTERVAL '19 days 3 hours 58 minutes'),

-- Customer 4 conversation
(1,4,'inbound','Do you have bridal packages?','none', NOW()-INTERVAL '14 days 3 hours'),
(1,4,'outbound','Absolutely! We offer full bridal packages including hair styling, makeup trials, and day-of services. Contact us for a custom quote.','faq', NOW()-INTERVAL '14 days 2 hours 58 minutes'),
(1,4,'inbound','I want to book bridal hair styling','none', NOW()-INTERVAL '14 days 2 hours'),
(1,4,'outbound','I''ve noted your booking request for Bridal Hair Styling. Our team will confirm shortly!','booking', NOW()-INTERVAL '14 days 1 hour 58 minutes'),

-- Customer 5 conversation
(1,5,'inbound','What is keratin treatment?','none', NOW()-INTERVAL '9 days 4 hours'),
(1,5,'outbound','Keratin Treatment is a smoothing treatment that eliminates frizz for up to 3 months. Price: $150 (180 mins). Interested?','service', NOW()-INTERVAL '9 days 3 hours 58 minutes'),
(1,5,'inbound','Does it work on curly hair?','none', NOW()-INTERVAL '9 days 3 hours'),
(1,5,'outbound','Yes, keratin treatment works great on curly or frizzy hair! It smooths the hair cuticle and reduces frizz significantly. Results last 2–3 months. Would you like to book?','ai', NOW()-INTERVAL '9 days 2 hours 58 minutes'),

-- Customer 6 conversation
(1,6,'inbound','What payment methods do you take?','none', NOW()-INTERVAL '6 days 5 hours'),
(1,6,'outbound','We accept cash, all major credit/debit cards, and mobile payments (Apple Pay, Google Pay).','faq', NOW()-INTERVAL '6 days 4 hours 58 minutes'),

-- Customer 7 conversation
(1,7,'inbound','Hello','none', NOW()-INTERVAL '4 days 3 hours'),
(1,7,'outbound','Hi there! Welcome to Glamour Hair Salon 💇‍♀️ How can I help you today? You can ask about our services, prices, or book an appointment!','faq', NOW()-INTERVAL '4 days 2 hours 58 minutes'),
(1,7,'inbound','Book blow dry for tomorrow','none', NOW()-INTERVAL '4 days 2 hours'),
(1,7,'outbound','I''ve noted your booking request for Blow Dry & Style. Our team will confirm shortly!','booking', NOW()-INTERVAL '4 days 1 hour 58 minutes'),

-- Customer 8 conversation
(1,8,'inbound','Is there a loyalty program?','none', NOW()-INTERVAL '1 day 5 hours'),
(1,8,'outbound','Yes! Every 10th visit is on us. Ask our staff about our loyalty card when you visit.','faq', NOW()-INTERVAL '1 day 4 hours 58 minutes');

-- ── 7. Bookings ───────────────────────────────────────────────
INSERT INTO bookings (business_id, customer_id, service, requested_date, requested_time, status, created_at) VALUES
(1, 1, 'Haircut (Women)',      '2026-05-17', '10:00', 'approved',  NOW()-INTERVAL '29 days'),
(1, 3, 'Hair Spa',             '2026-05-18', '14:00', 'approved',  NOW()-INTERVAL '19 days'),
(1, 4, 'Bridal Hair Styling',  '2026-06-01', '09:00', 'pending',   NOW()-INTERVAL '14 days'),
(1, 5, 'Keratin Treatment',    '2026-05-20', '11:00', 'pending',   NOW()-INTERVAL '9 days'),
(1, 7, 'Blow Dry & Style',     '2026-05-12', '13:00', 'pending',   NOW()-INTERVAL '4 days');

-- ── 8. AI Usage sample ────────────────────────────────────────
INSERT INTO ai_usage (business_id, customer_id, prompt, response, prompt_tokens, completion_tokens, total_tokens, estimated_cost, created_at) VALUES
(1, 5,
 'Does keratin treatment work on curly hair?',
 'Yes, keratin treatment works great on curly or frizzy hair! It smooths the hair cuticle and reduces frizz significantly. Results last 2–3 months.',
 45, 38, 83, 0.000125,
 NOW()-INTERVAL '9 days 2 hours 58 minutes'),

(1, 7,
 'What is the best shampoo for colored hair?',
 'For colored hair, use sulfate-free shampoos and color-safe conditioners. We recommend asking your stylist for a personalized recommendation during your visit!',
 40, 42, 82, 0.000123,
 NOW()-INTERVAL '4 days');

COMMIT;

\echo 'Sample data inserted successfully.'
\echo 'Business: Glamour Hair Salon (ID=1)'
\echo '8 FAQs, 10 Services, 8 Customers, 5 Bookings loaded.'

-- ===== END whatsapp-bot/setup/setup/02_sample_data.sql =====

