import { Router, type IRouter } from "express";
import { db, bookingsTable, customersTable, faqsTable, servicesTable, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { matchFaq, matchFaqWithScore, matchService, detectBookingIntent, formatServiceReply } from "../lib/faq-matcher";
import { handleGuidedMessage } from "../lib/guided-menu";
import { SimulateMessageBody, SimulateMessageResponse } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();
const GLOBAL_DUPLICATE_WINDOW_MS = 15_000;
const GLOBAL_DUPLICATE_HINT_COOLDOWN_MS = 15_000;
const CUSTOMER_RATE_LIMIT_WINDOW_MS = 60_000;
const CUSTOMER_RATE_LIMIT_MAX = 15;

function normalizeIncomingText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseFlowMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function getOrCreateTestCustomer(sessionId: string, businessId: number) {
  const phone = `__testbot__:${sessionId}`;
  const existing = await db.select().from(customersTable)
    .where(and(eq(customersTable.phone, phone), eq(customersTable.businessId, businessId)))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db.insert(customersTable).values({
    businessId,
    phone,
    name: "Test Bot Customer",
  }).returning();
  return created;
}

async function buildSystemPrompt(businessId: number): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
  const s = rows[0];
  if (!s) return "You are a helpful WhatsApp assistant for a business. Answer only business-related questions. Keep answers short (under 100 words).";

  const parts: string[] = [];
  parts.push(`You are a helpful WhatsApp assistant for ${s.businessName}.`);
  if (s.businessType && s.businessType !== "general") parts.push(`Business type: ${s.businessType}.`);
  if (s.address) parts.push(`Address: ${s.address}.`);
  if (s.phone) parts.push(`Phone: ${s.phone}.`);
  if (s.email) parts.push(`Email: ${s.email}.`);
  if (s.website) parts.push(`Website: ${s.website}.`);
  if (s.openingHours) parts.push(`Opening hours: ${s.openingHours}.`);
  if (s.description) parts.push(s.description);
  parts.push("Answer only business-related questions. Keep answers short (under 100 words).");
  return parts.join(" ");
}

function getSafeNoMatchReply(settings: { businessName?: string | null; phone?: string | null; email?: string | null; noMatchMessage?: string | null } | undefined): string {
  const custom = settings?.noMatchMessage?.trim();
  if (custom) return custom;
  const name = settings?.businessName?.trim() || "our business";
  const contact = settings?.phone?.trim() || settings?.email?.trim();
  if (contact) {
    return `I couldn't find an exact match for your question at ${name}. Please contact us at ${contact} and we'll help you right away.`;
  }
  return `I couldn't find an exact match for your question at ${name}. Please contact our support team and we'll help you right away.`;
}

function isAiConfigured(): boolean {
  return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
}

function getAiConfigMissingReply(settings: { businessName?: string | null } | undefined): string {
  const name = settings?.businessName?.trim() || "this business";
  return `AI fallback is enabled for ${name}, but OpenAI API key is missing on server. Please set AI_INTEGRATIONS_OPENAI_API_KEY in .env and restart server.`;
}

function buildDefaultGreeting(settings: { businessName?: string | null; openingHours?: string | null } | undefined): string {
  const name = settings?.businessName?.trim() || "our business";
  const lines = [
    `Hello! Welcome to *${name}*.`,
    "We're happy to help you! You can ask us about:",
    "- Opening hours",
    "- Location and directions",
    "- Services and pricing",
    "- Booking an appointment",
    "- Payment methods",
  ];
  if (settings?.openingHours?.trim()) lines.push(`\nWe're open: ${settings.openingHours.trim()}`);
  lines.push("\nJust type your question and we'll reply right away!");
  return lines.join("\n");
}

function applyWelcomePlaceholders(
  template: string,
  settings: { businessName?: string | null; openingHours?: string | null; address?: string | null } | undefined,
): string {
  const businessName = settings?.businessName?.trim() || "our business";
  const openingHours = settings?.openingHours?.trim() || "";
  const address = settings?.address?.trim() || "";

  return template
    .replaceAll("{businessName}", businessName)
    .replaceAll("{openingHours}", openingHours)
    .replaceAll("{address}", address);
}

