import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "./test-db";
import { createTwoTenants } from "./test-tenants";
import { products } from "./schema";

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

describe("tenant isolation via forMerchant", () => {
  it("lists only the scope's own rows", async () => {
    const aRows = await tenants.a.scope.products.list();
    const bRows = await tenants.b.scope.products.list();
    expect(aRows.length).toBeGreaterThan(0);
    expect(aRows.every((p) => p.merchantId === tenants.a.merchant.id)).toBe(
      true,
    );
    expect(bRows.every((p) => p.merchantId === tenants.b.merchant.id)).toBe(
      true,
    );
  });

  it("cannot read another tenant's row by id", async () => {
    const bProduct = tenants.b.products[0];
    expect(await tenants.a.scope.products.getById(bProduct.id)).toBeUndefined();
    // ...while B itself can.
    expect(await tenants.b.scope.products.getById(bProduct.id)).toBeDefined();
  });

  it("cannot update another tenant's row (0 rows affected)", async () => {
    const bProduct = tenants.b.products[0];
    const result = await tenants.a.scope.products.update(bProduct.id, {
      title: "hijacked",
    });
    expect(result).toBeUndefined();
    const [fresh] = await db
      .select()
      .from(products)
      .where(eq(products.id, bProduct.id));
    expect(fresh.title).not.toBe("hijacked");
  });

  it("cannot delete another tenant's row (0 rows affected)", async () => {
    const bProduct = tenants.b.products[0];
    expect(await tenants.a.scope.products.remove(bProduct.id)).toBe(0);
    const [still] = await db
      .select()
      .from(products)
      .where(eq(products.id, bProduct.id));
    expect(still).toBeDefined();
  });

  it("neutralizes a smuggled merchantId on insert", async () => {
    const [row] = await tenants.a.scope.products.insert([
      {
        sourceId: tenants.a.source.id,
        externalId: "SKU-SPOOF",
        title: "Spoof attempt",
        // Attempt to write into tenant B.
        ...( { merchantId: tenants.b.merchant.id } as object),
      },
    ]);
    expect(row.merchantId).toBe(tenants.a.merchant.id);
    expect(await tenants.b.scope.products.getById(row.id)).toBeUndefined();
  });

  it("update cannot move a row to another tenant", async () => {
    const aProduct = tenants.a.products[0];
    const updated = await tenants.a.scope.products.update(aProduct.id, {
      title: "still mine",
      ...({ merchantId: tenants.b.merchant.id } as object),
    });
    expect(updated?.merchantId).toBe(tenants.a.merchant.id);
  });

  it("scopes every tenant-owned table, not just products", async () => {
    const aSources = await tenants.a.scope.sources.list();
    expect(aSources.map((s) => s.id)).toEqual([tenants.a.source.id]);
    expect(
      await tenants.a.scope.sources.getById(tenants.b.source.id),
    ).toBeUndefined();

    const aVariants = await tenants.a.scope.variants.list();
    expect(
      aVariants.every((v) => v.merchantId === tenants.a.merchant.id),
    ).toBe(true);
  });
});
