# WhatsApp AI Business Bot — Local Setup Guide

## Prerequisites

- **Node.js 20+** — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL 14+** — https://www.postgresql.org/download/

---

## Quickest Way — Automated Setup Script

```bash
bash setup/setup.sh
```

This will install dependencies, apply the schema, and optionally load sample data. Then jump to Step 5.

---

## Manual Setup

### Step 1 — Create the Database

```bash
# Log in to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE whatsapp_bot;
\q
```

---

### Step 2 — Run the SQL Scripts

```bash
# Create all tables (run this first)
psql -U postgres -d whatsapp_bot -f setup/schema.sql

# Load sample Hair Salon data (optional but recommended for demo)
psql -U postgres -d whatsapp_bot -f setup/sample-data.sql
```

---

### Step 3 — Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# PostgreSQL connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/whatsapp_bot

# OpenAI — needed for the AI fallback feature
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

> If your PostgreSQL user has no password:
> `DATABASE_URL=postgresql://postgres@localhost:5432/whatsapp_bot`

---

### Step 4 — Install Dependencies

```bash
pnpm install
```

---

### Step 5 — Start the Servers

Open **two terminals**:

**Terminal 1 — API Server:**
```bash
pnpm --filter @workspace/api-server run dev
# Runs on http://localhost:8080
```

**Terminal 2 — Admin Dashboard:**
```bash
pnpm --filter @workspace/admin-dashboard run dev
# Opens at http://localhost:5173
```

---

## Optional — Seed Other Business Types

```bash
pnpm --filter @workspace/scripts run seed:salon       # Hair salon
pnpm --filter @workspace/scripts run seed:clinic      # Medical clinic
pnpm --filter @workspace/scripts run seed:gym         # Gym / fitness
pnpm --filter @workspace/scripts run seed:restaurant  # Restaurant
pnpm --filter @workspace/scripts run seed:coaching    # Coaching / tuition

# Target a specific business by ID:
BUSINESS_ID=2 pnpm --filter @workspace/scripts run seed:salon
```

---

## WhatsApp Integration (Optional)

To connect a real WhatsApp number:

1. Go to **Meta Developer Portal → WhatsApp → API Setup**
2. Expose your local server: `ngrok http 8080`
3. Set webhook URL to: `https://YOUR_NGROK_URL/api/webhook`
4. In Admin Dashboard → **Businesses** page, enter:
   - Phone Number ID
   - Access Token
   - Verify Token

The bot auto-resolves each incoming message to the correct business.

---

## Features

| Feature | Description |
|---|---|
| Multi-tenant | Each business has its own FAQs, services, bookings, customers |
| FAQ-first bot | Answers from FAQ/service database before calling OpenAI |
| Star ratings | Bot asks for 1–5 star rating after booking completion |
| Customer tags | Label customers as VIP, New, Regular, Blocked, Pending |
| Message count badge | Each customer card shows total chat count prominently |
| Broadcast messaging | Send personalised WhatsApp messages to selected customers |
| Custom AI prompt | Override the default AI instructions per business in Settings |
| AI cost tracking | Every OpenAI call logs tokens + estimated cost |
| Business selector | Sidebar dropdown switches between businesses |

---

## Bot Response Logic

Incoming WhatsApp messages are processed in this priority order:

1. **Rating reply (1–5)** → saves star rating to booking
2. **Greeting detected** → welcome message (no AI cost)
3. **FAQ keyword match** → instant FAQ reply (no AI cost)
4. **Service keyword match** → service info reply (no AI cost)
5. **Booking intent detected** → booking capture (no AI cost)
6. **AI fallback (last resort)** → OpenAI with 200-token limit

This order keeps OpenAI costs minimal — most messages are handled for free.

---

## Project Structure

```
├── artifacts/
│   ├── api-server/          Express 5 API (port 8080)
│   └── admin-dashboard/     React + Vite dashboard (port 5173)
├── lib/
│   ├── db/                  Drizzle ORM schema + migrations
│   ├── api-spec/            OpenAPI spec (source of truth)
│   ├── api-client-react/    Auto-generated TanStack Query hooks
│   └── api-zod/             Auto-generated Zod validators
├── scripts/                 Seed scripts for each business type
├── setup/
│   ├── schema.sql           ← Run this first (creates all tables)
│   ├── sample-data.sql      ← Run this second (hair salon demo)
│   ├── setup.sh             ← Automated setup script
│   └── README-LOCAL.md      This file
└── .env.example             Copy to .env and fill in your values
```

---

## Useful Commands

| Command | Description |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | Start API server |
| `pnpm --filter @workspace/admin-dashboard run dev` | Start dashboard |
| `pnpm --filter @workspace/db run push` | Push schema changes via Drizzle |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |
| `pnpm run typecheck` | Full TypeScript type check |
