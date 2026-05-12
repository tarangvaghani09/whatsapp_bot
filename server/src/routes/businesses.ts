import { Router, type IRouter } from "express";
import { db, businessesTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateBusinessBody = z.object({
  name: z.string().min(1),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  verifyToken: z.string().optional(),
});

const UpdateBusinessBody = z.object({
  name: z.string().min(1).optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  verifyToken: z.string().optional(),
});

const BusinessIdParam = z.object({ id: z.coerce.number() });

router.get("/businesses", async (_req, res): Promise<void> => {
  const businesses = await db.select().from(businessesTable).orderBy(businessesTable.id);
  res.json(businesses);
});

router.post("/businesses", async (req, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db.insert(businessesTable).values(parsed.data).returning();

  await db.insert(settingsTable).values({ businessId: business.id }).onConflictDoNothing();

  res.status(201).json(business);
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id)).limit(1);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db.update(businessesTable).set(parsed.data).where(eq(businessesTable.id, params.data.id)).returning();
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.delete("/businesses/:id", async (req, res): Promise<void> => {
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db.delete(businessesTable).where(eq(businessesTable.id, params.data.id)).returning();
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
