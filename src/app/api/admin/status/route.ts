import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { openIncident, postIncidentUpdate } from "@/status/components";
import { requireAdminApi } from "@/lib/require-admin";

const openSchema = z.object({
  action: z.literal("open"),
  title: z.string().min(1).max(200),
  severity: z.enum(["minor", "major", "critical"]),
  componentIds: z.array(z.string().uuid()).default([]),
  body: z.string().min(1).max(2000),
});

const updateSchema = z.object({
  action: z.literal("update"),
  incidentId: z.string().uuid(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  body: z.string().min(1).max(2000),
});

/** POST — open an incident or post an update (admin only). */
export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const db = getDb();

  const open = openSchema.safeParse(body);
  if (open.success) {
    const incident = await openIncident(db, open.data);
    return NextResponse.json({ ok: true, id: incident.id });
  }
  const update = updateSchema.safeParse(body);
  if (update.success) {
    const incident = await postIncidentUpdate(
      db,
      update.data.incidentId,
      update.data.status,
      update.data.body,
    );
    if (!incident) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, status: incident.status });
  }
  return NextResponse.json({ error: "invalid body" }, { status: 400 });
}
