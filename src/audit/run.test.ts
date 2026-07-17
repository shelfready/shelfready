import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { merchants } from "@/db/schema";
import { runAudit } from "./run";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
  await db
    .update(merchants)
    .set({
      settings: {
        sellerName: "A Shop",
        sellerUrl: "https://a.example.com",
        storeCountry: "DE",
      },
    })
    .where(eq(merchants.id, tenants.a.merchant.id));
});

afterAll(async () => {
  await close();
});

describe("runAudit", () => {
  it("persists findings and records score stats", async () => {
    const { audit } = await runAudit(db, tenants.a.merchant.id);
    expect(audit.items.length).toBeGreaterThan(0);

    const rows = await tenants.a.scope.auditFindings.list();
    // Seed catalog: invalid gtin on SKU-1002, missing gtin on SKU-1003 etc.
    expect(rows.some((r) => r.code === "gtin_invalid")).toBe(true);
    expect(rows.some((r) => r.code === "gtin_missing")).toBe(true);
    expect(rows.every((r) => r.merchantId === tenants.a.merchant.id)).toBe(true);

    const runs = await tenants.a.scope.feedRuns.list();
    const auditRun = runs.find((r) => r.kind === "audit");
    expect(auditRun?.status).toBe("succeeded");
    expect((auditRun?.stats as { grade: string }).grade).toMatch(/^[A-F]$/);
  });

  it("is a snapshot: re-running replaces rather than accumulates", async () => {
    await runAudit(db, tenants.a.merchant.id);
    const first = (await tenants.a.scope.auditFindings.list()).length;
    await runAudit(db, tenants.a.merchant.id);
    const second = (await tenants.a.scope.auditFindings.list()).length;
    expect(second).toBe(first);
  });

  it("catalog-level findings persist without a product id", async () => {
    await runAudit(db, tenants.b.merchant.id); // B has no seller settings
    const rows = await tenants.b.scope.auditFindings.list();
    const catalogFinding = rows.find((r) => r.code === "seller_settings_missing");
    expect(catalogFinding).toBeDefined();
    expect(catalogFinding!.productId).toBeNull();
  });

  it("tenant isolation: auditing A never touches B's findings", async () => {
    await runAudit(db, tenants.b.merchant.id);
    const bBefore = await tenants.b.scope.auditFindings.list();
    await runAudit(db, tenants.a.merchant.id);
    const bAfter = await tenants.b.scope.auditFindings.list();
    expect(bAfter.map((r) => r.id).sort()).toEqual(bBefore.map((r) => r.id).sort());
    const aRows = await tenants.a.scope.auditFindings.list();
    const bIds = new Set(bAfter.map((r) => r.id));
    expect(aRows.some((r) => bIds.has(r.id))).toBe(false);
  });
});
