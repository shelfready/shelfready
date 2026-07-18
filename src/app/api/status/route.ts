import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getStatusReport } from "@/status/health";

export const dynamic = "force-dynamic";

/** Public machine-readable status (uptime bots, dashboards). */
export async function GET() {
  const report = await getStatusReport(getDb());
  return NextResponse.json(
    {
      status: report.jobsHealthy ? "operational" : "degraded",
      generated_at: report.generatedAt,
      monitoring_since: report.monitoringSince,
      last_heartbeat_at: report.lastHeartbeatAt,
      uptime_pct: report.overallUptimePct,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
