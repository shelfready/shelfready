import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getStatusPageData } from "@/status/components";

export const dynamic = "force-dynamic";

/** Public machine-readable status (uptime bots, dashboards). */
export async function GET() {
  const data = await getStatusPageData(getDb());
  return NextResponse.json(
    {
      status: data.overall,
      generated_at: data.report.generatedAt,
      monitoring_since: data.report.monitoringSince,
      last_heartbeat_at: data.report.lastHeartbeatAt,
      uptime_pct: data.report.overallUptimePct,
      components: data.components.map((c) => ({
        name: c.name,
        status: c.state,
      })),
      active_incidents: data.activeIncidents.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        components: i.componentNames,
        created_at: i.createdAt,
        latest_update: i.updates.at(-1)?.body ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
