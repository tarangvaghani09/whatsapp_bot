import { logger } from "./logger";

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

export type BusinessCreds = {
  phoneNumberId: string;
  accessToken: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; status: number; errorBody: string };

export async function sendWhatsAppMessage(to: string, message: string, creds?: BusinessCreds): Promise<SendResult> {
  const phoneNumberId = creds?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = creds?.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    logger.warn("WhatsApp credentials not configured — skipping send");
    return { ok: false, status: 0, errorBody: "WhatsApp credentials not configured" };
  }

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "WhatsApp send failed");
    return { ok: false, status: res.status, errorBody: body };
  }

  return { ok: true };
}

export function extractMessageFromWebhook(body: unknown): { from: string; text: string; phoneNumberId: string } | null {
  try {
    const entry = (body as any)?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const msg = value?.messages?.[0];
    const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;

    if (!msg || msg.type !== "text" || !phoneNumberId) return null;

    return {
      from: msg.from as string,
      text: (msg.text?.body ?? "") as string,
      phoneNumberId,
    };
  } catch {
    return null;
  }
}
