import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { feedRuns } from "@/db/schema";
import { recordHeartbeat } from "./heartbeat";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

describe("recordHeartbeat", () => {
  it("creates the system merchant on first run and records a heartbeat", async () => {
    const run = await recordHeartbeat(db);
    expect(run.kind).toBe("heartbeat");
    expect(run.status).toBe("succeeded");
    expect(run.finishedAt).not.toBeNull();
  });

  it("reuses the system merchant on subsequent runs", async () => {
    const first = await recordHeartbeat(db);
    const second = await recordHeartbeat(db);
    expect(second.merchantId).toBe(first.merchantId);
    const rows = await db
      .select()
      .from(feedRuns)
      .where(eq(feedRuns.merchantId, first.merchantId));
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
