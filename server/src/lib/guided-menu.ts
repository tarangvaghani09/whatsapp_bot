import { detectGreetingWithCustomKeywords } from "./faq-matcher";

export type MenuAction = "services" | "booking" | "hours" | "location" | "payment" | "staff" | "unknown";

export type MenuOption = {
  label: string;
  action: MenuAction;
};

export type ConversationFlowState =
  | "awaiting_menu_option"
  | "awaiting_service_category"
  | "awaiting_booking_category"
  | "awaiting_booking_service"
  | "awaiting_booking_date"
  | "awaiting_booking_time"
  | "awaiting_booking_name";

type FlowData = {
  intent?: "services" | "booking";
  selectedCategory?: string;
  selectedService?: string;
  requestedDate?: string;
  requestedTime?: string;
  invalidCount?: number;
};

type CustomerFlowCarrier = {
  flowState?: string | null;
  flowData?: string | null;
  name?: string | null;
};

type GuidedSettings = {
  businessName?: string | null;
  businessType?: string | null;
  openingHours?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  paymentMethods?: string | null;
  staffContactMessage?: string | null;
  welcomeMenuMessage?: string | null;
  welcomeMenuOptions?: string | null;
  greetingKeywords?: string | null;
  currency?: string | null;
};

type GuidedService = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  duration?: number | null;
  category?: string | null;
};

export type GuidedReplyResult = {
  handled: boolean;
  reply: string;
  replyType: "faq" | "service" | "booking" | "none";
  flowState: ConversationFlowState | null;
  flowData: string | null;
  bookingDraft?: {
    service?: string;
    requestedDate?: string;
    requestedTime?: string;
  };
  customerName?: string;
};

const DEFAULT_MENU_OPTIONS: MenuOption[] = [
  { label: "Services & Price", action: "services" },
  { label: "Book Appointment", action: "booking" },
  { label: "Business Timing", action: "hours" },
  { label: "Location", action: "location" },
  { label: "Talk to Staff", action: "staff" },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseAction(raw: string): MenuAction {
  const value = normalize(raw);
  if (!value) return "unknown";
  if (value.includes("service") || value.includes("price")) return "services";
  if (value.includes("book") || value.includes("appointment") || value.includes("visit")) return "booking";
  if (value.includes("hour") || value.includes("timing") || value.includes("time")) return "hours";
  if (value.includes("location") || value.includes("direction") || value.includes("address")) return "location";
  if (value.includes("payment") || value.includes("card") || value.includes("upi") || value.includes("cash")) return "payment";
  if (value.includes("staff") || value.includes("reception") || value.includes("support") || value.includes("talk")) return "staff";
  return "unknown";
}

export function parseMenuOptions(raw: string | null | undefined): MenuOption[] {
  const lines = (raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return DEFAULT_MENU_OPTIONS;

  const parsed = lines
    .map((line) => {
      const [labelPart, actionPart] = line.split("|").map((part) => part.trim());
      const label = labelPart || "";
      if (!label) return null;
      return {
        label,
        action: actionPart ? parseAction(actionPart) : parseAction(label),
      } satisfies MenuOption;
    })
    .filter((item): item is MenuOption => Boolean(item));

  return parsed.length > 0 ? parsed : DEFAULT_MENU_OPTIONS;
}

function applyWelcomePlaceholders(template: string, settings: GuidedSettings, fallbackName: string): string {
  const businessName = settings.businessName?.trim() || fallbackName || "our business";
  const openingHours = settings.openingHours?.trim() || "";
  const address = settings.address?.trim() || "";

  return template
    .replaceAll("{businessName}", businessName)
    .replaceAll("{openingHours}", openingHours)
    .replaceAll("{address}", address);
}

function buildBaseGreeting(settings: GuidedSettings, fallbackName: string): string {
  const name = settings.businessName?.trim() || fallbackName || "our business";
  const lines = [
    `Hello! Welcome to *${name}*.`,
    "We're happy to help you!",
  ];
  if (settings.openingHours?.trim()) {
    lines.push(`We're open: ${settings.openingHours.trim()}`);
  }
  return lines.join("\n");
}

export function buildGreetingReply(settings: GuidedSettings, fallbackName: string): string {
  const intro = settings.welcomeMenuMessage?.trim()
    ? applyWelcomePlaceholders(settings.welcomeMenuMessage.trim(), settings, fallbackName)
    : buildBaseGreeting(settings, fallbackName);

  const options = parseMenuOptions(settings.welcomeMenuOptions);
  if (options.length === 0) return intro;

  const optionLines = options.map((option, index) => `${index + 1}. ${option.label}`);
  return `${intro}\n\nPlease choose:\n${optionLines.join("\n")}`;
}

function parseFlowData(raw: string | null | undefined): FlowData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed as FlowData : {};
  } catch {
    return {};
  }
}

