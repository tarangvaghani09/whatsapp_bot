import { Router, type IRouter } from "express";
import { extractMessageFromWebhook } from "../lib/whatsapp";
import { handleIncomingMessage } from "../lib/bot-handler";
import { logger } from "../lib/logger";
import { db, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const router: IRouter = Router();
const inboundQueues = new Map<string, Promise<void>>();

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
  const appSecret = process.env["WHATSAPP_APP_SECRET"];
  const requireSignature =
    process.env["WHATSAPP_REQUIRE_SIGNATURE"] === "false"
      ? false
      : process.env["NODE_ENV"] === "production";

  if (requireSignature && !appSecret) {
    logger.error("WHATSAPP_APP_SECRET is missing while webhook signature is required");
    res.sendStatus(503);
    return;
  }

  if (appSecret) {
    const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
    const signature = req.header("x-hub-signature-256");
    if (!rawBody || !signature || !signature.startsWith("sha256=")) {
      res.sendStatus(403);
      return;
    }

    const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.sendStatus(403);
      return;
    }
  }

  res.sendStatus(200);

  const msg = extractMessageFromWebhook(req.body);
  if (!msg) return;

  const queueKey = `${msg.phoneNumberId}:${msg.from}`;
  const prev = inboundQueues.get(queueKey) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(async () => {
      try {
        await handleIncomingMessage(
          msg.from,
          msg.text,
          msg.phoneNumberId,
          msg.messageId,
          msg.messageTimestampMs,
        );
      } catch (err) {
        logger.error({ err }, "Error handling incoming message");
      }
    })
    .finally(() => {
      if (inboundQueues.get(queueKey) === next) inboundQueues.delete(queueKey);
    });

  inboundQueues.set(queueKey, next);
});

export default router;
