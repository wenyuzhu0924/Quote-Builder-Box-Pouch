import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sharedQuotes = pgTable("shared_quotes", {
  id: varchar("id", { length: 12 }).primaryKey(),
  quoteType: text("quote_type").notNull(),
  customerName: text("customer_name").notNull().default(""),
  configData: jsonb("config_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSharedQuoteSchema = createInsertSchema(sharedQuotes).omit({
  createdAt: true,
});

export type InsertSharedQuote = z.infer<typeof insertSharedQuoteSchema>;
export type SharedQuote = typeof sharedQuotes.$inferSelect;
