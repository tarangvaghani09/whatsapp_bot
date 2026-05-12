import { Router, type IRouter } from "express";
import { db, cannedResponsesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

const CannedResponseBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/canned-responses", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);
  const rows = await db.select().from(cannedResponsesTable)
    .where(eq(cannedResponsesTable.businessId, businessId))
    .orderBy(cannedResponsesTable.createdAt);
  res.json(rows);
});

router.post("/canned-responses", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const parsed = CannedResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.insert(cannedResponsesTable)
    .values({ ...parsed.data, businessId })
    .returning();
  res.status(201).json(row);
});

router.patch("/canned-responses/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = CannedResponseBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.update(cannedResponsesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(cannedResponsesTable.id, params.data.id), eq(cannedResponsesTable.businessId, businessId)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/canned-responses/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db.delete(cannedResponsesTable)
    .where(and(eq(cannedResponsesTable.id, params.data.id), eq(cannedResponsesTable.businessId, businessId)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
