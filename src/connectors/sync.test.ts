import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { feedRuns, sources } from "@/db/schema";
import { registerConnector } from "./registry";
import {
  getSourceCredentials,
  runSync,
  setSourceCredentials,
} from "./sync";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

// Fake connector: config carries the items to yield — the pipeline can't
// tell it from a real platform connector (by design, ADR-0003).
registerConnector({
  type: "fake",
  capabilities: { pull: true, watchInventory: false },
  async *fetchProducts({ config }) {
    yield* (config as { items: unknown[] }).items;
  },
});

const validItem = {
  externalId: "FAKE-1",
  title: "Fake Product",
  description: "A perfectly valid fake product for pipeline tests.",
  brand: "FakeBrand",
  url: "https://fake.example.com/p/1",
  imageUrl: "https://fake.example.com/p/1.jpg",
  priceMinor: 1999,
  currency: "EUR",
  availability: "in_stock",
  gtin: "4006381333931",
  variants: [
    { externalId: "FAKE-1-M", size: "M", priceMinor: 1999, currency: "EUR" },
  ],
};

async function makeFakeSource(merchantId: string, items: unknown[]) {
  const [source] = await db
    .insert(sources)
    .values({ merchantId, type: "fake", name: "Fake source", config: { items } })
    .returning();
  return source;
}

beforeAll(async () => {
  process.env.CREDENTIALS_KEY = "b".repeat(64);
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  delete process.env.CREDENTIALS_KEY;
  await close();
});

describe("runSync", () => {
  it("validates, upserts, and records a succeeded run with stats", async () => {
    const source = await makeFakeSource(tenants.a.merchant.id, [
      validItem,
      { externalId: "FAKE-BAD", gtin: "not-a-gtin" },
    ]);
    const { runId, stats } = await runSync(db, tenants.a.merchant.id, source.id);

    expect(stats).toMatchObject({ seen: 2, upserted: 1, rejected: 1 });
    expect(stats.rejections[0]).toMatchObject({ externalId: "FAKE-BAD" });

    const [run] = await db.select().from(feedRuns).where(eq(feedRuns.id, runId));
    expect(run.status).toBe("succeeded");
    expect(run.finishedAt).not.toBeNull();

    const rows = await tenants.a.scope.products.list();
    const fake = rows.find((p) => p.externalId === "FAKE-1");
    expect(fake?.title).toBe("Fake Product");
    const vs = await tenants.a.scope.variants.list();
    expect(vs.some((v) => v.externalId === "FAKE-1-M")).toBe(true);

    const [src] = await db.select().from(sources).where(eq(sources.id, source.id));
    expect(src.lastSyncAt).not.toBeNull();
  });

  it("re-running updates rather than duplicates", async () => {
    const source = await makeFakeSource(tenants.a.merchant.id, [validItem]);
    await runSync(db, tenants.a.merchant.id, source.id);

    const updated = { ...validItem, title: "Fake Product v2" };
    await db
      .update(sources)
      .set({ config: { items: [updated] } })
      .where(eq(sources.id, source.id));
    await runSync(db, tenants.a.merchant.id, source.id);

    const rows = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Fake Product v2");
  });

  it("records a failed run when the connector throws", async () => {
    registerConnector({
      type: "explosive",
      capabilities: { pull: true, watchInventory: false },
      async *fetchProducts() {
        throw new Error("upstream exploded");
      },
    });
    const [source] = await db
      .insert(sources)
      .values({
        merchantId: tenants.a.merchant.id,
        type: "explosive",
        name: "Exploding source",
      })
      .returning();

    await expect(
      runSync(db, tenants.a.merchant.id, source.id),
    ).rejects.toThrow("upstream exploded");
    const runs = await tenants.a.scope.feedRuns.list();
    const failed = runs.find((r) => r.sourceId === source.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toContain("upstream exploded");
  });

  it("tenant isolation: syncing A's source never touches B", async () => {
    const bBefore = await tenants.b.scope.products.list();
    const source = await makeFakeSource(tenants.a.merchant.id, [
      { ...validItem, externalId: "FAKE-ISO" },
    ]);
    await runSync(db, tenants.a.merchant.id, source.id);

    const bAfter = await tenants.b.scope.products.list();
    expect(bAfter).toEqual(bBefore);
    // ...and B cannot run A's source.
    await expect(
      runSync(db, tenants.b.merchant.id, source.id),
    ).rejects.toThrow(/not found/);
  });
});

describe("credentials", () => {
  it("stores only ciphertext and round-trips through the helpers", async () => {
    const source = await makeFakeSource(tenants.a.merchant.id, []);
    await setSourceCredentials(db, tenants.a.merchant.id, source.id, {
      consumerSecret: "cs_supersecret",
    });

    const [row] = await db.select().from(sources).where(eq(sources.id, source.id));
    expect(row.credentialsEnc).toBeTruthy();
    expect(row.credentialsEnc).not.toContain("cs_supersecret");

    const creds = await getSourceCredentials<{ consumerSecret: string }>(
      db,
      tenants.a.merchant.id,
      source.id,
    );
    expect(creds?.consumerSecret).toBe("cs_supersecret");

    // Cross-tenant read comes back empty, not decrypted.
    expect(
      await getSourceCredentials(db, tenants.b.merchant.id, source.id),
    ).toBeNull();
  });
});