function serializeFlowData(data: FlowData | null | undefined): string | null {
  if (!data || Object.keys(data).length === 0) return null;
  return JSON.stringify(data);
}

function resetInvalidCount(data: FlowData): FlowData {
  const next = { ...data };
  delete next.invalidCount;
  return next;
}

function incrementInvalidCount(data: FlowData): FlowData {
  return { ...data, invalidCount: (data.invalidCount ?? 0) + 1 };
}

function withRetryGuard(message: string, data: FlowData): string {
  if ((data.invalidCount ?? 0) < 2) return message;
  return `${message}\n\nI didn't get that. Reply with category number (1-5) or type 'menu' to go back.`;
}

function shouldAutoCancelFlow(data: FlowData): boolean {
  return (data.invalidCount ?? 0) >= 3;
}

function autoCancelReply(): GuidedReplyResult {
  return replyResult(
    "I couldn't understand after multiple tries, so I cancelled this booking flow. Type 'book' to start again or type 'menu' to see options.",
    "booking",
    null,
    null,
  );
}

function autoCancelServiceReply(): GuidedReplyResult {
  return replyResult(
    "I couldn't understand after multiple tries, so I cancelled this flow. Type 'services' to start again or type 'menu' to see options.",
    "service",
    null,
    null,
  );
}

function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInput(raw: string): { ok: true; date: Date; normalized: string } | { ok: false } {
  const value = raw.trim().toLowerCase();
  const today = startOfDay(new Date());
  if (value === "today") return { ok: true, date: today, normalized: formatDateYmd(today) };
  if (value === "tomorrow") {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return { ok: true, date: t, normalized: formatDateYmd(t) };
  }

  const input = raw.trim();
  const ymd = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return { ok: true, date, normalized: formatDateYmd(date) };
    }
    return { ok: false };
  }

  // Accept DD-MM-YYYY, DD/MM/YYYY, and DD-MM or DD/MM (defaults to current year)
  const dmy = input.match(/^(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{4}))?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = dmy[3] ? Number(dmy[3]) : today.getFullYear();
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return { ok: true, date, normalized: formatDateYmd(date) };
    }
    return { ok: false };
  }

  return { ok: false };
}

function parseTimeInput(raw: string): { ok: true; minutes: number; normalized: string } | { ok: false } {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  const m12 = value.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (m12) {
    let hour = Number(m12[1]);
    const minute = Number(m12[2] ?? "00");
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return { ok: false };
    const meridian = m12[3];
    let hour24 = hour % 12;
    if (meridian === "pm") hour24 += 12;
    const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${meridian.toUpperCase()}`;
    return { ok: true, minutes: hour24 * 60 + minute, normalized };
  }

  const m24 = value.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour24 = Number(m24[1]);
    const minute = Number(m24[2]);
    if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return { ok: false };
    const meridian = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const normalized = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${meridian}`;
    return { ok: true, minutes: hour24 * 60 + minute, normalized };
  }

  return { ok: false };
}

function parseDayToken(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (t.startsWith("sun")) return 0;
  if (t.startsWith("mon")) return 1;
  if (t.startsWith("tue")) return 2;
  if (t.startsWith("wed")) return 3;
  if (t.startsWith("thu")) return 4;
  if (t.startsWith("fri")) return 5;
  if (t.startsWith("sat")) return 6;
  return null;
}

function parseHourToMinutes(token: string): number | null {
  const v = token.trim().toLowerCase();
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "00");
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;
  let h24 = h % 12;
  if (m[3] === "pm") h24 += 12;
  return h24 * 60 + min;
}

