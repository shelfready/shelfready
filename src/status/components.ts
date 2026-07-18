import { asc, desc, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import {
  statusComponents,
  statusIncidents,
  statusIncidentUpdates,
} from "@/db/schema";
import { getStatusReport, type StatusReport } from "./health";

type AnyDb = ReturnType<typeof getDb> | TestDb;

export type ComponentState = "operational" | "degraded" | "outage";
export type IncidentSeverity = "minor" | "major" | "critical";
export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

/** Default components, seeded idempotently on first read. */
const DEFAULT_COMPONENTS: { name: string; sortOrder: number; autoSignal: string | null }[] = [
  { name: "Marketing site", sortOrder: 10, autoSignal: null },
  { name: "Dashboard", sortOrder: 20, autoSignal: null },
  { name: "Public API", sortOrder: 30, autoSignal: null },
  { name: "Hosted feeds", sortOrder: 40, autoSignal: null },
  { name: "Webhook delivery", sortOrder: 50, autoSignal: "jobs" },
  { name: "Sync & monitoring jobs", sortOrder: 60, autoSignal: "jobs" },
];

export async function ensureComponents(db: AnyDb) {
  const existing = await db.select().from(statusComponents);
  if (existing.length > 0) return existing;
  await db.insert(statusComponents).values(DEFAULT_COMPONENTS).onConflictDoNothing();
  return db.select().from(statusComponents);
}

const SEVERITY_STATE: Record<IncidentSeverity, ComponentState> = {
  minor: "degraded",
  major: "degraded",
  critical: "outage",
};

const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  minor: 0,
  major: 1,
  critical: 2,
};

export interface StatusPageData {
  report: StatusReport;
  overall: ComponentState;
  components: {
    id: string;
    name: string;
    state: ComponentState;
    autoSignal: string | null;
  }[];
  activeIncidents: IncidentView[];
  pastIncidents: IncidentView[];
}

export interface IncidentView {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  componentIds: string[];
  componentNames: string[];
  createdAt: Date;
  resolvedAt: Date | null;
  updates: { status: IncidentStatus; body: string; createdAt: Date }[];
}

/**
 * Everything the public status page needs. Component state precedence:
 * worst ACTIVE incident touching the component wins; otherwise the
 * automated signal (heartbeat freshness for `jobs`); otherwise
 * operational. Resolved incidents never affect current state.
 */
export async function getStatusPageData(
  db: AnyDb,
  now = new Date(),
): Promise<StatusPageData> {
  const [components, report, incidents] = await Promise.all([
    ensureComponents(db),
    getStatusReport(db, now),
    db
      .select()
      .from(statusIncidents)
      .orderBy(desc(statusIncidents.createdAt))
      .limit(100),
  ]);
  const sorted = [...components].sort((a, b) => a.sortOrder - b.sortOrder);

  const updates =
    incidents.length > 0
      ? await db
          .select()
          .from(statusIncidentUpdates)
          .where(
            inArray(
              statusIncidentUpdates.incidentId,
              incidents.map((i) => i.id),
            ),
          )
          .orderBy(asc(statusIncidentUpdates.createdAt))
      : [];
  const updatesByIncident = new Map<string, typeof updates>();
  for (const u of updates) {
    const list = updatesByIncident.get(u.incidentId) ?? [];
    list.push(u);
    updatesByIncident.set(u.incidentId, list);
  }
  const nameById = new Map(sorted.map((c) => [c.id, c.name]));
  const views: IncidentView[] = incidents.map((i) => ({
    id: i.id,
    title: i.title,
    severity: i.severity,
    status: i.status,
    componentIds: (i.componentIds as string[]) ?? [],
    componentNames: ((i.componentIds as string[]) ?? [])
      .map((id) => nameById.get(id))
      .filter((n): n is string => Boolean(n)),
    createdAt: i.createdAt,
    resolvedAt: i.resolvedAt,
    updates: (updatesByIncident.get(i.id) ?? []).map((u) => ({
      status: u.status,
      body: u.body,
      createdAt: u.createdAt,
    })),
  }));
  const active = views.filter((v) => v.status !== "resolved");
  const past = views.filter((v) => v.status === "resolved");

  // Per-component state.
  const stateById = new Map<string, ComponentState>();
  for (const c of sorted) {
    let state: ComponentState = "operational";
    // Automated signal first (incidents can only make it worse).
    if (c.autoSignal === "jobs" && !report.jobsHealthy) state = "degraded";
    for (const inc of active) {
      if (!inc.componentIds.includes(c.id)) continue;
      const incState = SEVERITY_STATE[inc.severity];
      if (
        incState === "outage" ||
        (incState === "degraded" && state === "operational")
      ) {
        state = incState;
      }
    }
    stateById.set(c.id, state);
  }

  const worstActive = active.reduce<IncidentSeverity | null>(
    (worst, i) =>
      worst == null || SEVERITY_RANK[i.severity] > SEVERITY_RANK[worst]
        ? i.severity
        : worst,
    null,
  );
  const states = [...stateById.values()];
  const overall: ComponentState = states.includes("outage")
    ? "outage"
    : states.includes("degraded") || worstActive != null
      ? "degraded"
      : "operational";

  return {
    report,
    overall,
    components: sorted.map((c) => ({
      id: c.id,
      name: c.name,
      state: stateById.get(c.id) ?? "operational",
      autoSignal: c.autoSignal,
    })),
    activeIncidents: active,
    pastIncidents: past,
  };
}

/** Admin mutations (issue #120) — always called behind requireAdminApi. */
export async function openIncident(
  db: AnyDb,
  input: {
    title: string;
    severity: IncidentSeverity;
    componentIds: string[];
    body: string;
  },
) {
  const [incident] = await db
    .insert(statusIncidents)
    .values({
      title: input.title,
      severity: input.severity,
      componentIds: input.componentIds,
    })
    .returning();
  await db.insert(statusIncidentUpdates).values({
    incidentId: incident.id,
    status: "investigating",
    body: input.body,
  });
  return incident;
}

export async function postIncidentUpdate(
  db: AnyDb,
  incidentId: string,
  status: IncidentStatus,
  body: string,
) {
  const [incident] = await db
    .select()
    .from(statusIncidents)
    .where(eq(statusIncidents.id, incidentId));
  if (!incident) return null;
  await db.insert(statusIncidentUpdates).values({ incidentId, status, body });
  const [updated] = await db
    .update(statusIncidents)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : incident.resolvedAt,
    })
    .where(eq(statusIncidents.id, incidentId))
    .returning();
  return updated;
}
