import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { businessesTable } from "./businesses";
import { customersTable } from "./customers";

export const botMessagesTable = pgTable(
  "bot_messages",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
    direction: text("direction").notNull().$type<"inbound" | "outbound">(),
    content: text("content").notNull(),
    replyType: text("reply_type").notNull().default("none").$type<"faq" | "service" | "booking" | "ai" | "none" | "broadcast" | "rating">(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_bot_messages_business_id").on(table.businessId),
  ],
);

export const insertBotMessageSchema = createInsertSchema(botMessagesTable).omit({ id: true, createdAt: true });
export type InsertBotMessage = z.infer<typeof insertBotMessageSchema>;
export type BotMessage = typeof botMessagesTable.$inferSelect;
