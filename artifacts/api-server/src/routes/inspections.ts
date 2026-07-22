import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, inspectionsTable } from "@workspace/db";
import {
  ListInspectionsQueryParams,
  GetInspectionParams,
  CreateInspectionBody,
  CreateInspectionResponse,
  GetInspectionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function inspectionToResponse(i: typeof inspectionsTable.$inferSelect) {
  return {
    id: i.id,
    apn: i.apn,
    inspectorId: i.inspectorId,
    inspectorBadge: i.inspectorBadge,
    status: i.status,
    fuelScores: {
      zone0: i.zone0Score,
      zone1: i.zone1Score,
      zone2: i.zone2Score,
      composite: i.compositeScore,
    },
    notes: i.notes ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

router.get("/inspections", async (req, res): Promise<void> => {
  const parsed = ListInspectionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db
    .select()
    .from(inspectionsTable)
    .orderBy(desc(inspectionsTable.createdAt))
    .$dynamic();

  if (parsed.data.apn) {
    query = query.where(eq(inspectionsTable.apn, parsed.data.apn));
  }

  const rows = await query;
  res.json(rows.map(inspectionToResponse));
});

router.post("/inspections", async (req, res): Promise<void> => {
  const parsed = CreateInspectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fuelScores, ...rest } = parsed.data;
  const [row] = await db
    .insert(inspectionsTable)
    .values({
      ...rest,
      zone0Score: fuelScores.zone0,
      zone1Score: fuelScores.zone1,
      zone2Score: fuelScores.zone2,
      compositeScore: fuelScores.composite,
    })
    .returning();

  res.status(201).json(CreateInspectionResponse.parse(inspectionToResponse(row!)));
});

router.get("/inspections/:id", async (req, res): Promise<void> => {
  const params = GetInspectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }

  res.json(GetInspectionResponse.parse(inspectionToResponse(row)));
});

export default router;
