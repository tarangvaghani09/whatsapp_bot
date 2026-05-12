import { z } from "zod";
import { db, businessesTable } from "@workspace/db";

export const BusinessIdQueryParam = z.object({
  businessId: z.coerce.number().optional(),
});

export async function resolveBusinessId(businessId?: number): Promise<number> {
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
