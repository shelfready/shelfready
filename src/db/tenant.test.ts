import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "./test-db";
import { createTwoTenants } from "./test-tenants";
import { findMerchantByApiKeyHash } from "./tenant";
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

  it("isolates api_keys and resolves merchants only by exact hash", async () => {
    const [aKey] = await tenants.a.scope.apiKeys.insert([
      { name: "a key", prefix: "sr_aaaaaaaa", keyHash: "hash-a", scopes: ["read"] },
    ]);
    await tenants.b.scope.apiKeys.insert([
      { name: "b key", prefix: "sr_bbbbbbbb", keyHash: "hash-b", scopes: ["read", "write"] },
    ]);

    // Tenant A cannot see or revoke tenant B's key through the scope.
    expect((await tenants.a.scope.apiKeys.list()).map((k) => k.keyHash)).toEqual(["hash-a"]);
    const bKeys = await tenants.b.scope.apiKeys.list();
    expect(await tenants.a.scope.apiKeys.update(bKeys[0].id, { revokedAt: new Date() })).toBeUndefined();

    // The auth entry point resolves the right merchant, and only for live keys.
    const auth = await findMerchantByApiKeyHash(db, "hash-b");
    expect(auth).toMatchObject({
      merchantId: tenants.b.merchant.id,
      scopes: ["read", "write"],
    });
    expect(await findMerchantByApiKeyHash(db, "hash-nope")).toBeUndefined();

    await tenants.a.scope.apiKeys.update(aKey.id, { revokedAt: new Date() });
    expect(await findMerchantByApiKeyHash(db, "hash-a")).toBeUndefined();

    // Successful auth touches last_used_at.
    const [bRow] = await tenants.b.scope.apiKeys.list();
    expect(bRow.lastUsedAt).not.toBeNull();
  });
});
