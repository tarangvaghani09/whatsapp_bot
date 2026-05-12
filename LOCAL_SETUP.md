# WhatsApp AI Business Bot — Local Setup Guide

A cost-saving WhatsApp automation system. Answers customer messages from a FAQ/service database first, handles bookings, and only calls OpenAI as a last resort.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v20 or v22+ | https://nodejs.org |
| pnpm | v9+ | `npm install -g pnpm` |
| PostgreSQL | v14+ | https://www.postgresql.org/download/ |

---

## 1. Create the PostgreSQL database

```bash
psql -U postgres
CREATE DATABASE whatsapp_bot;
\q
```

---

## 2. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/whatsapp_bot
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...   # Your OpenAI key (for AI fallback)
```

> The bot works fully without WhatsApp credentials — use the **Test Bot** page in the dashboard to simulate messages.

---

## 3. Install dependencies

```bash
pnpm install
```

---

## 4. Push the database schema

This creates all tables in your PostgreSQL database:

```bash
pnpm --filter @workspace/db run push
```

---

## 5. Seed sample data

Choose a business type (or run multiple):

```bash
pnpm --filter @workspace/scripts run seed:salon      # Hair salon (recommended start)
pnpm --filter @workspace/scripts run seed:clinic     # Medical clinic
pnpm --filter @workspace/scripts run seed:gym        # Gym / fitness
pnpm --filter @workspace/scripts run seed:restaurant # Restaurant
pnpm --filter @workspace/scripts run seed:coaching   # Coaching / tutoring
```

Then load sample customers, messages and bookings:

```bash
pnpm --filter @workspace/scripts run seed:sample
```

---

## 6. Start the servers

Open **two terminals**:

**Terminal 1 — API server (port 8080):**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Admin dashboard (port 5173):**
```bash
pnpm --filter @workspace/admin-dashboard run dev
```

Then open: **http://localhost:5173**

First time only: open **http://localhost:5173/create-admin** to create your first admin account, then login at **/login**.

---

## Project structure

```
artifacts/
  api-server/       Express API (port 8080)
  admin-dashboard/  React + Vite admin UI (port 5173)
lib/
  db/               Drizzle ORM schema + migrations
  api-spec/         OpenAPI spec (source of truth for API types)
  api-zod/          Auto-generated Zod schemas
  api-client-react/ Auto-generated React Query hooks
scripts/
  src/seed.ts       Business data seeds (FAQs + services)
  src/seed-sample.ts  Sample customers, messages, bookings
```

---

## Useful commands

```bash
# Full typecheck
pnpm run typecheck

# Regenerate API hooks after changing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push schema changes to DB
pnpm --filter @workspace/db run push
```

---

## WhatsApp setup (when ready)

1. Go to **Meta Developer Portal → WhatsApp → API Setup**
2. Set webhook URL: `https://YOUR_DOMAIN/api/webhook`
3. Set verify token to match `WHATSAPP_VERIFY_TOKEN` in your `.env`
4. Subscribe to the `messages` webhook field
5. Fill in `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in `.env`

> Use the **Test Bot** page in the dashboard to test everything locally without WhatsApp.

---

## Database schema overview

| Table | Purpose |
|-------|---------|
| `customers` | WhatsApp customer phone numbers |
| `faqs` | FAQ question/answer/keywords |
| `services` | Service name/price/duration/keywords |
| `bookings` | Customer booking requests |
| `bot_messages` | Full message history |
| `ai_usage` | OpenAI call logs + cost tracking |
| `settings` | Business name, hours, description |