function parseBusinessHours(openingHours: string | null | undefined): Map<number, { open: number; close: number } | null | undefined> {
  const schedule = new Map<number, { open: number; close: number } | null | undefined>();
  for (let i = 0; i < 7; i += 1) schedule.set(i, undefined);
  if (!openingHours?.trim()) return schedule;

  const chunks = openingHours.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lower = chunk.toLowerCase();
    if (lower.includes("closed")) {
      const day = parseDayToken(chunk);
      if (day != null) schedule.set(day, null);
      continue;
    }
    const dayRange = chunk.match(/(sun|mon|tue|wed|thu|fri|sat)\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)/i);
    const daySingle = chunk.match(/(sun|mon|tue|wed|thu|fri|sat)/i);
    const timeRange = chunk.match(/(\d{1,2}(?::\d{2})?\s*[ap]m)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i);
    if (!timeRange) continue;
    const open = parseHourToMinutes(timeRange[1].replace(/\s+/g, ""));
    const close = parseHourToMinutes(timeRange[2].replace(/\s+/g, ""));
    if (open == null || close == null || close <= open) continue;

    if (dayRange) {
      const start = parseDayToken(dayRange[1]);
      const end = parseDayToken(dayRange[2]);
      if (start == null || end == null) continue;
      for (let d = start; ; d = (d + 1) % 7) {
        schedule.set(d, { open, close });
        if (d === end) break;
      }
      continue;
    }

    if (daySingle) {
      const day = parseDayToken(daySingle[1]);
      if (day != null) schedule.set(day, { open, close });
    }
  }
  return schedule;
}

function minutesToDisplay(minutes: number): string {
  const m = minutes % 60;
  const h24 = Math.floor(minutes / 60);
  const meridian = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${meridian}`;
}

function findMenuSelection(text: string, options: MenuOption[]): MenuOption | null {
  const trimmed = text.trim();
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= options.length) {
    return options[num - 1] ?? null;
  }

  const normalized = normalize(text);
  return options.find((option) => {
    const label = normalize(option.label);
    return normalized === label || normalized.includes(label) || label.includes(normalized);
  }) ?? null;
}

function currencySymbol(currency: string | null | undefined): string {
  switch ((currency ?? "").toUpperCase()) {
    case "INR": return "Rs";
    case "USD": return "$";
    case "EUR": return "EUR";
    case "GBP": return "GBP";
    default: return currency?.toUpperCase() || "";
  }
}

function formatServiceLine(service: GuidedService, currency: string | null | undefined): string {
  const price = service.price == null ? "Price on request" : `${currencySymbol(currency)} ${service.price}`;
  const duration = service.duration == null ? "" : ` (${service.duration} min)`;
  return `- ${service.name}: ${price}${duration}`;
}

function listCategories(services: GuidedService[]): string[] {
  return [...new Set(
    services
      .map((service) => service.category?.trim())
      .filter((category): category is string => Boolean(category)),
  )];
}

function findCategorySelection(text: string, categories: string[]): string | null {
  const trimmed = text.trim();
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= categories.length) {
    return categories[num - 1] ?? null;
  }

  const normalized = normalize(text);
  return categories.find((category) => {
    const value = normalize(category);
    return normalized === value || normalized.includes(value) || value.includes(normalized);
  }) ?? null;
}

function filterServicesByCategory(services: GuidedService[], category: string | undefined): GuidedService[] {
  if (!category) return services;
  return services.filter((service) => (service.category?.trim() || "") === category);
}

function findServiceSelection(text: string, services: GuidedService[]): GuidedService | null {
  const trimmed = text.trim();
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= services.length) {
    return services[num - 1] ?? null;
  }

  const normalized = normalize(text);
  return services.find((service) => {
    const name = normalize(service.name);
    return normalized === name || normalized.includes(name) || name.includes(normalized);
  }) ?? null;
}

function buildCategoryPrompt(title: string, categories: string[]): string {
  return `${title}\n${categories.map((category, index) => `${index + 1}. ${category}`).join("\n")}`;
}

function buildServiceSelectionPrompt(services: GuidedService[]): string {
  return `Which service do you want?\n${services.map((service, index) => `${index + 1}. ${service.name}`).join("\n")}`;
}

function buildServicesReply(services: GuidedService[], currency: string | null | undefined, category?: string): string {
  const heading = category ? `Here are our ${category} services:` : "Here are our available services:";
  return `${heading}\n${services.map((service) => formatServiceLine(service, currency)).join("\n")}`;
}

function buildHoursReply(settings: GuidedSettings): string {
  return settings.openingHours?.trim()
    ? `Our timing is: ${settings.openingHours.trim()}`
    : "Please contact us for the latest business timing.";
}

function buildLocationReply(settings: GuidedSettings): string {
  return settings.address?.trim()
    ? `You can find us at: ${settings.address.trim()}`
    : "Please contact us for our current location and directions.";
}

function buildPaymentReply(settings: GuidedSettings): string {
  return settings.paymentMethods?.trim()
    ? settings.paymentMethods.trim()
    : "Please contact us to confirm available payment methods.";
}

function buildStaffReply(settings: GuidedSettings): string {
  if (settings.staffContactMessage?.trim()) return settings.staffContactMessage.trim();
  if (settings.phone?.trim()) return `Please contact our team at ${settings.phone.trim()} and we'll help you right away.`;
  if (settings.email?.trim()) return `Please email our team at ${settings.email.trim()} and we'll help you right away.`;
  return "Our staff will be happy to help. Please contact our front desk for assistance.";
}

