import { pgTable, text, real, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parcelsTable = pgTable("parcels", {
  apn: text("apn").primaryKey(),
  address: text("address").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email"),
  ownerPhone: text("owner_phone"),
  city: text("city").notNull(),
  state: text("state").notNull().default("CA"),
  zip: text("zip").notNull(),
  status: text("status").notNull().default("pending_review"),
  riskLevel: text("risk_level").notNull().default("medium"),
  zone0Score: real("zone0_score").notNull().default(0),
  zone1Score: real("zone1_score").notNull().default(0),
  zone2Score: real("zone2_score").notNull().default(0),
  compositeScore: real("composite_score").notNull().default(0),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  boundaryPoints: json("boundary_points")
    .$type<Array<{ lat: number; lng: number }>>()
    .notNull()
    .default([]),
  inspectorNotes: text("inspector_notes"),
  lastInspectedAt: timestamp("last_inspected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertParcelSchema = createInsertSchema(parcelsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertParcel = z.infer<typeof insertParcelSchema>;
export type Parcel = typeof parcelsTable.$inferSelect;
