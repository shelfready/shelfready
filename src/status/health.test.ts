import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { recordHeartbeat } from "@/inngest/functions/heartbeat";
import { getStatusReport, HEARTBEAT_FRESH_MS } from "./health";
import { eq } from "drizzle-orm";
import { feedRuns } from "@/db/schema";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

describe("status report", () => {
  it("is honest when no monitoring data exists", async () => {
    const report = await getStatusReport(db);
    expect(report.monitoringSince).toBeNull();
    expect(report.jobsHealthy).toBe(false);
    expect(report.days).toEqual([]);
    expect(report.overallUptimePct).toBeNull();
  });

  it("computes coverage from real heartbeats and flags freshness", async () => {
    const run = await recordHeartbeat(db);
    // Backdate a run 3 hours ago plus one now → 2 beats, fresh.
    await db
      .update(feedRuns)
      .set({ startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) })
      .where(eq(feedRuns.id, run.id));
    await recordHeartbeat(db);

    const report = await getStatusReport(db);
    expect(report.jobsHealthy).toBe(true);
    expect(report.monitoringSince).not.toBeNull();
    expect(report.days.length).toBeGreaterThanOrEqual(1);
    const total = report.days.reduce((s, d) => s + d.received, 0);
    expect(total).toBe(2);
    // 2 received over a ~3h window → 2/3 expected beats.
    expect(report.overallUptimePct).toBeGreaterThan(50);

    // Stale heartbeat → degraded.
    const stale = await getStatusReport(
      db,
      new Date(Date.now() + HEARTBEAT_FRESH_MS + 60_000),
    );
    expect(stale.jobsHealthy).toBe(false);
  });
});
