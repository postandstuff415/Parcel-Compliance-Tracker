import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, citationsTable, parcelsTable } from "@workspace/db";
import {
  CreateCitationBody,
  GetCitationParams,
  CreateCitationResponse,
  GetCitationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function citationToResponse(c: typeof citationsTable.$inferSelect) {
  return {
    id: c.id,
    noticeNumber: c.noticeNumber,
    apn: c.apn,
    ownerName: c.ownerName,
    ownerAddress: c.ownerAddress,
    inspectorBadge: c.inspectorBadge,
    issuedDate: c.issuedDate,
    deadlineDate: c.deadlineDate,
    violations: (c.violations as string[]) ?? [],
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  };
}

function generateNoticeNumber() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `OFD-${yy}${mm}${dd}-${seq}`;
}

router.post("/citations", async (req, res): Promise<void> => {
  const parsed = CreateCitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Fetch parcel info for owner details
  const [parcel] = await db
    .select()
    .from(parcelsTable)
    .where(eq(parcelsTable.apn, parsed.data.apn));

  const ownerName = parcel?.ownerName ?? "Unknown Owner";
  const ownerAddress = parcel
    ? `${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zip}`
    : parsed.data.apn;

  const issuedDate = new Date().toISOString().split("T")[0]!;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  const deadlineDate = deadline.toISOString().split("T")[0]!;

  const [row] = await db
    .insert(citationsTable)
    .values({
      noticeNumber: generateNoticeNumber(),
      apn: parsed.data.apn,
      ownerName,
      ownerAddress,
      inspectorBadge: parsed.data.inspectorBadge,
      issuedDate,
      deadlineDate,
      violations: parsed.data.violations,
      status: "issued",
    })
    .returning();

  // Also update parcel status to non_compliant
  await db
    .update(parcelsTable)
    .set({ status: "non_compliant" })
    .where(eq(parcelsTable.apn, parsed.data.apn));

  res.status(201).json(CreateCitationResponse.parse(citationToResponse(row!)));
});

router.get("/citations/:id", async (req, res): Promise<void> => {
  const params = GetCitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(citationsTable)
    .where(eq(citationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Citation not found" });
    return;
  }

  res.json(GetCitationResponse.parse(citationToResponse(row)));
});

export default router;
