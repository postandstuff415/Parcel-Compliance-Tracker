import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const residentSubmissionsTable = pgTable("resident_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  apn: text("apn").notNull(),
  submitterName: text("submitter_name").notNull(),
  status: text("status").notNull().default("pending_verification"),
  photoCount: integer("photo_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertResidentSubmissionSchema = createInsertSchema(
  residentSubmissionsTable,
).omit({ id: true, createdAt: true });
export type InsertResidentSubmission = z.infer<
  typeof insertResidentSubmissionSchema
>;
export type ResidentSubmission = typeof residentSubmissionsTable.$inferSelect;
