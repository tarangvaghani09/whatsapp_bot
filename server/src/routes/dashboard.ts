import { Router, type IRouter } from "express";
import { db, botMessagesTable, customersTable, bookingsTable, aiUsageTable } from "@workspace/db";
import { eq, and, count, sum, sql, avg, isNotNull } from "drizzle-orm";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    msgStats,
    totalCustomers,
    pendingBookings,
    completedBookings,
    avgRatingResult,
    aiStats,
    todayMessages,
  ] = await Promise.all([
    db
      .select({ replyType: botMessagesTable.replyType, cnt: count() })
      .from(botMessagesTable)
      .where(and(eq(botMessagesTable.businessId, businessId), eq(botMessagesTable.direction, "outbound")))
      .groupBy(botMessagesTable.replyType),
    db.select({ count: count() }).from(customersTable).where(eq(customersTable.businessId, businessId)),
    db.select({ count: count() }).from(bookingsTable).where(and(eq(bookingsTable.businessId, businessId), eq(bookingsTable.status, "pending"))),
    db.select({ count: count() }).from(bookingsTable).where(and(eq(bookingsTable.businessId, businessId), eq(bookingsTable.status, "completed"))),
    db
      .select({ avg: avg(bookingsTable.rating) })
      .from(bookingsTable)
      .where(and(eq(bookingsTable.businessId, businessId), isNotNull(bookingsTable.rating))),
    db.select({ totalCost: sum(aiUsageTable.estimatedCost), totalTokens: sum(aiUsageTable.totalTokens) }).from(aiUsageTable).where(eq(aiUsageTable.businessId, businessId)),
    db.select({ count: count() }).from(botMessagesTable).where(and(eq(botMessagesTable.businessId, businessId), sql`${botMessagesTable.createdAt} >= ${todayStart}`)),
  ]);

  const msgByType: Record<string, number> = {};
  let totalMessages = 0;
  for (const row of msgStats) {
    msgByType[row.replyType] = row.cnt;
    totalMessages += row.cnt;
  }

  const faqCount = msgByType["faq"] ?? 0;
  const serviceCount = msgByType["service"] ?? 0;
  const bookingCount = msgByType["booking"] ?? 0;
  const aiCount = msgByType["ai"] ?? 0;

  const faqSavingsPercent =
    totalMessages > 0 ? Math.round(((faqCount + serviceCount + bookingCount) / totalMessages) * 100) : 0;

  const rawAvg = avgRatingResult[0]?.avg;
  const avgRating = rawAvg != null ? Math.round(Number(rawAvg) * 10) / 10 : null;

  res.json({
    totalMessages,
    messagesFromFaq: faqCount,
    messagesFromService: serviceCount,
    messagesFromBooking: bookingCount,
    messagesFromAi: aiCount,
    totalCustomers: totalCustomers[0]?.count ?? 0,
    pendingBookings: pendingBookings[0]?.count ?? 0,
    completedBookings: completedBookings[0]?.count ?? 0,
    avgRating,
    totalAiCost: Number(aiStats[0]?.totalCost ?? 0),
    totalAiTokens: Number(aiStats[0]?.totalTokens ?? 0),
    faqSavingsPercent,
    todayMessages: todayMessages[0]?.count ?? 0,
  });
});

export default router;
