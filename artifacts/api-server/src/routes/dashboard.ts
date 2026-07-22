import { Router, type IRouter } from "express";
import { db, parcelsTable, inspectionsTable, citationsTable, residentSubmissionsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { sql, avg } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  // Get all parcels for status/risk counts
  const parcels = await db.select().from(parcelsTable);

  const byStatus = {
    pending_review: 0,
    compliant: 0,
    non_compliant: 0,
    self_inspection_submitted: 0,
  };
  const byRiskLevel = { high: 0, medium: 0, low: 0 };
  let compositeTotal = 0;

  for (const p of parcels) {
    const s = p.status as keyof typeof byStatus;
    if (s in byStatus) byStatus[s]++;
    const r = p.riskLevel as keyof typeof byRiskLevel;
    if (r in byRiskLevel) byRiskLevel[r]++;
    compositeTotal += p.compositeScore;
  }

  const avgCompositeScore =
    parcels.length > 0 ? compositeTotal / parcels.length : 0;

  // Build recent activity from inspections, citations, submissions
  const recentInspections = await db
    .select()
    .from(inspectionsTable)
    .orderBy(sql`${inspectionsTable.createdAt} DESC`)
    .limit(5);

  const recentCitations = await db
    .select()
    .from(citationsTable)
    .orderBy(sql`${citationsTable.createdAt} DESC`)
    .limit(5);

  const recentSubmissions = await db
    .select()
    .from(residentSubmissionsTable)
    .orderBy(sql`${residentSubmissionsTable.createdAt} DESC`)
    .limit(5);

  const parcelMap = new Map(parcels.map((p) => [p.apn, p]));

  const activity = [
    ...recentInspections.map((i) => ({
      id: i.id,
      type: "inspection" as const,
      apn: i.apn,
      address: parcelMap.get(i.apn)?.address ?? i.apn,
      description: `Inspection completed — status: ${i.status.replace(/_/g, " ")}`,
      timestamp: i.createdAt.toISOString(),
    })),
    ...recentCitations.map((c) => ({
      id: c.id,
      type: "citation" as const,
      apn: c.apn,
      address: parcelMap.get(c.apn)?.address ?? c.apn,
      description: `Notice of Non-Compliance issued (#${c.noticeNumber})`,
      timestamp: c.createdAt.toISOString(),
    })),
    ...recentSubmissions.map((s) => ({
      id: s.id,
      type: "submission" as const,
      apn: s.apn,
      address: parcelMap.get(s.apn)?.address ?? s.apn,
      description: `Resident self-inspection submitted (${s.photoCount} photo${s.photoCount !== 1 ? "s" : ""})`,
      timestamp: s.createdAt.toISOString(),
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);

  const result = {
    totalParcels: parcels.length,
    byStatus,
    byRiskLevel,
    recentActivity: activity,
    avgCompositeScore: Math.round(avgCompositeScore * 100) / 100,
  };

  res.json(GetDashboardSummaryResponse.parse(result));
});

export default router;
