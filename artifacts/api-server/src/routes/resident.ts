import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  parcelsTable,
  residentSubmissionsTable,
  residentPhotosTable,
} from "@workspace/db";
import {
  VerifyResidentPinBody,
  GetResidentParcelStatusParams,
  SubmitResidentInspectionBody,
  VerifyResidentPinResponse,
  GetResidentParcelStatusResponse,
  SubmitResidentInspectionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const VALID_PIN = "123456";
const PIN_TO_APN: Record<string, string> = {
  "123456": "048-5612-014-00",
};

function getPendingTasks(parcel: typeof parcelsTable.$inferSelect): string[] {
  const tasks: string[] = [];
  if (parcel.zone0Score > 0.4)
    tasks.push("Clear combustible materials within 5 ft of structure (Zone 0)");
  if (parcel.zone0Score > 0.6)
    tasks.push("Remove all dead vegetation from immediate ember zone");
  if (parcel.zone1Score > 0.5)
    tasks.push("Thin vegetation to 3 ft separation within 30 ft (Zone 1)");
  if (parcel.zone1Score > 0.7)
    tasks.push("Remove ladder fuels: lower limbs to 10 ft from ground");
  if (parcel.zone2Score > 0.5)
    tasks.push("Reduce fuel density by 50% within 30-100 ft (Zone 2)");
  if (parcel.zone2Score > 0.7)
    tasks.push("Remove dead trees and brush from Zone 2");
  if (tasks.length === 0 && parcel.status !== "compliant")
    tasks.push("Schedule in-person inspection to confirm compliance");
  return tasks;
}

router.post("/resident/verify-pin", async (req, res): Promise<void> => {
  const parsed = VerifyResidentPinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pin, apn } = parsed.data;

  if (pin !== VALID_PIN) {
    res.status(401).json({ error: "Invalid PIN. Please check your access code and try again." });
    return;
  }

  const resolvedApn = PIN_TO_APN[pin] ?? apn;

  const [parcel] = await db
    .select()
    .from(parcelsTable)
    .where(eq(parcelsTable.apn, resolvedApn));

  if (!parcel) {
    res.status(404).json({ error: "Parcel not found for this PIN" });
    return;
  }

  const result = {
    verified: true,
    apn: parcel.apn,
    address: parcel.address,
    ownerName: parcel.ownerName,
    status: parcel.status,
    pendingTasks: getPendingTasks(parcel),
  };

  res.json(VerifyResidentPinResponse.parse(result));
});

router.get(
  "/resident/parcel-status/:apn",
  async (req, res): Promise<void> => {
    const params = GetResidentParcelStatusParams.safeParse(req.params);
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

    const result = {
      apn: parcel.apn,
      address: parcel.address,
      ownerName: parcel.ownerName,
      status: parcel.status,
      riskLevel: parcel.riskLevel,
      fuelScores: {
        zone0: parcel.zone0Score,
        zone1: parcel.zone1Score,
        zone2: parcel.zone2Score,
        composite: parcel.compositeScore,
      },
      pendingTasks: getPendingTasks(parcel),
      lastInspectedAt: parcel.lastInspectedAt?.toISOString() ?? null,
    };

    res.json(GetResidentParcelStatusResponse.parse(result));
  },
);

router.post("/resident/submit", async (req, res): Promise<void> => {
  const parsed = SubmitResidentInspectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { apn, photos, submitterName } = parsed.data;

  // Create submission record
  const [submission] = await db
    .insert(residentSubmissionsTable)
    .values({
      apn,
      submitterName,
      status: "pending_verification",
      photoCount: photos.length,
    })
    .returning();

  // Insert all photos
  if (photos.length > 0) {
    await db.insert(residentPhotosTable).values(
      photos.map((p) => ({
        submissionId: submission!.id,
        apn,
        zone: p.zone,
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
        imageDataUrl: p.imageDataUrl,
      })),
    );
  }

  // Update parcel status
  await db
    .update(parcelsTable)
    .set({ status: "self_inspection_submitted" })
    .where(eq(parcelsTable.apn, apn));

  const result = {
    submissionId: submission!.id,
    apn,
    status: "pending_verification",
    message:
      "Your self-inspection has been received and is pending review by a fire inspector.",
    photoCount: photos.length,
  };

  res.status(201).json(SubmitResidentInspectionResponse.parse(result));
});

export default router;
