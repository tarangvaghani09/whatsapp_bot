import type { Faq } from "@workspace/db";
import type { Service } from "@workspace/db";

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function scoreKeywords(message: string, keywords: string[]): number {
  const normalized = normalizeText(message);
  let score = 0;
  for (const keyword of keywords) {
    const kw = normalizeText(keyword);
    if (!kw) continue;
    if (normalized.includes(kw)) {
      score += kw.split(/\s+/).length;
    }
  }
  return score;
}

export function matchFaq(message: string, faqs: Faq[]): Faq | null {
  const active = faqs.filter((f) => f.active);
  let bestFaq: Faq | null = null;
  let bestScore = 0;

  for (const faq of active) {
    const score = scoreKeywords(message, faq.keywords ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  return bestScore >= 1 ? bestFaq : null;
}

export function matchService(message: string, services: Service[]): Service | null {
  const active = services.filter((s) => s.active);
  let bestService: Service | null = null;
  let bestScore = 0;

  for (const service of active) {
    const score = scoreKeywords(message, service.keywords ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestService = service;
    }
  }

  return bestScore >= 1 ? bestService : null;
}

const GREETING_PATTERNS = [
  /^h+i+[!.? ]*$/i,
  /^hey+[!.? ]*$/i,
  /^hello+[!.? ]*$/i,
  /^hola[!.? ]*$/i,
  /^howdy[!.? ]*$/i,
  /^greetings?[!.? ]*$/i,
  /^good\s*(morning|afternoon|evening|day)[!.? ]*$/i,
  /^(hi|hey|hello)\s+(there|bot|friend|team|sir|madam|everyone|all)[!.? ]*$/i,
  /^what'?s?\s+up[!.? ]*$/i,
  /^sup[!.? ]*$/i,
  /^yo+[!.? ]*$/i,
  /^namaste[!.? ]*$/i,
  /^salam[!.? ]*$/i,
  /^assalamu?[!.? ]*$/i,
];

export function detectGreeting(message: string): boolean {
  const trimmed = message.trim();
  return GREETING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseGreetingKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

export function detectGreetingWithCustomKeywords(message: string, rawKeywords: string | null | undefined): boolean {
  if (detectGreeting(message)) return true;
  const normalized = normalizeText(message);
  if (!normalized) return false;
  const words = parseGreetingKeywords(rawKeywords);
  if (words.length === 0) return false;
  return words.some((word) => normalized === word);
}

export function detectBookingIntent(message: string): boolean {
  const bookingKeywords = [
    "book",
    "appointment",
    "schedule",
    "reserve",
    "slot",
    "available",
    "booking",
    "appoint",
    "visit",
    "come in",
    "can i come",
    "want to come",
    "make appointment",
  ];
  const normalized = normalizeText(message);
  return bookingKeywords.some((kw) => normalized.includes(kw));
}

export function formatServiceReply(service: Service): string {
  const parts: string[] = [`*${service.name}*`];
  if (service.description) parts.push(service.description);
  if (service.price != null) parts.push(`Price: ${service.price}`);
  if (service.duration != null) parts.push(`Duration: ${service.duration} min`);
  return parts.join("\n");
}
