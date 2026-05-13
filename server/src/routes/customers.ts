import { Router, type IRouter } from "express";
import { db, customersTable, botMessagesTable, businessesTable, deliveryFailuresTable } from "@workspace/db";
import { eq, and, desc, count, sql, ilike, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { ListCustomersQueryParams, GetCustomerParams } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";
import { sendWhatsAppMessage, type BusinessCreds } from "../lib/whatsapp";
import { logger } from "../lib/logger";
import { decryptSecret } from "../lib/secrets";

const router: IRouter = Router();

router.get("/customers/stats", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

  const [total, newToday, newThisWeek, activeToday] = await Promise.all([
    db.select({ count: count() }).from(customersTable).where(eq(customersTable.businessId, businessId)),
    db.select({ count: count() }).from(customersTable).where(and(eq(customersTable.businessId, businessId), sql`${customersTable.createdAt} >= ${todayStart}`)),
    db.select({ count: count() }).from(customersTable).where(and(eq(customersTable.businessId, businessId), sql`${customersTable.createdAt} >= ${weekStart}`)),
    db.selectDistinct({ customerId: botMessagesTable.customerId }).from(botMessagesTable).where(and(eq(botMessagesTable.businessId, businessId), sql`${botMessagesTable.createdAt} >= ${todayStart}`)),
  ]);

  res.json({
    total: total[0]?.count ?? 0,
    newToday: newToday[0]?.count ?? 0,
    newThisWeek: newThisWeek[0]?.count ?? 0,
    activeToday: activeToday.length,
  });
});

router.get("/customers", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, limit, search } = query.data;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const offset = (page - 1) * limit;

  const baseCondition = eq(customersTable.businessId, businessId);
  const searchCondition = search
    ? or(ilike(customersTable.phone, `%${search}%`), ilike(customersTable.name, `%${search}%`))
    : undefined;
  const tagCondition = tag
    ? sql`${tag} = ANY(${customersTable.tags})`
    : undefined;

  const conditions = [baseCondition, searchCondition, tagCondition].filter(Boolean);
  const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions as Parameters<typeof and>);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: customersTable.id,
        phone: customersTable.phone,
        name: customersTable.name,
        tags: customersTable.tags,
        createdAt: customersTable.createdAt,
        updatedAt: customersTable.updatedAt,
        messageCount: count(botMessagesTable.id),
        lastMessageAt: sql<string | null>`max(${botMessagesTable.createdAt})`,
      })
      .from(customersTable)
      .leftJoin(
        botMessagesTable,
        and(
          eq(customersTable.id, botMessagesTable.customerId),
          eq(botMessagesTable.businessId, businessId),
        ),
      )
      .where(whereClause)
      .groupBy(customersTable.id)
      .orderBy(desc(customersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(customersTable).where(whereClause),
  ]);

  res.json({ customers: rows, total, page, limit });
});

const PatchTagsBody = z.object({
  tags: z.array(z.string()),
});

router.patch("/customers/:id/tags", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid customer id" }); return; }

  const parsed = PatchTagsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [customer] = await db
    .update(customersTable)
    .set({ tags: parsed.data.tags })
    .where(and(eq(customersTable.id, id), eq(customersTable.businessId, businessId)))
    .returning();

  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const messages = await db
    .select()
    .from(botMessagesTable)
    .where(and(eq(botMessagesTable.customerId, customer.id), eq(botMessagesTable.businessId, businessId)))
    .orderBy(botMessagesTable.createdAt);

  res.json({ ...customer, messages });
});

const QuickReplyBody = z.object({
  message: z.string().min(1),
});

router.post("/customers/:id/reply", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid customer id" });
    return;
  }

  const parsed = QuickReplyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, id), eq(customersTable.businessId, businessId)))
    .limit(1);

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const [business] = await db.select().from(businessesTable)
    .where(eq(businessesTable.id, businessId)).limit(1);

  const creds: BusinessCreds | undefined =
    business?.whatsappPhoneNumberId && business?.whatsappAccessToken
      ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
      : undefined;

  const sendResult = await sendWhatsAppMessage(customer.phone, parsed.data.message, creds);
  if (!sendResult.ok) {
    logger.warn({ customerId: id, status: sendResult.status }, "Quick reply WhatsApp send failed");
    try {
      await db.insert(deliveryFailuresTable).values({
        businessId,
        recipientPhone: customer.phone,
        messagePreview: parsed.data.message.slice(0, 120),
        errorStatus: sendResult.status,
        errorBody: sendResult.errorBody.slice(0, 500),
        context: "manual",
      });
    } catch (err) {
      logger.error({ err }, "Failed to record quick-reply delivery failure");
    }
  }

  const [inserted] = await db.insert(botMessagesTable).values({
    customerId: customer.id,
    businessId,
    direction: "outbound",
    content: parsed.data.message,
    replyType: "broadcast",
  }).returning({ id: botMessagesTable.id });

  logger.info({ customerId: id, phone: customer.phone }, "Quick reply sent");
  res.json({ sent: true, messageId: inserted!.id });
});

const BroadcastBody = z.object({
  customerIds: z.array(z.number().int().positive()).min(1),
  message: z.string().min(1),
});

router.post("/customers/broadcast", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const parsed = BroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerIds, message } = parsed.data;

  const [business] = await db.select().from(businessesTable)
    .where(eq(businessesTable.id, businessId)).limit(1);

  const creds: BusinessCreds | undefined =
    business?.whatsappPhoneNumberId && business?.whatsappAccessToken
      ? { phoneNumberId: business.whatsappPhoneNumberId, accessToken: decryptSecret(business.whatsappAccessToken)! }
      : undefined;

  const customers = await db.select().from(customersTable)
    .where(and(inArray(customersTable.id, customerIds), eq(customersTable.businessId, businessId)));

  let sent = 0;
  let failed = 0;

  await Promise.all(customers.map(async (customer) => {
    try {
      const personalised = message
        .replace(/\{name\}/gi, customer.name ?? customer.phone)
        .replace(/\{phone\}/gi, customer.phone)
        .replace(/\{business\}/gi, business?.name ?? "Us");

      const result = await sendWhatsAppMessage(customer.phone, personalised, creds);
      if (!result.ok) {
        try {
          await db.insert(deliveryFailuresTable).values({
            businessId,
            recipientPhone: customer.phone,
            messagePreview: personalised.slice(0, 120),
            errorStatus: result.status,
            errorBody: result.errorBody.slice(0, 500),
            context: "broadcast",
          });
        } catch (recordErr) {
          logger.error({ recordErr, customerId: customer.id }, "Failed to record broadcast delivery failure");
        }
      }

      await db.insert(botMessagesTable).values({
        customerId: customer.id,
        businessId,
        direction: "outbound",
        content: personalised,
        replyType: "broadcast",
      });

      if (result.ok) sent++;
      else failed++;
      logger.info({ customerId: customer.id, phone: customer.phone, ok: result.ok }, "Broadcast message processed");
    } catch (err) {
      failed++;
      logger.error({ err, customerId: customer.id }, "Broadcast message failed");
    }
  }));

  res.json({ sent, failed, total: customers.length });
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db.select().from(customersTable)
    .where(and(eq(customersTable.id, params.data.id), eq(customersTable.businessId, businessId)))
    .limit(1);
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const messages = await db
    .select()
    .from(botMessagesTable)
    .where(and(eq(botMessagesTable.customerId, customer.id), eq(botMessagesTable.businessId, businessId)))
    .orderBy(botMessagesTable.createdAt);

  res.json({ ...customer, messages });
});

export default router;
