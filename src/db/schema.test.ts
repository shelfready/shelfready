import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "./test-db";
import { seedDemo } from "./seed-data";
import { auditFindings, feedRuns, merchants, products, variants } from "./schema";

let db: TestDb;
let close: () => Promise<void>;
let seeded: Awaited<ReturnType<typeof seedDemo>>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  seeded = await seedDemo(db);
});

afterAll(async () => {
  await close();
});

describe("schema round-trips", () => {
  it("seeds merchant, user, membership, source, products, variants", async () => {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.merchantId, seeded.merchant.id));
    expect(rows).toHaveLength(3);

    const vs = await db
      .select()
      .from(variants)
      .where(eq(variants.merchantId, seeded.merchant.id));
    expect(vs).toHaveLength(2);
    expect(vs.every((v) => v.productId)).toBe(true);
  });

  it("round-trips feed_runs and audit_findings", async () => {
    const [run] = await db
      .insert(feedRuns)
      .values({
        merchantId: seeded.merchant.id,
        sourceId: seeded.source.id,
        kind: "sync",
        status: "succeeded",
        stats: { itemsSeen: 3, itemsUpserted: 3 },
        finishedAt: new Date(),
      })
      .returning();
    expect(run.stats).toEqual({ itemsSeen: 3, itemsUpserted: 3 });

    const [finding] = await db
      .insert(auditFindings)
      .values({
        merchantId: seeded.merchant.id,
        productId: seeded.products[1].id,
        code: "gtin_invalid_checksum",
        severity: "error",
        field: "gtin",
        message: "GTIN 4006381333932 fails the GS1 check digit",
      })
      .returning();
    expect(finding.severity).toBe("error");
    expect(finding.resolvedAt).toBeNull();
  });
});

// Drizzle wraps DB errors ("Failed query: …") with the Postgres error on
// `cause` — assert against the underlying message.
async function expectDbError(run: Promise<unknown>, pattern: RegExp) {
  const err = await run.then(
    () => null,
    (e: unknown) => e as Error,
  );
  expect(err).not.toBeNull();
  const message = `${err!.message} ${(err!.cause as Error | undefined)?.message ?? ""}`;
  expect(message).toMatch(pattern);
}

describe("constraints", () => {
  it("rejects a duplicate (source, external_id) product", async () => {
    await expectDbError(
      db.insert(products).values({
        merchantId: seeded.merchant.id,
        sourceId: seeded.source.id,
        externalId: "SKU-1001",
        title: "Duplicate",
      }),
      /duplicate key|unique/i,
    );
  });

  it("rejects an availability value outside the ACP enum", async () => {
    const bad = {
      merchantId: seeded.merchant.id,
      sourceId: seeded.source.id,
      externalId: "SKU-BAD-AVAIL",
      availability: "sold_out",
    };
    await expect(
      // @ts-expect-error — 'sold_out' is not in the ACP availability enum
      db.insert(products).values(bad),
    ).rejects.toThrow();
  });

  it("rejects orphan rows (FK to a missing merchant)", async () => {
    await expectDbError(
      db.insert(products).values({
        merchantId: "00000000-0000-0000-0000-000000000000",
        sourceId: seeded.source.id,
        externalId: "SKU-ORPHAN",
      }),
      /foreign key/i,
    );
  });

  it("deleting a merchant cascades to its catalog", async () => {
    // Second tenant on the same db; the dedicated two-tenant isolation
    // harness lands with issue #4.
    const fresh = await seedDemo(db, "-2");
    await db.delete(merchants).where(eq(merchants.id, fresh.merchant.id));
    const left = await db
      .select()
      .from(products)
      .where(eq(products.merchantId, fresh.merchant.id));
    expect(left).toHaveLength(0);
  });
});
