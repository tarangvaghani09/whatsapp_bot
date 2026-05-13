import { pgTable, serial, integer, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./admin-users";
import { businessesTable } from "./businesses";

export const userBusinessAccessTable = pgTable(
  "user_business_access",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsersTable.id, { onDelete: "cascade" }),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_business_access_user_business_uniq").on(table.userId, table.businessId),
  ],
);
