import { db, customersTable, botMessagesTable, faqsTable, servicesTable, bookingsTable, aiUsageTable, settingsTable, businessesTable, deliveryFailuresTable } from "@workspace/db";
import { eq, and, desc, isNotNull, isNull } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { sendWhatsAppMessage, type BusinessCreds, type SendResult } from "./whatsapp";
import { matchFaq, matchFaqWithScore, matchService, detectBookingIntent, formatServiceReply, detectGreetingWithCustomKeywords } from "./faq-matcher";
import { logger } from "./logger";
import { decryptSecret } from "./secrets";
import { handleGuidedMessage } from "./guided-menu";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful WhatsApp assistant for a business.
Answer only business-related questions. Keep answers short (under 100 words).
Do not answer unrelated questions — politely decline and redirect to business topics.
If the customer asks something you don't know, suggest they contact the business directly.`;

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

async function getBusinessSystemPrompt(businessId: number): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
  const s = rows[0];
  if (!s) return DEFAULT_SYSTEM_PROMPT;

  if (s.customAiPrompt?.trim()) {
    return s.customAiPrompt.trim();
  }

  const parts: string[] = [];
  parts.push(`You are a helpful WhatsApp assistant for ${s.businessName}.`);
  if (s.businessType && s.businessType !== "general") parts.push(`Business type: ${s.businessType}.`);
  if (s.address) parts.push(`Address: ${s.address}.`);
  if (s.phone) parts.push(`Phone: ${s.phone}.`);
  if (s.email) parts.push(`Email: ${s.email}.`);
  if (s.website) parts.push(`Website: ${s.website}.`);
  if (s.openingHours) parts.push(`Opening hours: ${s.openingHours}.`);
  if (s.currency) parts.push(`Currency: ${s.currency}.`);
  if (s.description) parts.push(s.description);
  parts.push("Answer only business-related questions. Keep answers short (under 100 words).");
  parts.push("Do not answer unrelated questions — politely decline and redirect to business topics.");
  parts.push("If the customer asks something you don't know, suggest they contact the business directly.");

  return parts.join(" ");
}

