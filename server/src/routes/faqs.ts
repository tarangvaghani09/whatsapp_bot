import { Router, type IRouter } from "express";
import { db, faqsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListFaqsResponse,
  CreateFaqBody,
  UpdateFaqBody,
  UpdateFaqParams,
  DeleteFaqParams,
} from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

router.get("/faqs", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);
  const faqs = await db.select().from(faqsTable)
    .where(eq(faqsTable.businessId, businessId))
    .orderBy(faqsTable.createdAt);
  res.json(ListFaqsResponse.parse(faqs));
});

router.post("/faqs", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const parsed = CreateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [faq] = await db.insert(faqsTable).values({ ...parsed.data, businessId }).returning();
  res.status(201).json(faq);
});

router.patch("/faqs/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = UpdateFaqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [faq] = await db.update(faqsTable).set(parsed.data)
    .where(and(eq(faqsTable.id, params.data.id), eq(faqsTable.businessId, businessId)))
    .returning();
  if (!faq) {
    res.status(404).json({ error: "FAQ not found" });
    return;
  }

  res.json(faq);
});

router.delete("/faqs/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = DeleteFaqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [faq] = await db.delete(faqsTable)
    .where(and(eq(faqsTable.id, params.data.id), eq(faqsTable.businessId, businessId)))
    .returning();
  if (!faq) {
    res.status(404).json({ error: "FAQ not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
