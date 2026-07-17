import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { merchants } from "@/db/schema";
import { entitlementsFor } from "./plans";
import { entitlementsOf } from "./entitlements";
import { runScheduledDriftChecks } from "@/freshness/schedule";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  await close();
});

describe("entitlements matrix", () => {
  it("free includes hosted feeds but not enrichment or monitoring", () => {
    expect(entitlementsFor("free")).toEqual({
      maxSkus: 25,
      hostedFeeds: true,
      enrichment: false,
      freshnessMonitoring: false,
    });
  });

  it("growth and scale unlock enrichment; starter unlocks monitoring", () => {
    expect(entitlementsFor("starter").freshnessMonitoring).toBe(true);
    expect(entitlementsFor("starter").enrichment).toBe(false);
    expect(entitlementsFor("growth").enrichment).toBe(true);
    expect(entitlementsFor("scale").maxSkus).toBe(50_000);
  });
});

describe("entitlementsOf", () => {
  it("falls back to plan-derived entitlements when none stored", async () => {
    const ent = await entitlementsOf(db, tenants.a.merchant.id); // free, no webhook yet
    expect(ent).toEqual(entitlementsFor("free"));
  });

  it("stored webhook entitlements win over the fallback", async () => {
    await db
      .update(merchants)
      .set({ plan: "growth", entitlements: entitlementsFor("growth") })
      .where(eq(merchants.id, tenants.b.merchant.id));
    const ent = await entitlementsOf(db, tenants.b.merchant.id);
    expect(ent.enrichment).toBe(true);
    expect(ent.maxSkus).toBe(5_000);
  });
});

describe("scheduled drift entitlement gate", () => {
  it("skips merchants without freshnessMonitoring", async () => {
    // tenant A: free (no monitoring); tenant B upgraded to growth above.
    const stats = await runScheduledDriftChecks(db);
    expect(stats.skippedUnentitled).toBeGreaterThanOrEqual(1);
    // B (growth) is entitled — checked or failed, but not skipped silently
    expect(stats.checked + stats.failed).toBeGreaterThanOrEqual(1);
  });
});
