import { Router, type IRouter } from "express";
import { db, faqsTable, servicesTable, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { matchFaq, matchService, detectBookingIntent, detectGreeting, formatServiceReply } from "../lib/faq-matcher";
import { SimulateMessageBody, SimulateMessageResponse } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

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

router.post("/simulate", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const parsed = SimulateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message } = parsed.data;

  if (detectGreeting(message)) {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
    const s = rows[0];
    const name = s?.businessName || "our business";
    const lines = [
      `👋 Hello! Welcome to *${name}*.`,
      `We're happy to help you! You can ask us about:`,
      `• 🕐 Opening hours`,
      `• 📍 Location & directions`,
      `• 💇 Services & pricing`,
      `• 📅 Booking an appointment`,
      `• 💳 Payment methods`,
    ];
    if (s?.openingHours) lines.push(`\nWe're open: ${s.openingHours}`);
    lines.push(`\nJust type your question and we'll reply right away! 😊`);
    const greetingReply = lines.join("\n");
    res.json(SimulateMessageResponse.parse({
      replyType: "faq",
      response: greetingReply,
      matchedFaqId: null,
      matchedFaqQuestion: null,
      matchedServiceId: null,
      matchedServiceName: null,
      aiTokensUsed: null,
    }));
    return;
  }

  const faqs = await db.select().from(faqsTable)
    .where(and(eq(faqsTable.businessId, businessId), eq(faqsTable.active, true)));
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

  const services = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.businessId, businessId), eq(servicesTable.active, true)));
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
      response: "I'd love to help you book an appointment! Please tell me: what service you need, your preferred date, and time. Our team will confirm shortly. 📅",
      matchedFaqId: null,
      matchedFaqQuestion: null,
      matchedServiceId: null,
      matchedServiceName: null,
      aiTokensUsed: null,
    }));
    return;
  }

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
});

export default router;
