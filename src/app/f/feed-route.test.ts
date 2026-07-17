import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { merchants } from "@/db/schema";
import { FsStore, setArtifactStore } from "@/feeds/store";
import {
  getOrCreateFeedToken,
  renderFeeds,
  rotateFeedToken,
} from "@/feeds/render";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;
let tokenA: string;

vi.mock("@/db", async () => ({
  getDb: () => db,
  schema: await import("@/db/schema"),
}));

async function fetchFeed(slug: string, token: string, file: string) {
  const { GET } = await import("./[slug]/[token]/[file]/route");
  return GET(new Request("http://test.local/f"), {
    params: Promise.resolve({ slug, token, file }),
  });
}

beforeAll(async () => {
  setArtifactStore(new FsStore(mkdtempSync(join(tmpdir(), "shelfready-feeds-"))));
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
  await db
    .update(merchants)
    .set({
      settings: {
        sellerName: "A",
        sellerUrl: "https://a.example.com",
        storeCountry: "DE",
      },
    })
    .where(eq(merchants.id, tenants.a.merchant.id));
  await renderFeeds(db, tenants.a.merchant.id);
  tokenA = await getOrCreateFeedToken(db, tenants.a.merchant.id);
});

afterAll(async () => {
  setArtifactStore(undefined);
  await close();
});

describe("public feed route", () => {
  it("serves the feed with content type and cache headers", async () => {
    const res = await fetchFeed(tenants.a.merchant.slug, tokenA, "acp.csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    expect(await res.text()).toContain("is_eligible_search");
  });

  it("returns identical 404s for wrong token, wrong slug, unknown file", async () => {
    const cases = await Promise.all([
      fetchFeed(tenants.a.merchant.slug, "0".repeat(32), "acp.csv"),
      fetchFeed("no-such-merchant", tokenA, "acp.csv"),
      fetchFeed(tenants.a.merchant.slug, tokenA, "secrets.txt"),
    ]);
    for (const res of cases) {
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("not found");
    }
  });

  it("cross-tenant: A's token never serves B's slug", async () => {
    const res = await fetchFeed(tenants.b.merchant.slug, tokenA, "acp.csv");
    expect(res.status).toBe(404);
  });

  it("token rotation invalidates old URLs", async () => {
    const oldToken = tokenA;
    await rotateFeedToken(db, tenants.a.merchant.id);
    const stale = await fetchFeed(tenants.a.merchant.slug, oldToken, "acp.csv");
    expect(stale.status).toBe(404);
    const fresh = await fetchFeed(
      tenants.a.merchant.slug,
      await getOrCreateFeedToken(db, tenants.a.merchant.id),
      "acp.csv",
    );
    expect(fresh.status).toBe(200);
  });
});
