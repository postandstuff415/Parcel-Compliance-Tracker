import { pgTable, text, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inspectionsTable = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  apn: text("apn").notNull(),
  inspectorId: text("inspector_id").notNull(),
  inspectorBadge: text("inspector_badge").notNull(),
  status: text("status").notNull().default("pending_review"),
  zone0Score: real("zone0_score").notNull().default(0),
  zone1Score: real("zone1_score").notNull().default(0),
  zone2Score: real("zone2_score").notNull().default(0),
  compositeScore: real("composite_score").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInspectionSchema = createInsertSchema(inspectionsTable).omit(
  { id: true, createdAt: true, updatedAt: true },
);
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspectionsTable.$inferSelect;
