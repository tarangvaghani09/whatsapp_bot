import { Router, type IRouter } from "express";
import { db, aiUsageTable, customersTable } from "@workspace/db";
import { eq, and, desc, count, sum } from "drizzle-orm";
import { ListAiUsageQueryParams } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

router.get("/ai-usage", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const query = ListAiUsageQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, limit } = query.data;
  const offset = (page - 1) * limit;

  const businessFilter = eq(aiUsageTable.businessId, businessId);

  const [logs, [{ total }], [totals]] = await Promise.all([
    db
      .select({
        id: aiUsageTable.id,
        customerId: aiUsageTable.customerId,
        customerPhone: customersTable.phone,
        prompt: aiUsageTable.prompt,
        response: aiUsageTable.response,
        promptTokens: aiUsageTable.promptTokens,
        completionTokens: aiUsageTable.completionTokens,
        totalTokens: aiUsageTable.totalTokens,
        estimatedCost: aiUsageTable.estimatedCost,
        createdAt: aiUsageTable.createdAt,
      })
      .from(aiUsageTable)
      .leftJoin(customersTable, eq(aiUsageTable.customerId, customersTable.id))
      .where(businessFilter)
      .orderBy(desc(aiUsageTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(aiUsageTable).where(businessFilter),
    db.select({ totalCost: sum(aiUsageTable.estimatedCost), totalTokens: sum(aiUsageTable.totalTokens) }).from(aiUsageTable).where(businessFilter),
  ]);

  res.json({
    logs: logs.map((l) => ({ ...l, estimatedCost: Number(l.estimatedCost) })),
    total,
    totalCost: Number(totals?.totalCost ?? 0),
    totalTokens: Number(totals?.totalTokens ?? 0),
    page,
    limit,
  });
});

export default router;
