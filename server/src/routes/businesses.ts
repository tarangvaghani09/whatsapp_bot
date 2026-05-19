import { Router, type IRouter } from "express";
import { db, businessesTable, settingsTable, userBusinessAccessTable, adminUsersTable } from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { encryptSecret, maskSecret } from "../lib/secrets";

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
const CreateBusinessOwnerBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80),
  businessIds: z.array(z.number().int().positive()).min(1),
});
const UpdateBusinessOwnerBody = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).max(80).optional(),
  businessIds: z.array(z.number().int().positive()).optional(),
  isActive: z.boolean().optional(),
});

function toSafeBusiness(b: typeof businessesTable.$inferSelect) {
  return {
    id: b.id,
    name: b.name,
    whatsappPhoneNumberId: b.whatsappPhoneNumberId,
    whatsappAccessToken: maskSecret(b.whatsappAccessToken),
    verifyToken: maskSecret(b.verifyToken),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

router.get("/businesses", async (req, res): Promise<void> => {
  const user = req.authUser;
  if (user?.role === "business_admin") {
    const accessRows = await db
      .select({ businessId: userBusinessAccessTable.businessId })
      .from(userBusinessAccessTable)
      .where(eq(userBusinessAccessTable.userId, user.id));
    const ids = accessRows.map((r) => r.businessId);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    const businesses = await db
      .select()
      .from(businessesTable)
      .where(inArray(businessesTable.id, ids))
      .orderBy(businessesTable.id);
    res.json(businesses.map(toSafeBusiness));
    return;
  }

  const businesses = await db.select().from(businessesTable).orderBy(businessesTable.id);
  res.json(businesses.map(toSafeBusiness));
});

router.post("/businesses", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let encryptedToken: string | undefined;
  try {
    encryptedToken = encryptSecret(parsed.data.whatsappAccessToken?.trim() || undefined);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const businessValues: Partial<typeof businessesTable.$inferInsert> = {
    name: parsed.data.name,
    whatsappPhoneNumberId: parsed.data.whatsappPhoneNumberId?.trim() || undefined,
    whatsappAccessToken: encryptedToken,
    verifyToken: parsed.data.verifyToken?.trim() || undefined,
  };

  const [business] = await db.insert(businessesTable).values(businessValues).returning();
  await db.insert(settingsTable).values({ businessId: business.id }).onConflictDoNothing();
  logger.info(
    { actorId: req.authUser?.id, businessId: business.id, action: "business.create", credsUpdated: !!businessValues.whatsappAccessToken },
    "Business created",
  );
  res.status(201).json(toSafeBusiness(business));
});

router.post("/business-owners", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = CreateBusinessOwnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const name = parsed.data.name.trim();
  const businessIds = [...new Set(parsed.data.businessIds)];

  const [existing] = await db
    .select({ id: adminUsersTable.id, role: adminUsersTable.role })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);

  if (existing) {
    res.status(409).json({
      error:
        existing.role === "super_admin"
          ? "This email already belongs to a super admin."
          : "Business owner email already exists.",
    });
    return;
  }

  const businessRows = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(inArray(businessesTable.id, businessIds));
  if (businessRows.length !== businessIds.length) {
    res.status(400).json({ error: "One or more selected businesses are invalid." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(adminUsersTable)
      .values({
        email,
        passwordHash,
        role: "business_admin",
        name,
      })
      .returning({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name });

    await tx
      .insert(userBusinessAccessTable)
      .values(businessIds.map((businessId) => ({ userId: user.id, businessId })))
      .onConflictDoNothing();

    return user;
  });
  logger.info({ actorId: req.authUser?.id, ownerId: created.id, businessIds, action: "owner.create" }, "Business owner created");
  res.status(201).json({ user: created, businessIds });
});

router.get("/business-owners", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const users = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
      role: adminUsersTable.role,
      isActive: adminUsersTable.isActive,
      createdAt: adminUsersTable.createdAt,
      businessId: userBusinessAccessTable.businessId,
      businessName: businessesTable.name,
    })
    .from(adminUsersTable)
    .leftJoin(userBusinessAccessTable, eq(userBusinessAccessTable.userId, adminUsersTable.id))
    .leftJoin(businessesTable, eq(businessesTable.id, userBusinessAccessTable.businessId))
    .where(or(eq(adminUsersTable.role, "business_admin"), eq(adminUsersTable.role, "super_admin")));

  const grouped = new Map<number, {
    id: number;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    businesses: Array<{ id: number; name: string }>;
  }>();

  for (const row of users) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        isActive: row.isActive,
        createdAt: row.createdAt,
        businesses: [],
      });
    }
    if (row.businessId && row.businessName) {
      grouped.get(row.id)!.businesses.push({ id: row.businessId, name: row.businessName });
    }
  }

  res.json([...grouped.values()]);
});

