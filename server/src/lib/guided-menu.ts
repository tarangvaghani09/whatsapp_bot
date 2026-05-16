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
      return null;
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
    return replyResult(
      "Please send your preferred time.",
      "booking",
      "awaiting_booking_time",
      resetInvalidCount({ ...flowData, requestedDate: text.trim() }),
    );
  }

  if (currentState === "awaiting_booking_time") {
    return replyResult(
      "Please send your name.",
      "booking",
      "awaiting_booking_name",
      resetInvalidCount({ ...flowData, requestedDate: flowData.requestedDate, requestedTime: text.trim() }),
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