async function getOrCreateCustomer(phone: string, businessId: number) {
  const existing = await db.select().from(customersTable)
    .where(and(eq(customersTable.phone, phone), eq(customersTable.businessId, businessId)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db.insert(customersTable).values({ phone, businessId }).returning();
  return created;
}

async function logMessage(customerId: number, businessId: number, direction: "inbound" | "outbound", content: string, replyType: "faq" | "service" | "booking" | "ai" | "none" | "broadcast" | "rating") {
  await db.insert(botMessagesTable).values({ customerId, businessId, direction, content, replyType });
}

async function recordDeliveryFailure(businessId: number, phone: string, message: string, result: Extract<SendResult, { ok: false }>, context: string) {
  try {
    await db.insert(deliveryFailuresTable).values({
      businessId,
      recipientPhone: phone,
      messagePreview: message.slice(0, 120),
      errorStatus: result.status,
      errorBody: result.errorBody.slice(0, 500),
      context,
    });
  } catch (err) {
    logger.error({ err }, "Failed to record delivery failure");
  }
}

async function callOpenAI(prompt: string, customerId: number, businessId: number): Promise<string> {
  const systemPrompt = await getBusinessSystemPrompt(businessId);

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const response = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't understand that.";
  const usage = completion.usage;

  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? 0;
  const estimatedCost = String(((promptTokens * 0.00000015) + (completionTokens * 0.0000006)).toFixed(6));

  await db.insert(aiUsageTable).values({
    customerId,
    businessId,
    prompt,
    response,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost,
  });

  return response;
}

function buildGreetingReply(businessName: string, openingHours?: string | null): string {
  const name = businessName || "our business";
  const lines = [
    `👋 Hello! Welcome to *${name}*.`,
    `We're happy to help you! You can ask us about:`,
    `• 🕐 Opening hours`,
    `• 📍 Location & directions`,
    `• 💇 Services & pricing`,
    `• 📅 Booking an appointment`,
    `• 💳 Payment methods`,
  ];
  if (openingHours) {
    lines.push(`\nWe're open: ${openingHours}`);
  }
  lines.push(`\nJust type your question and we'll reply right away! 😊`);
  return lines.join("\n");
}

function applyWelcomePlaceholders(
  template: string,
  settings: { businessName?: string | null; openingHours?: string | null; address?: string | null } | undefined,
  fallbackName: string,
): string {
  const businessName = settings?.businessName?.trim() || fallbackName || "our business";
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
  fallbackName: string,
): string {
  const custom = settings?.welcomeMenuMessage?.trim();
  if (custom) {
    return applyWelcomePlaceholders(custom, settings, fallbackName);
  }
  return buildGreetingReply(settings?.businessName ?? fallbackName, settings?.openingHours);
}

function detectRatingReply(text: string): number | null {
  const trimmed = text.trim();
  if (/^[1-5]$/.test(trimmed)) return parseInt(trimmed, 10);
  const stars = (trimmed.match(/⭐/g) ?? []).length;
  if (stars >= 1 && stars <= 5) return stars;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const lower = trimmed.toLowerCase();
  if (words[lower] !== undefined) return words[lower]!;
  return null;
}

function isThankYouMessage(text: string): boolean {
  const normalized = normalizeIncomingText(text);
  if (!normalized) return false;
  return (
    normalized === "thanks" ||
    normalized === "thank you" ||
    normalized === "thankyou" ||
    normalized === "thank u" ||
    normalized === "thx" ||
    normalized === "ty" ||
    normalized === "tank you" ||
    normalized === "tank u" ||
    normalized.includes("thank you") ||
    normalized.includes("thanks")
  );
}

function getSafeNoMatchReply(
  settings: { businessName?: string | null; phone?: string | null; email?: string | null; noMatchMessage?: string | null } | undefined,
  fallbackName: string,
): string {
  const custom = settings?.noMatchMessage?.trim();
  if (custom) return custom;
  const name = settings?.businessName?.trim() || fallbackName;
  const contact = settings?.phone?.trim() || settings?.email?.trim();
  if (contact) {
    return `I couldn't find an exact match for your question at ${name}. Please contact us at ${contact} and we'll help you right away.`;
  }
  return `I couldn't find an exact match for your question at ${name}. Please contact our support team and we'll help you right away.`;
}

export async function handleIncomingMessage(phone: string, text: string, phoneNumberId: string): Promise<void> {
  const [business] = await db.select().from(businessesTable)
    .where(eq(businessesTable.whatsappPhoneNumberId, phoneNumberId))
    .limit(1);

  if (!business) {
    logger.warn({ phoneNumberId }, "No business found for phoneNumberId — ignoring message");
    return;
  }

  const businessId = business.id;
  const creds: BusinessCreds | undefined =
    business.whatsappPhoneNumberId && business.whatsappAccessToken
      ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
      : undefined;

  const customer = await getOrCreateCustomer(phone, businessId);
  const settingsRows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
  const settings = settingsRows[0];
  const aiDefaultEnabled = process.env.AI_FALLBACK_DEFAULT_ENABLED !== "false";
  const aiEnabledForBusiness = settings?.aiFallbackEnabled ?? aiDefaultEnabled;
  const services = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.businessId, businessId), eq(servicesTable.active, true)));
  const faqs = await db.select().from(faqsTable)
    .where(and(eq(faqsTable.businessId, businessId), eq(faqsTable.active, true)));

  await logMessage(customer.id, businessId, "inbound", text, "none");

  // Global duplicate guard for non-guided chat (FAQ/service/greeting path).
  // Guided flow has its own dedupe logic in guided-menu.
  {
    const meta = parseFlowMeta((customer as { flowData?: string | null }).flowData);
    const now = Date.now();

    // Per-customer rate limit: max 15 inbound msgs per minute per business+phone.
    const windowStart = typeof meta["rlWindowStartAt"] === "number" ? meta["rlWindowStartAt"] : 0;
    const withinWindow = windowStart > 0 && now - windowStart < CUSTOMER_RATE_LIMIT_WINDOW_MS;
    const nextCount = withinWindow
      ? (typeof meta["rlCount"] === "number" ? meta["rlCount"] : 0) + 1
      : 1;
    meta["rlWindowStartAt"] = withinWindow ? windowStart : now;
    meta["rlCount"] = nextCount;

    if (nextCount > CUSTOMER_RATE_LIMIT_MAX) {
      const lastWarnAt = typeof meta["rlLastWarnAt"] === "number" ? meta["rlLastWarnAt"] : 0;
      if (!withinWindow || lastWarnAt < (meta["rlWindowStartAt"] as number)) {
        meta["rlLastWarnAt"] = now;
        await db.update(customersTable)
          .set({ flowData: JSON.stringify(meta) })
          .where(eq(customersTable.id, customer.id));
        const reply = "You're sending messages too quickly. Please wait a minute and try again.";
        const result = await sendWhatsAppMessage(phone, reply, creds);
        if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
        await logMessage(customer.id, businessId, "outbound", reply, "none");
      } else {
        await db.update(customersTable)
          .set({ flowData: JSON.stringify(meta) })
          .where(eq(customersTable.id, customer.id));
        logger.info({ phone, businessId }, "Rate-limited message suppressed (no outbound reply)");
      }
      return;
    }

    if (!customer.flowState) {
    const normalized = normalizeIncomingText(text);
    const lastText = typeof meta["lastGlobalText"] === "string" ? meta["lastGlobalText"] : "";
    const lastAt = typeof meta["lastGlobalTextAt"] === "number" ? meta["lastGlobalTextAt"] : 0;
    const lastHintAt = typeof meta["lastGlobalDuplicateHintAt"] === "number" ? meta["lastGlobalDuplicateHintAt"] : 0;
    const isDuplicate = normalized.length > 0 && normalized === lastText && lastAt > 0 && now - lastAt <= GLOBAL_DUPLICATE_WINDOW_MS;

    meta["lastGlobalText"] = normalized;
    meta["lastGlobalTextAt"] = now;
    await db.update(customersTable)
      .set({ flowData: JSON.stringify(meta) })
      .where(eq(customersTable.id, customer.id));

    if (isDuplicate) {
      if (lastHintAt <= 0 || now - lastHintAt > GLOBAL_DUPLICATE_HINT_COOLDOWN_MS) {
        meta["lastGlobalDuplicateHintAt"] = now;
        await db.update(customersTable)
          .set({ flowData: JSON.stringify(meta) })
          .where(eq(customersTable.id, customer.id));
        const reply = "I already got that message. Please wait a moment or choose the next option.";
        const result = await sendWhatsAppMessage(phone, reply, creds);
        if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
        await logMessage(customer.id, businessId, "outbound", reply, "none");
      } else {
        logger.info({ phone, businessId }, "Global duplicate message suppressed (no outbound reply)");
      }
      return;
    }
    }
  }

  // ── Rating reply ──────────────────────────────────────────────────────────
  const ratingValue = detectRatingReply(text);
  if (ratingValue !== null) {
    const [pendingRatingBooking] = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.customerId, customer.id),
          eq(bookingsTable.businessId, businessId),
          isNotNull(bookingsTable.ratingAskedAt),
          isNull(bookingsTable.rating),
        )
      )
      .orderBy(desc(bookingsTable.ratingAskedAt))
      .limit(1);

    if (pendingRatingBooking) {
      await db.update(bookingsTable)
        .set({ rating: ratingValue })
        .where(eq(bookingsTable.id, pendingRatingBooking.id));

      const stars = "⭐".repeat(ratingValue);
      const reply = `Thank you for your ${stars} rating! We really appreciate your feedback and look forward to serving you again. 😊`;
      const result = await sendWhatsAppMessage(phone, reply, creds);
      if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
      await logMessage(customer.id, businessId, "outbound", reply, "rating");
      logger.info({ phone, businessId, rating: ratingValue, bookingId: pendingRatingBooking.id }, "Rating received and saved");
      return;
    }
  }

  const guided = handleGuidedMessage({
    text,
    customer,
    settings: settings ?? {},
    fallbackBusinessName: business.name,
    services,
  });

  if (guided?.handled) {
    await db.update(customersTable)
      .set({
        flowState: guided.flowState,
        flowData: guided.flowData,
        ...(guided.customerName ? { name: guided.customerName } : {}),
      })
      .where(eq(customersTable.id, customer.id));

    if (guided.bookingDraft) {
      await db.insert(bookingsTable).values({
        customerId: customer.id,
        businessId,
        service: guided.bookingDraft.service,
        requestedDate: guided.bookingDraft.requestedDate,
        requestedTime: guided.bookingDraft.requestedTime,
        notes: text,
        status: "pending",
      });
    }

    if (guided.reply.trim().length > 0) {
      const result = await sendWhatsAppMessage(phone, guided.reply, creds);
      if (!result.ok) await recordDeliveryFailure(businessId, phone, guided.reply, result, "bot");
      await logMessage(customer.id, businessId, "outbound", guided.reply, guided.replyType);
    } else {
      logger.info({ phone, businessId }, "Guided duplicate message suppressed (no outbound reply)");
    }
    logger.info({ phone, businessId, flowState: guided.flowState }, "Guided menu flow handled message");
    return;
  }

  if (!customer.flowState && isThankYouMessage(text)) {
    const reply = "You're welcome! Happy to help. Type 'menu' any time for options.";
    const result = await sendWhatsAppMessage(phone, reply, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
    await logMessage(customer.id, businessId, "outbound", reply, "faq");
    logger.info({ phone, businessId }, "Thank-you message handled");
    return;
  }

  if (customer.flowState) {
    const strongFaq = matchFaqWithScore(text, faqs);
    if (strongFaq.faq && strongFaq.score >= 2) {
      const reply = `${strongFaq.faq.answer}\n\nYou can continue your previous step, or type 'menu' to go back.`;
      const result = await sendWhatsAppMessage(phone, reply, creds);
      if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
      await logMessage(customer.id, businessId, "outbound", reply, "faq");
      logger.info({ phone, businessId, faqId: strongFaq.faq.id, flowState: customer.flowState }, "Strong FAQ interruption handled during guided flow");
      return;
    }
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  if (detectGreetingWithCustomKeywords(text, settings?.greetingKeywords)) {
    const reply = getGreetingReply(settings, business.name);
    const result = await sendWhatsAppMessage(phone, reply, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
    await logMessage(customer.id, businessId, "outbound", reply, "faq");
    logger.info({ phone, businessId }, "Greeting detected — no AI call");
    return;
  }

  // ── FAQ match ─────────────────────────────────────────────────────────────
  const matchedFaq = matchFaq(text, faqs);

  if (matchedFaq) {
    await db.update(faqsTable).set({ hitCount: matchedFaq.hitCount + 1 }).where(eq(faqsTable.id, matchedFaq.id));
    const result = await sendWhatsAppMessage(phone, matchedFaq.answer, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, matchedFaq.answer, result, "bot");
    await logMessage(customer.id, businessId, "outbound", matchedFaq.answer, "faq");
    logger.info({ phone, businessId, faqId: matchedFaq.id }, "FAQ match — no AI call");
    return;
  }

  // ── Service match ─────────────────────────────────────────────────────────
  const matchedService = matchService(text, services);

  if (matchedService) {
    const reply = formatServiceReply(matchedService);
    const result = await sendWhatsAppMessage(phone, reply, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
    await logMessage(customer.id, businessId, "outbound", reply, "service");
    logger.info({ phone, businessId, serviceId: matchedService.id }, "Service match — no AI call");
    return;
  }

  // ── Booking intent ────────────────────────────────────────────────────────
  if (detectBookingIntent(text)) {
    const reply = "I'd love to help you book an appointment! Please tell me: what service you need, your preferred date, and time. Our team will confirm shortly. 📅";
    await db.insert(bookingsTable).values({
      customerId: customer.id,
      businessId,
      notes: text,
      status: "pending",
    });
    const result = await sendWhatsAppMessage(phone, reply, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, reply, result, "bot");
    await logMessage(customer.id, businessId, "outbound", reply, "booking");
    logger.info({ phone, businessId }, "Booking intent — no AI call");
    return;
  }

  // ── OpenAI fallback ───────────────────────────────────────────────────────
  if (!aiEnabledForBusiness) {
    const safeReply = getSafeNoMatchReply(settings, business.name);
    const result = await sendWhatsAppMessage(phone, safeReply, creds);
    if (!result.ok) await recordDeliveryFailure(businessId, phone, safeReply, result, "bot");
    await logMessage(customer.id, businessId, "outbound", safeReply, "none");
    logger.info({ phone, businessId }, "No match — AI disabled for business, sent safe no-match reply");
    return;
  }

  logger.info({ phone, businessId }, "No match — calling OpenAI");
  const aiReply = await callOpenAI(text, customer.id, businessId);
  const result = await sendWhatsAppMessage(phone, aiReply, creds);
  if (!result.ok) await recordDeliveryFailure(businessId, phone, aiReply, result, "bot");
  await logMessage(customer.id, businessId, "outbound", aiReply, "ai");
}
