import { Router, type IRouter } from "express";
import { db, botMessagesTable } from "@workspace/db";
import { eq, and, desc, count, gte } from "drizzle-orm";
import { ListMessagesQueryParams } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

router.get("/messages/unread-count", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const sinceRaw = typeof req.query.since === "string" ? req.query.since : null;
  const since = sinceRaw ? new Date(sinceRaw) : null;

  const conditions = [
    eq(botMessagesTable.businessId, businessId),
    eq(botMessagesTable.direction, "inbound"),
    ...(since && !isNaN(since.getTime()) ? [gte(botMessagesTable.createdAt, since)] : []),
  ];

  const [{ total }] = await db
    .select({ total: count() })
    .from(botMessagesTable)
    .where(and(...conditions as Parameters<typeof and>));

  res.json({ count: total ?? 0 });
});

router.get("/messages", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, limit, customerId } = query.data;
  const offset = (page - 1) * limit;

  const baseCondition = eq(botMessagesTable.businessId, businessId);
  const conditions = customerId
    ? and(baseCondition, eq(botMessagesTable.customerId, customerId))
    : baseCondition;

  const [messages, [{ total }]] = await Promise.all([
    db
      .select()
      .from(botMessagesTable)
      .where(conditions)
      .orderBy(desc(botMessagesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(botMessagesTable).where(conditions),
  ]);

  res.json({ messages, total, page, limit });
});

export default router;
