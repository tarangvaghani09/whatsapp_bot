import { db, businessesTable, customersTable, botMessagesTable } from "@workspace/db";
import { and, eq, ilike, inArray } from "drizzle-orm";

function minutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60 * 1000);
}

async function main() {
  const coachingBusinesses = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .where(ilike(businessesTable.name, "%coaching%"));

  if (coachingBusinesses.length === 0) {
    console.log("No coaching business found. Create/select a Coaching Center first.");
    process.exit(0);
  }

  for (const b of coachingBusinesses) {
    const customers = await db
      .select({ id: customersTable.id, name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.businessId, b.id))
      .limit(3);

    if (customers.length === 0) {
      console.log(`Business ${b.id} (${b.name}) has no customers. Seed customers first.`);
      continue;
    }

    const ids = customers.map((c) => c.id);
    await db.insert(botMessagesTable).values([
      {
        businessId: b.id,
        customerId: ids[0]!,
        direction: "inbound",
        content: "Hi, is there a demo class for IELTS prep this week?",
        replyType: "none",
        createdAt: minutesAgo(3),
      },
      {
        businessId: b.id,
        customerId: ids[Math.min(1, ids.length - 1)]!,
        direction: "inbound",
        content: "Can you share fee details for Math Coaching (Group)?",
        replyType: "none",
        createdAt: minutesAgo(2),
      },
      {
        businessId: b.id,
        customerId: ids[Math.min(2, ids.length - 1)]!,
        direction: "inbound",
        content: "I want to book a 1-on-1 tutoring slot for Saturday.",
        replyType: "none",
        createdAt: minutesAgo(1),
      },
    ]);

    console.log(`Added unread inbound messages for business ${b.id} (${b.name}).`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unread seed failed:", err);
  process.exit(1);
});
