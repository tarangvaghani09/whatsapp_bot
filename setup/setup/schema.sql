-- ============================================================
--  WhatsApp AI Business Bot — Database Schema
--  Run with:  psql -U postgres -d whatsapp_bot -f schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS "businesses" (
  "id"                        serial PRIMARY KEY NOT NULL,
  "name"                      text DEFAULT 'My Business' NOT NULL,
  "whatsapp_phone_number_id"  text UNIQUE,
  "whatsapp_access_token"     text,
  "verify_token"              text,
  "created_at"                timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id"          serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "phone"       text NOT NULL,
  "name"        text,
  "tags"        text[] DEFAULT '{}' NOT NULL,
  "flow_state"  text,
  "flow_data"   text,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"  timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_business_phone_uniq"
  ON "customers" ("business_id", "phone");

CREATE TABLE IF NOT EXISTS "bot_messages" (
  "id"          serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "direction"   text NOT NULL,
  "content"     text NOT NULL,
  "reply_type"  text DEFAULT 'none' NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_bot_messages_business_id" ON "bot_messages" ("business_id");

CREATE TABLE IF NOT EXISTS "faqs" (
  "id"          serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "question"    text NOT NULL,
  "answer"      text NOT NULL,
  "keywords"    text[] DEFAULT '{}' NOT NULL,
  "hit_count"   integer DEFAULT 0 NOT NULL,
  "active"      boolean DEFAULT true NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"  timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_faqs_business_id" ON "faqs" ("business_id");

CREATE TABLE IF NOT EXISTS "services" (
  "id"          serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "name"        text NOT NULL,
  "description" text,
  "price"       numeric(10, 2),
  "duration"    integer,
  "category"    text,
  "active"      boolean DEFAULT true NOT NULL,
  "keywords"    text[] DEFAULT '{}' NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"  timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_services_business_id" ON "services" ("business_id");

CREATE TABLE IF NOT EXISTS "bookings" (
  "id"               serial PRIMARY KEY NOT NULL,
  "business_id"      integer NOT NULL REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id"      integer NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "service"          text,
  "requested_date"   text,
  "requested_time"   text,
  "notes"            text,
  "status"           text DEFAULT 'pending' NOT NULL,
  "rating"           integer,
  "rating_asked_at"  timestamp with time zone,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"       timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_bookings_business_id" ON "bookings" ("business_id");

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id"                serial PRIMARY KEY NOT NULL,
  "business_id"       integer REFERENCES "businesses"("id") ON DELETE cascade,
  "customer_id"       integer REFERENCES "customers"("id") ON DELETE set null,
  "prompt"            text NOT NULL,
  "response"          text NOT NULL,
  "prompt_tokens"     integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens"      integer DEFAULT 0 NOT NULL,
  "estimated_cost"    numeric(10, 6) DEFAULT '0' NOT NULL,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_ai_usage_business_id" ON "ai_usage" ("business_id");

CREATE TABLE IF NOT EXISTS "settings" (
  "id"               serial PRIMARY KEY NOT NULL,
  "business_id"      integer NOT NULL UNIQUE REFERENCES "businesses"("id") ON DELETE cascade,
  "business_name"    text DEFAULT 'My Business' NOT NULL,
  "business_type"    text DEFAULT 'general' NOT NULL,
  "phone"            text,
  "email"            text,
  "address"          text,
  "website"          text,
  "opening_hours"    text,
  "description"      text,
  "no_match_message" text,
  "ai_fallback_enabled" boolean DEFAULT true NOT NULL,
  "welcome_menu_message" text,
  "welcome_menu_options" text,
  "payment_methods" text,
  "staff_contact_message" text,
  "currency"         text DEFAULT 'USD' NOT NULL,
  "custom_ai_prompt" text,
  "updated_at"       timestamp with time zone DEFAULT now() NOT NULL
);
