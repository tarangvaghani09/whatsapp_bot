import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("super_admin"),
  isActive: boolean("is_active").notNull().default(true),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsersTable.$inferSelect;
