import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { merchants } from "@/db/schema";
import { FsStore, setArtifactStore } from "./store";
import {
  getOrCreateFeedToken,
  renderFeeds,
  rotateFeedToken,
} from "./render";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;
let store: FsStore;

beforeAll(async () => {
  store = new FsStore(mkdtempSync(join(tmpdir(), "shelfready-artifacts-")));
  setArtifactStore(store);
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
  await db
    .update(merchants)
    .set({
      settings: {
        sellerName: "Tenant A Shop",
        sellerUrl: "https://a-shop.example.com",
        storeCountry: "DE",
      },
    })
    .where(eq(merchants.id, tenants.a.merchant.id));
});

afterAll(async () => {
  setArtifactStore(undefined);
  await close();
});

describe("FsStore", () => {
  it("round-trips body + content type and misses cleanly", async () => {
    await store.put("t/x.csv", "a,b\n1,2\n", "text/csv");
    expect(await store.get("t/x.csv")).toEqual({
      body: "a,b\n1,2\n",
      contentType: "text/csv",
    });
    expect(await store.get("t/nope.csv")).toBeNull();
  });

  it("rejects path traversal keys", async () => {
    await expect(store.put("../evil", "x", "text/plain")).rejects.toThrow(/bad key/);
  });
});

describe("renderFeeds", () => {
  it("writes all four artifacts and records a succeeded render run", async () => {
    const { stats } = await renderFeeds(db, tenants.a.merchant.id);
    expect(stats.items).toBeGreaterThan(0);

    for (const file of ["acp.csv", "acp.json", "gmc.tsv", "jsonld.json"]) {
      const artifact = await store.get(`${tenants.a.merchant.id}/${file}`);
      expect(artifact, file).not.toBeNull();
    }

    const runs = await tenants.a.scope.feedRuns.list();
    const render = runs.find((r) => r.kind === "render");
    expect(render?.status).toBe("succeeded");
    const keys = render?.artifactKeys as { key: string; sha256: string }[];
    expect(keys).toHaveLength(4);
    expect(keys[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("computes eligibility with seller settings present", async () => {
    const { stats } = await renderFeeds(db, tenants.a.merchant.id);
    // Seed catalog has one complete product (valid gtin + all fields).
    expect(stats.eligible).toBeGreaterThanOrEqual(1);
    expect(stats.eligible).toBeLessThanOrEqual(stats.items);
  });

  it("without seller settings everything is ineligible (but renders)", async () => {
    const { stats } = await renderFeeds(db, tenants.b.merchant.id);
    expect(stats.eligible).toBe(0);
  });
});

describe("feed tokens", () => {
  it("creates once, is stable, and rotation changes it", async () => {
    const t1 = await getOrCreateFeedToken(db, tenants.a.merchant.id);
    const t2 = await getOrCreateFeedToken(db, tenants.a.merchant.id);
    expect(t1).toBe(t2);
    expect(t1).toMatch(/^[0-9a-f]{32}$/);
    const t3 = await rotateFeedToken(db, tenants.a.merchant.id);
    expect(t3).not.toBe(t1);
  });
});
