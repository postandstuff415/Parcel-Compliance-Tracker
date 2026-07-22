import { pgTable, text, json, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const citationsTable = pgTable("citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  noticeNumber: text("notice_number").notNull(),
  apn: text("apn").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerAddress: text("owner_address").notNull(),
  inspectorBadge: text("inspector_badge").notNull(),
  issuedDate: text("issued_date").notNull(),
  deadlineDate: text("deadline_date").notNull(),
  violations: json("violations").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("issued"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCitationSchema = createInsertSchema(citationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type Citation = typeof citationsTable.$inferSelect;
