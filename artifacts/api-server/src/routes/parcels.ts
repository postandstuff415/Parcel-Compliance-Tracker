import { Router, type IRouter } from "express";
import { eq, desc, ilike, or } from "drizzle-orm";
import { db, parcelsTable } from "@workspace/db";
import {
  ListParcelsQueryParams,
  GetParcelParams,
  UpdateParcelStatusParams,
  UpdateParcelStatusBody,
  GetParcelResponse,
  UpdateParcelStatusResponse,
  GetParcelPhotosParams,
  GetParcelPhotosResponse,
} from "@workspace/api-zod";
import { residentPhotosTable } from "@workspace/db";

const router: IRouter = Router();

function parcelToResponse(p: typeof parcelsTable.$inferSelect) {
  return {
    apn: p.apn,
    address: p.address,
    ownerName: p.ownerName,
    ownerEmail: p.ownerEmail ?? null,
    ownerPhone: p.ownerPhone ?? null,
    city: p.city,
    state: p.state,
    zip: p.zip,
    status: p.status,
    riskLevel: p.riskLevel,
    fuelScores: {
      zone0: p.zone0Score,
      zone1: p.zone1Score,
      zone2: p.zone2Score,
      composite: p.compositeScore,
    },
    geometry: {
      lat: p.lat,
      lng: p.lng,
      boundaryPoints: (p.boundaryPoints as Array<{ lat: number; lng: number }>) ?? [],
    },
    inspectorNotes: p.inspectorNotes ?? null,
    lastInspectedAt: p.lastInspectedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/parcels", async (req, res): Promise<void> => {
  const parsed = ListParcelsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, riskLevel, search } = parsed.data;

  let query = db.select().from(parcelsTable).$dynamic();

  const conditions = [];
  if (status) conditions.push(eq(parcelsTable.status, status));
  if (riskLevel) conditions.push(eq(parcelsTable.riskLevel, riskLevel));
  if (search) {
    conditions.push(
      or(
        ilike(parcelsTable.apn, `%${search}%`),
        ilike(parcelsTable.address, `%${search}%`),
      )!,
    );
  }

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  const parcels = await query.orderBy(desc(parcelsTable.compositeScore));
  res.json(parcels.map(parcelToResponse));
});

router.get("/parcels/:apn", async (req, res): Promise<void> => {
  const params = GetParcelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [parcel] = await db
    .select()
    .from(parcelsTable)
    .where(eq(parcelsTable.apn, params.data.apn));

  if (!parcel) {
    res.status(404).json({ error: "Parcel not found" });
    return;
  }

  res.json(GetParcelResponse.parse(parcelToResponse(parcel)));
});

router.patch("/parcels/:apn", async (req, res): Promise<void> => {
  const params = UpdateParcelStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateParcelStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof parcelsTable.$inferInsert> = {};
  if (body.data.status) updates.status = body.data.status;
  if (body.data.inspectorNotes !== undefined)
    updates.inspectorNotes = body.data.inspectorNotes;

  const [parcel] = await db
    .update(parcelsTable)
    .set(updates)
    .where(eq(parcelsTable.apn, params.data.apn))
    .returning();

  if (!parcel) {
    res.status(404).json({ error: "Parcel not found" });
    return;
  }

  res.json(UpdateParcelStatusResponse.parse(parcelToResponse(parcel)));
});

router.get("/parcels/:apn/photos", async (req, res): Promise<void> => {
  const params = GetParcelPhotosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const photos = await db
    .select()
    .from(residentPhotosTable)
    .where(eq(residentPhotosTable.apn, params.data.apn))
    .orderBy(desc(residentPhotosTable.createdAt));

  const result = photos.map((p) => ({
    id: p.id,
    apn: p.apn,
    zone: p.zone,
    latitude: p.latitude,
    longitude: p.longitude,
    timestamp: p.timestamp,
    imageDataUrl: p.imageDataUrl,
    submissionId: p.submissionId,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json(GetParcelPhotosResponse.parse(result));
});

export default router;
