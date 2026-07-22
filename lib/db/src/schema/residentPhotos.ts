import { pgTable, text, integer, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const residentPhotosTable = pgTable("resident_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull(),
  apn: text("apn").notNull(),
  zone: integer("zone").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timestamp: text("timestamp").notNull(),
  imageDataUrl: text("image_data_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertResidentPhotoSchema = createInsertSchema(
  residentPhotosTable,
).omit({ id: true, createdAt: true });
export type InsertResidentPhoto = z.infer<typeof insertResidentPhotoSchema>;
export type ResidentPhoto = typeof residentPhotosTable.$inferSelect;
