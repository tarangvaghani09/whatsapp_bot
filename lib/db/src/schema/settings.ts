import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { businessesTable } from "./businesses";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .unique()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull().default("My Business"),
  businessType: text("business_type").notNull().default("general"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  openingHours: text("opening_hours"),
  description: text("description"),
  noMatchMessage: text("no_match_message"),
  aiFallbackEnabled: boolean("ai_fallback_enabled").notNull().default(true),
  welcomeMenuMessage: text("welcome_menu_message"),
  welcomeMenuOptions: text("welcome_menu_options"),
  greetingKeywords: text("greeting_keywords"),
  bookingFlowCancelMessage: text("booking_flow_cancel_message"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(false),
  reminderMinutesBefore: integer("reminder_minutes_before").notNull().default(60),
  reminderMessageTemplate: text("reminder_message_template"),
  paymentMethods: text("payment_methods"),
  staffContactMessage: text("staff_contact_message"),
  currency: text("currency").notNull().default("USD"),
  customAiPrompt: text("custom_ai_prompt"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
