import { Router, type IRouter } from "express";
import { db, deliveryFailuresTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

router.get("/delivery-failures", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const rows = await db
    .select()
    .from(deliveryFailuresTable)
    .where(and(eq(deliveryFailuresTable.businessId, businessId), isNull(deliveryFailuresTable.resolvedAt)))
    .orderBy(desc(deliveryFailuresTable.createdAt))
    .limit(100);

  res.json(rows);
});

router.delete("/delivery-failures/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(deliveryFailuresTable)
    .set({ resolvedAt: new Date() })
    .where(and(eq(deliveryFailuresTable.id, id), eq(deliveryFailuresTable.businessId, businessId)));

  res.sendStatus(204);
});

router.post("/delivery-failures/dismiss-all", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(req, q.data?.businessId);

  await db
    .update(deliveryFailuresTable)
    .set({ resolvedAt: new Date() })
    .where(and(eq(deliveryFailuresTable.businessId, businessId), isNull(deliveryFailuresTable.resolvedAt)));

  res.sendStatus(204);
});

export default router;
