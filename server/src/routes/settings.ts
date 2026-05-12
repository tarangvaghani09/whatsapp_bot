import { Router, type IRouter } from "express";
import { db, settingsTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetSettingsResponse, UpdateSettingsBody } from "@workspace/api-zod";
import { BusinessIdQueryParam, resolveBusinessId } from "../lib/resolve-business";

const router: IRouter = Router();

async function getOrCreateSettings(businessId: number) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.businessId, businessId)).limit(1);
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);

  // Backfill old generic settings so each business page shows business-specific identity.
  if (rows[0]) {
    const row = rows[0];
    if (business && row.businessName === "My Business" && business.name !== "My Business") {
      const [updated] = await db
        .update(settingsTable)
        .set({ businessName: business.name })
        .where(eq(settingsTable.id, row.id))
        .returning();
      return updated;
    }
    return row;
  }

  const [created] = await db
    .insert(settingsTable)
    .values({
      businessId,
      businessName: business?.name ?? "My Business",
    })
    .returning();
  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);
  const settings = await getOrCreateSettings(businessId);
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings", async (req, res): Promise<void> => {
  const q = BusinessIdQueryParam.safeParse(req.query);
  const businessId = await resolveBusinessId(q.data?.businessId);

  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateSettings(businessId);

  const [updated] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, existing.id))
    .returning();

  res.json(GetSettingsResponse.parse(updated));
});

export default router;
