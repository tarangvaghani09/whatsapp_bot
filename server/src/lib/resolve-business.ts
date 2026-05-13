import { z } from "zod";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable, userBusinessAccessTable } from "@workspace/db";
import { ForbiddenError } from "./errors";

export const BusinessIdQueryParam = z.object({
  businessId: z.coerce.number().optional(),
});

export async function resolveBusinessId(req: Request, businessId?: number): Promise<number> {
  const authUser = req.authUser;

  if (authUser?.role === "business_admin") {
    const accessRows = await db
      .select({ businessId: userBusinessAccessTable.businessId })
      .from(userBusinessAccessTable)
      .where(eq(userBusinessAccessTable.userId, authUser.id));

    const allowedBusinessIds = accessRows.map((r) => r.businessId);
    if (allowedBusinessIds.length === 0) {
      throw new ForbiddenError("No business assigned to this admin user");
    }

    if (businessId && allowedBusinessIds.includes(businessId)) return businessId;
    if (businessId && !allowedBusinessIds.includes(businessId)) {
      throw new ForbiddenError("Forbidden for requested business");
    }
    return allowedBusinessIds[0]!;
  }

  if (businessId) return businessId;

  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .orderBy(businessesTable.id)
    .limit(1);

  if (business) return business.id;

  const [created] = await db
    .insert(businessesTable)
    .values({ name: "My Business" })
    .returning({ id: businessesTable.id });
  return created.id;
}
