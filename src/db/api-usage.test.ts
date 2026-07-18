import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { forMerchant, pruneApiUsage, recordApiUsage } from "@/db/tenant";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;
let keyA: string;
let keyB: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
  const [ka] = await tenants.a.scope.apiKeys.insert([
    { name: "a-key", prefix: "sr_aaaa", keyHash: "hash-a", scopes: ["read"] },
  ]);
  const [kb] = await tenants.b.scope.apiKeys.insert([
    { name: "b-key", prefix: "sr_bbbb", keyHash: "hash-b", scopes: ["read"] },
  ]);
  keyA = ka.id;
  keyB = kb.id;
});

afterAll(async () => {
  await close();
});

const today = new Date().toISOString().slice(0, 10);

describe("recordApiUsage", () => {
  it("creates a counter row and increments it on repeat calls", async () => {
    await recordApiUsage(db, tenants.a.merchant.id, keyA, "products");
    await recordApiUsage(db, tenants.a.merchant.id, keyA, "products");
    await recordApiUsage(db, tenants.a.merchant.id, keyA, "catalog");

    const rows = await tenants.a.scope.apiUsage.window(30);
    const products = rows.find((r) => r.endpoint === "products");
    const catalog = rows.find((r) => r.endpoint === "catalog");
    expect(products?.count).toBe(2);
    expect(products?.day).toBe(today);
    expect(catalog?.count).toBe(1);
  });

  it("keeps per-day rows separate", async () => {
    await recordApiUsage(db, tenants.a.merchant.id, keyA, "products", "2026-01-01");
    const rows = await tenants.a.scope.apiUsage.list();
    const days = rows.filter((r) => r.endpoint === "products").map((r) => r.day);
    expect(days.sort()).toEqual(["2026-01-01", today]);
  });
});

describe("tenant isolation", () => {
  it("tenant A cannot read B's usage and vice versa", async () => {
    await recordApiUsage(db, tenants.b.merchant.id, keyB, "feeds");

    const aRows = await tenants.a.scope.apiUsage.window(30);
    expect(aRows.every((r) => r.merchantId === tenants.a.merchant.id)).toBe(true);
    expect(aRows.some((r) => r.endpoint === "feeds")).toBe(false);

    const bRows = await tenants.b.scope.apiUsage.window(30);
    expect(bRows.every((r) => r.merchantId === tenants.b.merchant.id)).toBe(true);
    expect(bRows.some((r) => r.endpoint === "products")).toBe(false);
  });

  it("scoped writes force the scope's merchantId", async () => {
    // Smuggled merchantId is overwritten by the scope.
    await tenants.a.scope.apiUsage.insert([
      {
        merchantId: tenants.b.merchant.id,
        apiKeyId: keyA,
        day: "2026-02-02",
        endpoint: "smuggled",
        count: 5,
      } as never,
    ]);
    const bRows = await tenants.b.scope.apiUsage.list();
    expect(bRows.some((r) => r.endpoint === "smuggled")).toBe(false);
    const aRows = await tenants.a.scope.apiUsage.list();
    expect(aRows.some((r) => r.endpoint === "smuggled")).toBe(true);
  });
});

describe("pruneApiUsage", () => {
  it("drops rows older than the retention window, keeps recent ones", async () => {
    await recordApiUsage(db, tenants.a.merchant.id, keyA, "old", "2020-01-01");
    await pruneApiUsage(db, 90);

    const rows = await forMerchant(db, tenants.a.merchant.id).apiUsage.list();
    expect(rows.some((r) => r.endpoint === "old")).toBe(false);
    expect(rows.some((r) => r.endpoint === "products" && r.day === today)).toBe(true);
  });
});
