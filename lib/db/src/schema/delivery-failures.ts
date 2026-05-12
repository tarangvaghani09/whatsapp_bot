import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const deliveryFailuresTable = pgTable(
  "delivery_failures",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    recipientPhone: text("recipient_phone").notNull(),
    messagePreview: text("message_preview").notNull(),
    errorStatus: integer("error_status"),
    errorBody: text("error_body"),
    context: text("context").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_delivery_failures_business_id").on(table.businessId),
  ],
);

export type DeliveryFailure = typeof deliveryFailuresTable.$inferSelect;
