# WhatsApp AI Business Bot

A cost-saving WhatsApp automation system that answers customer messages from a FAQ/service database first, handles bookings, and only calls OpenAI as a last resort. Supports **multi-tenant** (multi-business) operation — each business has its own WhatsApp number, FAQs, services, bookings, customers, messages, AI usage, and settings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui + Recharts
- AI: Replit AI Integration (OpenAI gpt-5-mini) — no API key needed

## Where things live

- `lib/lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/lib/db/src/schema/` — Drizzle ORM table definitions (businesses, customers, bot-messages, faqs, services, bookings, ai-usage, settings)
- `server/src/lib/faq-matcher.ts` — keyword-based FAQ/service matching logic
- `server/src/lib/bot-handler.ts` — main message routing logic (FAQ → Service → Booking → AI)
- `server/src/lib/resolve-business.ts` — resolves/auto-creates tenant from businessId query param
- `server/src/lib/whatsapp.ts` — WhatsApp Cloud API client
- `server/src/routes/businesses.ts` — CRUD for businesses
- `server/src/routes/webhook.ts` — WhatsApp webhook endpoint
- `client/src/context/BusinessContext.tsx` — business selector context (persists to localStorage)
- `client/src/pages/` — admin dashboard pages (Businesses, Dashboard, FAQs, Services, Bookings, Customers, AiUsage, Settings, TestBot)

## Architecture decisions

- **Multi-tenant**: all domain tables (faqs, services, bookings, customers, bot_messages, ai_usage, settings) have a `businessId` FK. The webhook resolves tenant by `phoneNumberId`. Every API route accepts `?businessId=` and scopes all queries.
- **Auto-default business**: if `businessId` is omitted, `resolveBusinessId()` auto-creates a "My Business" default — fully backward compatible.
- **Business selector**: the admin sidebar has a dropdown to switch between businesses; selection is persisted to `localStorage` and all data fetches are scoped to the active business.
- **FAQ-first logic**: every incoming message is checked against the FAQ keyword index, then service keywords, then booking intent detection before ever calling OpenAI. This minimizes AI API cost.
- **Keyword scoring**: multi-word keywords score higher (word count), enabling phrase-level matching like "opening hours" scoring higher than just "hours".
- **Cost tracking**: every OpenAI call logs prompt tokens, completion tokens, and estimated cost to the `ai_usage` table; the dashboard shows cumulative cost and savings percent.
- **OpenAI as fallback only**: uses `gpt-5-mini` with a 200-token limit to keep fallback costs minimal and replies business-focused.
- **WhatsApp webhook**: POST /api/webhook immediately returns 200 to Meta, then processes the message asynchronously to avoid timeout issues.
- **Per-business WhatsApp creds**: each business row stores its own `whatsappPhoneNumberId`, `whatsappAccessToken`, and `verifyToken`; the bot picks the correct credentials from the business resolved from the incoming webhook.

## Product

- WhatsApp customers send messages → bot replies automatically using FAQ/service data from the database → only unknown questions reach OpenAI
- Admin can manage multiple businesses, each with its own FAQs, services, bookings, customers, and settings
- Business selector dropdown in sidebar — all pages scope data to the active business
- Dashboard shows live stats: total messages, AI call count, cost saved %, AI cost in dollars
- Customer message history visible per customer with reply-type labels (faq/service/booking/ai)

## Seed Data (Pre-load FAQs & Services)

Run one of these to instantly populate a business with real FAQs and services:

```bash
pnpm --filter @workspace/scripts run seed:salon      # Hair salon
pnpm --filter @workspace/scripts run seed:clinic     # Medical clinic
pnpm --filter @workspace/scripts run seed:gym        # Gym / fitness center
pnpm --filter @workspace/scripts run seed:restaurant # Restaurant
pnpm --filter @workspace/scripts run seed:coaching   # Coaching / tuition classes
```

To seed a specific business, set `BUSINESS_ID`:

```bash
BUSINESS_ID=2 pnpm --filter @workspace/scripts run seed:salon
```

If `BUSINESS_ID` is not set, the seed targets the first business in the DB (auto-creating one if none exists).

Each seed adds 8 FAQs (hours, location, booking, payments, etc.) and 8–10 services with keywords.

## WhatsApp Setup (per business)

1. Go to Meta Developer Portal → WhatsApp → API Setup
2. Set webhook URL to: `https://YOUR_DOMAIN/api/webhook`
3. Create a business in the admin dashboard → Businesses page
4. Enter the `Phone Number ID`, `Access Token`, and `Verify Token` for that business
5. The bot auto-resolves the correct business from the incoming `phoneNumberId`

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Run `pnpm --filter @workspace/db run push` after any schema change
- The `integrations-openai-ai-react` and `integrations-openai-ai-server` libs are NOT in the root tsconfig references (they cause typecheck failures); the api-server imports `@workspace/integrations-openai-ai-server` directly via its own tsconfig reference
- WhatsApp credentials can be added later in the Businesses page — the bot gracefully skips sending if they're not configured
- The root `tsconfig.json` references `./lib/lib/db`, `./lib/lib/api-client-react`, `./lib/lib/api-zod` (the actual workspace paths, not `./lib/db`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