function replyResult(
  reply: string,
  replyType: GuidedReplyResult["replyType"],
  flowState: ConversationFlowState | null,
  flowData?: FlowData | null,
  extras?: Pick<GuidedReplyResult, "bookingDraft" | "customerName">,
): GuidedReplyResult {
  return {
    handled: true,
    reply,
    replyType,
    flowState,
    flowData: serializeFlowData(flowData),
    ...extras,
  };
}

function handleMenuAction(
  action: MenuAction,
  settings: GuidedSettings,
  services: GuidedService[],
): GuidedReplyResult | null {
  const categories = listCategories(services);

  switch (action) {
    case "services":
      if (categories.length > 1) {
        return replyResult(
          buildCategoryPrompt("Choose a service category:", categories),
          "service",
          "awaiting_service_category",
          { intent: "services" },
        );
      }
      return replyResult(buildServicesReply(services, settings.currency), "service", null, null);

    case "booking":
      if (services.length === 0) {
        return replyResult("We don't have bookable services configured yet. Please contact our team directly.", "booking", null, null);
      }
      if (categories.length > 1) {
        return replyResult(
          buildCategoryPrompt("Choose a booking category:", categories),
          "booking",
          "awaiting_booking_category",
          { intent: "booking" },
        );
      }
      return replyResult(
        buildServiceSelectionPrompt(services),
        "booking",
        "awaiting_booking_service",
        { intent: "booking" },
      );

    case "hours":
      return replyResult(buildHoursReply(settings), "faq", null, null);
    case "location":
      return replyResult(buildLocationReply(settings), "faq", null, null);
    case "payment":
      return replyResult(buildPaymentReply(settings), "faq", null, null);
    case "staff":
      return replyResult(buildStaffReply(settings), "none", null, null);
    default:
      return null;
  }
}

