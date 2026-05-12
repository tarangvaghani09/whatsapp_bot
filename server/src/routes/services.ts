import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListServicesResponse,
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  DeleteServiceParams,
} from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

function coerceService(s: typeof servicesTable.$inferSelect) {
  return {
    ...s,
    price: s.price != null ? parseFloat(s.price as unknown as string) : null,
  };
}

router.get("/services", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);
  const services = await db.select().from(servicesTable)
    .where(eq(servicesTable.businessId, businessId))
    .orderBy(servicesTable.createdAt);
  res.json(ListServicesResponse.parse(services.map(coerceService)));
});

router.post("/services", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price: rawPrice, ...rest } = parsed.data;
  const [service] = await db
    .insert(servicesTable)
    .values({ ...rest, businessId, ...(rawPrice !== undefined ? { price: String(rawPrice) } : {}) })
    .returning();
  res.status(201).json(coerceService(service));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, ...rest } = parsed.data;
  const [service] = await db
    .update(servicesTable)
    .set({ ...rest, ...(price !== undefined ? { price: String(price) } : {}) })
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.businessId, businessId)))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(coerceService(service));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [service] = await db
    .delete(servicesTable)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.businessId, businessId)))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