function getGreetingReply(
  settings:
    | {
        businessName?: string | null;
        openingHours?: string | null;
        address?: string | null;
        welcomeMenuMessage?: string | null;
      }
    | undefined,
): string {
  const custom = settings?.welcomeMenuMessage?.trim();
  if (custom) {
    return applyWelcomePlaceholders(custom, settings);
  }
  return buildDefaultGreeting(settings);
}

router.post("/simulate", async (req, res): Promise<void> => {
  let settings: (typeof settingsTable.$inferSelect) | undefined;

  try {
    const q = BusinessIdQueryParam.safeParse(req.query);
    const businessId = await resolveBusinessId(req, q.data?.businessId);

    const parsed = SimulateMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { message, sessionId } = parsed.data;
    const settingsRows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
    settings = settingsRows[0];
    const customer = await getOrCreateTestCustomer(sessionId ?? "default", businessId);

    const meta = parseFlowMeta(customer.flowData);
    const now = Date.now();

    // Per-customer rate limit: max 15 inbound msgs per minute per business+phone.
    const windowStart = typeof meta["rlWindowStartAt"] === "number" ? meta["rlWindowStartAt"] : 0;
    const withinWindow = windowStart > 0 && now - windowStart < CUSTOMER_RATE_LIMIT_WINDOW_MS;
    const nextCount = withinWindow ? (typeof meta["rlCount"] === "number" ? meta["rlCount"] : 0) + 1 : 1;
    meta["rlWindowStartAt"] = withinWindow ? windowStart : now;
    meta["rlCount"] = nextCount;

    if (nextCount > CUSTOMER_RATE_LIMIT_MAX) {
      const lastWarnAt = typeof meta["rlLastWarnAt"] === "number" ? meta["rlLastWarnAt"] : 0;
      if (!withinWindow || lastWarnAt < (meta["rlWindowStartAt"] as number)) {
        meta["rlLastWarnAt"] = now;
        await db.update(customersTable).set({ flowData: JSON.stringify(meta) }).where(eq(customersTable.id, customer.id));
        res.json(SimulateMessageResponse.parse({
          replyType: "none",
          response: "You're sending messages too quickly. Please wait a minute and try again.",
          matchedFaqId: null,
          matchedFaqQuestion: null,
          matchedServiceId: null,
          matchedServiceName: null,
          aiTokensUsed: null,
        }));
        return;
      }
      await db.update(customersTable).set({ flowData: JSON.stringify(meta) }).where(eq(customersTable.id, customer.id));
      res.json(SimulateMessageResponse.parse({
        replyType: "none",
        response: "",
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    // Global duplicate guard for non-guided simulation path.
    if (!customer.flowState) {
      const normalized = normalizeIncomingText(message);
      const lastText = typeof meta["lastGlobalText"] === "string" ? meta["lastGlobalText"] : "";
      const lastAt = typeof meta["lastGlobalTextAt"] === "number" ? meta["lastGlobalTextAt"] : 0;
      const lastHintAt = typeof meta["lastGlobalDuplicateHintAt"] === "number" ? meta["lastGlobalDuplicateHintAt"] : 0;
      const isDuplicate = normalized.length > 0 && normalized === lastText && lastAt > 0 && now - lastAt <= GLOBAL_DUPLICATE_WINDOW_MS;

      meta["lastGlobalText"] = normalized;
      meta["lastGlobalTextAt"] = now;

      if (isDuplicate) {
        if (lastHintAt <= 0 || now - lastHintAt > GLOBAL_DUPLICATE_HINT_COOLDOWN_MS) {
          meta["lastGlobalDuplicateHintAt"] = now;
          await db.update(customersTable).set({ flowData: JSON.stringify(meta) }).where(eq(customersTable.id, customer.id));
          res.json(SimulateMessageResponse.parse({
            replyType: "none",
            response: "I already got that message. Please wait a moment or choose the next option.",
            matchedFaqId: null,
            matchedFaqQuestion: null,
            matchedServiceId: null,
            matchedServiceName: null,
            aiTokensUsed: null,
          }));
          return;
        }

        await db.update(customersTable).set({ flowData: JSON.stringify(meta) }).where(eq(customersTable.id, customer.id));
        res.json(SimulateMessageResponse.parse({
          replyType: "none",
          response: "",
          matchedFaqId: null,
          matchedFaqQuestion: null,
          matchedServiceId: null,
          matchedServiceName: null,
          aiTokensUsed: null,
        }));
        return;
      }
    }

    await db.update(customersTable).set({ flowData: JSON.stringify(meta) }).where(eq(customersTable.id, customer.id));

    const aiDefaultEnabled = process.env.AI_FALLBACK_DEFAULT_ENABLED !== "false";
    const aiEnabledForBusiness = settings?.aiFallbackEnabled ?? aiDefaultEnabled;
    const services = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.businessId, businessId), eq(servicesTable.active, true)));
    const faqs = await db.select().from(faqsTable)
      .where(and(eq(faqsTable.businessId, businessId), eq(faqsTable.active, true)));

    const guided = handleGuidedMessage({
      text: message,
      customer,
      settings: settings ?? {},
      fallbackBusinessName: settings?.businessName ?? "our business",
      services,
    });

    if (guided?.handled) {
      await db.update(customersTable).set({
        flowState: guided.flowState,
        flowData: guided.flowData,
        ...(guided.customerName ? { name: guided.customerName } : {}),
      }).where(eq(customersTable.id, customer.id));

      if (guided.bookingDraft) {
        await db.insert(bookingsTable).values({
          businessId,
          customerId: customer.id,
          service: guided.bookingDraft.service,
          requestedDate: guided.bookingDraft.requestedDate,
          requestedTime: guided.bookingDraft.requestedTime,
          notes: "Created from Test Bot guided menu flow",
          status: "pending",
        });
      }

      const guidedReply = guided.reply;
      const guidedType = guided.reply.trim().length > 0 ? guided.replyType : "none";

      res.json(SimulateMessageResponse.parse({
        replyType: guidedType,
        response: guidedReply,
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    if (customer.flowState) {
      const strongFaq = matchFaqWithScore(message, faqs);
      if (strongFaq.faq && strongFaq.score >= 2) {
        res.json(SimulateMessageResponse.parse({
          replyType: "faq",
          response: `${strongFaq.faq.answer}\n\nYou can continue your previous step, or type 'menu' to go back.`,
          matchedFaqId: strongFaq.faq.id,
          matchedFaqQuestion: strongFaq.faq.question,
          matchedServiceId: null,
          matchedServiceName: null,
          aiTokensUsed: null,
        }));
        return;
      }
    }
    const matchedFaq = matchFaq(message, faqs);
    if (matchedFaq) {
      res.json(SimulateMessageResponse.parse({
        replyType: "faq",
        response: matchedFaq.answer,
        matchedFaqId: matchedFaq.id,
        matchedFaqQuestion: matchedFaq.question,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    const matchedService = matchService(message, services);
    if (matchedService) {
      res.json(SimulateMessageResponse.parse({
        replyType: "service",
        response: formatServiceReply(matchedService),
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: matchedService.id,
        matchedServiceName: matchedService.name,
        aiTokensUsed: null,
      }));
      return;
    }

    if (detectBookingIntent(message)) {
      res.json(SimulateMessageResponse.parse({
        replyType: "booking",
        response: "I'd love to help you book an appointment! Please tell me: what service you need, your preferred date, and time. Our team will confirm shortly.",
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    if (!aiEnabledForBusiness) {
      res.json(SimulateMessageResponse.parse({
        replyType: "none",
        response: getSafeNoMatchReply(settings),
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    if (!isAiConfigured()) {
      res.json(SimulateMessageResponse.parse({
        replyType: "none",
        response: getAiConfigMissingReply(settings),
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
      return;
    }

    try {
      const systemPrompt = await buildSystemPrompt(businessId);
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });

      const response = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't understand that.";
      const tokensUsed = completion.usage?.total_tokens ?? null;

      res.json(SimulateMessageResponse.parse({
        replyType: "ai",
        response,
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: tokensUsed,
      }));
    } catch (error) {
      console.error("AI simulate fallback error:", error);
      res.json(SimulateMessageResponse.parse({
        replyType: "none",
        response: getSafeNoMatchReply(settings),
        matchedFaqId: null,
        matchedFaqQuestion: null,
        matchedServiceId: null,
        matchedServiceName: null,
        aiTokensUsed: null,
      }));
    }
  } catch (error) {
    console.error("Simulate route error:", error);
    res.json(SimulateMessageResponse.parse({
      replyType: "none",
      response: getSafeNoMatchReply(settings),
      matchedFaqId: null,
      matchedFaqQuestion: null,
      matchedServiceId: null,
      matchedServiceName: null,
      aiTokensUsed: null,
    }));
  }
});

export default router;