router.patch("/business-owners/:id", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid owner id" });
    return;
  }
  const parsed = UpdateBusinessOwnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownerId = params.data.id;
  const [owner] = await db
    .select({ id: adminUsersTable.id, role: adminUsersTable.role })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, ownerId))
    .limit(1);
  if (!owner || owner.role !== "business_admin") {
    res.status(404).json({ error: "Business owner not found" });
    return;
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase().trim();
    const [emailOwner] = await db
      .select({ id: adminUsersTable.id, role: adminUsersTable.role })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);
    if (emailOwner && emailOwner.id !== ownerId) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  if (parsed.data.businessIds) {
    const businessIds = [...new Set(parsed.data.businessIds)];
    const businessRows = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(inArray(businessesTable.id, businessIds));
    if (businessRows.length !== businessIds.length) {
      res.status(400).json({ error: "One or more selected businesses are invalid." });
      return;
    }
  }

  const updated = await db.transaction(async (tx) => {
    const setData: Partial<typeof adminUsersTable.$inferInsert> = {};
    if (parsed.data.email) setData.email = parsed.data.email.toLowerCase().trim();
    if (parsed.data.name !== undefined) setData.name = parsed.data.name.trim();
    if (parsed.data.isActive !== undefined) setData.isActive = parsed.data.isActive;
    if (parsed.data.password) {
      setData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }
    if (Object.keys(setData).length > 0) {
      await tx.update(adminUsersTable).set(setData).where(eq(adminUsersTable.id, ownerId));
    }

    if (parsed.data.businessIds) {
      const businessIds = [...new Set(parsed.data.businessIds)];
      await tx.delete(userBusinessAccessTable).where(eq(userBusinessAccessTable.userId, ownerId));
      if (businessIds.length > 0) {
        await tx
          .insert(userBusinessAccessTable)
          .values(businessIds.map((businessId) => ({ userId: ownerId, businessId })))
          .onConflictDoNothing();
      }
    }

    const [user] = await tx
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, ownerId))
      .limit(1);
    return user;
  });
  logger.info(
    {
      actorId: req.authUser?.id,
      ownerId,
      action: "owner.update",
      businessIdsUpdated: parsed.data.businessIds ? [...new Set(parsed.data.businessIds)] : undefined,
      isActive: parsed.data.isActive,
      emailUpdated: !!parsed.data.email,
      passwordUpdated: !!parsed.data.password,
    },
    "Business owner updated",
  );
  res.json(updated);
});

router.delete("/business-owners/:id", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid owner id" });
    return;
  }
  const ownerId = params.data.id;
  const [owner] = await db
    .select({ id: adminUsersTable.id, role: adminUsersTable.role })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, ownerId))
    .limit(1);
  if (!owner || owner.role !== "business_admin") {
    res.status(404).json({ error: "Business owner not found" });
    return;
  }

  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, ownerId));
  logger.info({ actorId: req.authUser?.id, ownerId, action: "owner.delete" }, "Business owner deleted");
  res.sendStatus(204);
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (req.authUser?.role === "business_admin") {
    const [access] = await db
      .select({ id: userBusinessAccessTable.id })
      .from(userBusinessAccessTable)
      .where(
        and(
          eq(userBusinessAccessTable.userId, req.authUser.id),
          eq(userBusinessAccessTable.businessId, params.data.id),
        ),
      )
      .limit(1);
    if (!access) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id)).limit(1);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(toSafeBusiness(business));
});

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
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

  const setData: Partial<typeof businessesTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) setData.name = parsed.data.name;
  if ("whatsappPhoneNumberId" in parsed.data) setData.whatsappPhoneNumberId = parsed.data.whatsappPhoneNumberId?.trim() || null;
  if ("verifyToken" in parsed.data) setData.verifyToken = parsed.data.verifyToken?.trim() || null;
  if ("whatsappAccessToken" in parsed.data) {
    const raw = parsed.data.whatsappAccessToken?.trim() || "";
    try {
      setData.whatsappAccessToken = raw ? encryptSecret(raw) : null;
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
  }

  const [business] = await db.update(businessesTable).set(setData).where(eq(businessesTable.id, params.data.id)).returning();
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  logger.info(
    {
      actorId: req.authUser?.id,
      businessId: business.id,
      action: "business.update",
      credsUpdated: "whatsappAccessToken" in parsed.data || "whatsappPhoneNumberId" in parsed.data || "verifyToken" in parsed.data,
    },
    "Business updated",
  );
  res.json(toSafeBusiness(business));
});

router.delete("/businesses/:id", async (req, res): Promise<void> => {
  if (req.authUser?.role === "business_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
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
