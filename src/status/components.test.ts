import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import {
  ensureComponents,
  getStatusPageData,
  openIncident,
  postIncidentUpdate,
} from "./components";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

describe("status components (#120)", () => {
  it("seeds the default components idempotently", async () => {
    const first = await ensureComponents(db);
    const second = await ensureComponents(db);
    expect(first.length).toBe(6);
    expect(second.length).toBe(6);
    expect(first.map((c) => c.name)).toContain("Public API");
  });

  it("no incidents + no heartbeats → jobs components degraded, others operational", async () => {
    // No system merchant/heartbeats in this DB: jobsHealthy is false, so
    // auto-signal components must degrade — never report better than reality.
    const data = await getStatusPageData(db);
    const jobs = data.components.find((c) => c.name === "Sync & monitoring jobs")!;
    const api = data.components.find((c) => c.name === "Public API")!;
    expect(jobs.state).toBe("degraded");
    expect(api.state).toBe("operational");
    expect(data.overall).toBe("degraded");
    expect(data.activeIncidents).toHaveLength(0);
  });

  it("incident lifecycle: open → visible & worst-severity wins → resolve → past", async () => {
    const components = await ensureComponents(db);
    const api = components.find((c) => c.name === "Public API")!;

    const incident = await openIncident(db, {
      title: "API latency",
      severity: "critical",
      componentIds: [api.id],
      body: "Investigating elevated latency.",
    });

    let data = await getStatusPageData(db);
    expect(data.overall).toBe("outage");
    expect(data.components.find((c) => c.id === api.id)!.state).toBe("outage");
    expect(data.activeIncidents[0].title).toBe("API latency");
    expect(data.activeIncidents[0].updates).toHaveLength(1);

    await postIncidentUpdate(db, incident.id, "monitoring", "Deployed a fix.");
    data = await getStatusPageData(db);
    expect(data.activeIncidents[0].status).toBe("monitoring");
    expect(data.activeIncidents[0].updates).toHaveLength(2);

    const resolved = await postIncidentUpdate(db, incident.id, "resolved", "All clear.");
    expect(resolved!.resolvedAt).not.toBeNull();
    data = await getStatusPageData(db);
    expect(data.activeIncidents).toHaveLength(0);
    expect(data.pastIncidents[0].title).toBe("API latency");
    // Resolved incidents no longer affect component state.
    expect(data.components.find((c) => c.id === api.id)!.state).toBe("operational");
  });

  it("update on unknown incident returns null", async () => {
    expect(
      await postIncidentUpdate(
        db,
        "00000000-0000-0000-0000-000000000000",
        "resolved",
        "x",
      ),
    ).toBeNull();
  });
});
