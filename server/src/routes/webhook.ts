import { Router, type IRouter } from "express";
import { extractMessageFromWebhook } from "../lib/whatsapp";
import { handleIncomingMessage } from "../lib/bot-handler";
import { logger } from "../lib/logger";
import { db, businessesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/webhook", async (req, res): Promise<void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"];

  if (mode !== "subscribe" || !token) {
    res.sendStatus(403);
    return;
  }

  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (envToken && token === envToken) {
    req.log.info("WhatsApp webhook verified via env token");
    res.status(200).send(challenge);
    return;
  }

  const match = await db.select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.verifyToken, token))
    .limit(1);

  if (match[0]) {
    req.log.info({ businessId: match[0].id }, "WhatsApp webhook verified via business token");
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

router.post("/webhook", async (req, res): Promise<void> => {
  res.sendStatus(200);

  const msg = extractMessageFromWebhook(req.body);
  if (!msg) return;

  try {
    await handleIncomingMessage(msg.from, msg.text, msg.phoneNumberId);
  } catch (err) {
    logger.error({ err }, "Error handling incoming message");
  }
});

export default router;