export function handleGuidedMessage(params: {
  text: string;
  customer: CustomerFlowCarrier;
  settings: GuidedSettings;
  fallbackBusinessName: string;
  services: GuidedService[];
}): GuidedReplyResult | null {
  const { text, customer, settings, fallbackBusinessName, services } = params;
  const menuOptions = parseMenuOptions(settings.welcomeMenuOptions);
  const flowData = parseFlowData(customer.flowData);
  const currentState = customer.flowState as ConversationFlowState | null;
  const normalizedText = normalize(text);

  if (detectGreetingWithCustomKeywords(text, settings.greetingKeywords)) {
    return replyResult(
      buildGreetingReply(settings, fallbackBusinessName),
      "faq",
      "awaiting_menu_option",
      {},
    );
  }

  if (normalizedText === "cancel") {
    return replyResult("Okay, cancelled. Type 'hi' any time to start again.", "none", null, null);
  }

  if (normalizedText === "menu") {
    return replyResult(buildGreetingReply(settings, fallbackBusinessName), "faq", "awaiting_menu_option", {});
  }

  const directMenuSelection = findMenuSelection(text, menuOptions);
  const shouldUseGlobalMenuSelection =
    !currentState ||
    currentState === "awaiting_menu_option" ||
    (directMenuSelection != null && normalize(directMenuSelection.label) === normalizedText);

  if (shouldUseGlobalMenuSelection && directMenuSelection) {
    return handleMenuAction(directMenuSelection.action, settings, services);
  }

  if (currentState === "awaiting_menu_option") {
    const selection = directMenuSelection;
    if (!selection) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) {
        return replyResult(
          "I couldn't understand after multiple tries, so I cancelled this flow. Type 'hi' or 'menu' to start again.",
          "none",
          null,
          null,
        );
      }
      return replyResult(
        withRetryGuard("Please choose an option from the menu (1-5).", nextData),
        "faq",
        "awaiting_menu_option",
        nextData,
      );
    }
    return handleMenuAction(selection.action, settings, services);
  }

  if (!currentState) {
    return null;
  }

  if (normalizedText === "back") {
    if (currentState === "awaiting_service_category") {
      return replyResult(buildGreetingReply(settings, fallbackBusinessName), "faq", "awaiting_menu_option", {});
    }
    if (currentState === "awaiting_booking_category") {
      return replyResult(buildGreetingReply(settings, fallbackBusinessName), "faq", "awaiting_menu_option", {});
    }
    if (currentState === "awaiting_booking_service") {
      if (flowData.selectedCategory) {
        const categories = listCategories(services);
        return replyResult(buildCategoryPrompt("Choose a booking category:", categories), "booking", "awaiting_booking_category", { intent: "booking" });
      }
      return replyResult(buildGreetingReply(settings, fallbackBusinessName), "faq", "awaiting_menu_option", {});
    }
    if (currentState === "awaiting_booking_date") {
      const filtered = filterServicesByCategory(services, flowData.selectedCategory);
      return replyResult(buildServiceSelectionPrompt(filtered), "booking", "awaiting_booking_service", resetInvalidCount(flowData));
    }
    if (currentState === "awaiting_booking_time") {
      return replyResult("Please send your preferred date.", "booking", "awaiting_booking_date", resetInvalidCount(flowData));
    }
    if (currentState === "awaiting_booking_name") {
      return replyResult("Please send your preferred time.", "booking", "awaiting_booking_time", resetInvalidCount(flowData));
    }
  }

  if (currentState === "awaiting_service_category") {
    const categories = listCategories(services);
    const category = findCategorySelection(text, categories);
    if (!category) {
      const nextData = incrementInvalidCount({ ...flowData, intent: "services" });
      if (shouldAutoCancelFlow(nextData)) return autoCancelServiceReply();
      return replyResult(withRetryGuard(buildCategoryPrompt("Choose a service category:", categories), nextData), "service", currentState, nextData);
    }
    const filtered = filterServicesByCategory(services, category);
    return replyResult(buildServicesReply(filtered, settings.currency, category), "service", null, null);
  }

  if (currentState === "awaiting_booking_category") {
    const categories = listCategories(services);
    const category = findCategorySelection(text, categories);
    if (!category) {
      const nextData = incrementInvalidCount({ ...flowData, intent: "booking" });
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(withRetryGuard(buildCategoryPrompt("Choose a booking category:", categories), nextData), "booking", currentState, nextData);
    }
    const filtered = filterServicesByCategory(services, category);
    return replyResult(
      buildServiceSelectionPrompt(filtered),
      "booking",
      "awaiting_booking_service",
      resetInvalidCount({ ...flowData, intent: "booking", selectedCategory: category }),
    );
  }

  if (currentState === "awaiting_booking_service") {
    const filtered = filterServicesByCategory(services, flowData.selectedCategory);
    const selectedService = findServiceSelection(text, filtered);
    if (!selectedService) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(
        withRetryGuard(buildServiceSelectionPrompt(filtered), nextData),
        "booking",
        currentState,
        nextData,
      );
    }
    return replyResult(
      `Great choice. Please send your preferred date for ${selectedService.name}.`,
      "booking",
      "awaiting_booking_date",
      resetInvalidCount({ ...flowData, selectedService: selectedService.name }),
    );
  }

  if (currentState === "awaiting_booking_date") {
    const parsedDate = parseDateInput(text.trim());
    if (!parsedDate.ok) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(
        withRetryGuard("Please enter a valid date: DD-MM, DD-MM-YYYY, YYYY-MM-DD, today, or tomorrow.", nextData),
        "booking",
        "awaiting_booking_date",
        nextData,
      );
    }
    const today = startOfDay(new Date());
    if (parsedDate.date < today) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(
        withRetryGuard("That date is in the past. Please choose today, tomorrow, or a future date.", nextData),
        "booking",
        "awaiting_booking_date",
        nextData,
      );
    }
    const schedule = parseBusinessHours(settings.openingHours);
    const hasParsedHours = [...schedule.values()].some((v) => v && typeof v.open === "number" && typeof v.close === "number");
    const daySchedule = schedule.get(parsedDate.date.getDay());
    if (hasParsedHours && daySchedule === null) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(
        withRetryGuard("We are closed on that day. Please choose another date.", nextData),
        "booking",
        "awaiting_booking_date",
        nextData,
      );
    }
    return replyResult(
      "Please send your preferred time.",
      "booking",
      "awaiting_booking_time",
      resetInvalidCount({ ...flowData, requestedDate: parsedDate.normalized }),
    );
  }

  if (currentState === "awaiting_booking_time") {
    const parsedTime = parseTimeInput(text.trim());
    if (!parsedTime.ok) {
      const nextData = incrementInvalidCount(flowData);
      if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
      return replyResult(
        withRetryGuard("Please enter a valid time like 04:00 PM or 16:00.", nextData),
        "booking",
        "awaiting_booking_time",
        nextData,
      );
    }
    if (flowData.requestedDate) {
      const date = parseDateInput(flowData.requestedDate);
      if (date.ok) {
        const today = startOfDay(new Date());
        if (date.date.getTime() === today.getTime()) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          if (parsedTime.minutes <= nowMinutes) {
            const nextData = incrementInvalidCount(flowData);
            if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
            return replyResult(
              withRetryGuard(`That time has already passed for today. Please choose a future time (for example ${minutesToDisplay(nowMinutes + 15)}).`, nextData),
              "booking",
              "awaiting_booking_time",
              nextData,
            );
          }
        }
        const schedule = parseBusinessHours(settings.openingHours);
        const hasParsedHours = [...schedule.values()].some((v) => v && typeof v.open === "number" && typeof v.close === "number");
        const daySchedule = schedule.get(date.date.getDay());
        if (hasParsedHours && daySchedule && (parsedTime.minutes < daySchedule.open || parsedTime.minutes > daySchedule.close)) {
          const nextData = incrementInvalidCount(flowData);
          if (shouldAutoCancelFlow(nextData)) return autoCancelReply();
          const nearest = parsedTime.minutes < daySchedule.open ? daySchedule.open : daySchedule.close;
          return replyResult(
            withRetryGuard(`That time is outside our opening hours for that day. Please choose between ${minutesToDisplay(daySchedule.open)} and ${minutesToDisplay(daySchedule.close)} (try ${minutesToDisplay(nearest)}).`, nextData),
            "booking",
            "awaiting_booking_time",
            nextData,
          );
        }
      }
    }
    return replyResult(
      "Please send your name.",
      "booking",
      "awaiting_booking_name",
      resetInvalidCount({ ...flowData, requestedDate: flowData.requestedDate, requestedTime: parsedTime.normalized }),
    );
  }

  if (currentState === "awaiting_booking_name") {
    return replyResult(
      "Your booking request is received. Our team will confirm shortly.",
      "booking",
      null,
      null,
      {
        bookingDraft: {
          service: flowData.selectedService,
          requestedDate: flowData.requestedDate,
          requestedTime: flowData.requestedTime,
        },
        customerName: text.trim(),
      },
    );
  }

  return null;
}
