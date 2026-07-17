import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";

/**
 * Ingest-path tenant isolation (M1 exit criterion, issue #12): every API
 * ingest surface exercised as two authenticated identities + anonymous,
 * against the real route handlers with a PGlite-backed db.
 */

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

// Mutable session the mocked auth() returns — switch identity per call.
let currentSession: {
  user?: { email: string };
  activeMerchant?: {
    merchantId: string;
    role: string;
    name: string;
    slug: string;
  } | null;
} | null = null;

vi.mock("@/auth", () => ({
  auth: async () => currentSession,
}));

vi.mock("@/db", async () => ({
  getDb: () => db,
  schema: await import("@/db/schema"),
}));

function actAs(tenant: { merchant: { id: string; name: string; slug: string } } | null) {
  currentSession = tenant
    ? {
        user: { email: `${tenant.merchant.slug}@example.com` },
        activeMerchant: {
          merchantId: tenant.merchant.id,
          role: "owner",
          name: tenant.merchant.name,
          slug: tenant.merchant.slug,
        },
      }
    : null;
}

function csvUpload(rows: string, mapping?: object, sourceId?: string) {
  const form = new FormData();
  form.append(
    "file",
    new File([`sku,title,price\n${rows}`], "cat.csv", { type: "text/csv" }),
  );
  if (mapping) form.append("mapping", JSON.stringify(mapping));
  if (sourceId) form.append("sourceId", sourceId);
  return new Request("http://test.local/api/upload/import", {
    method: "POST",
    body: form,
  });
}

const MAPPING = {
  columns: { externalId: "sku", title: "title", price: "price" },
  defaultCurrency: "EUR",
};

beforeAll(async () => {
  process.env.CREDENTIALS_KEY = "d".repeat(64);
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  delete process.env.CREDENTIALS_KEY;
  await close();
});

describe("upload import isolation", () => {
  it("A imports into A's catalog only", async () => {
    const { POST } = await import("./upload/import/route");
    actAs(tenants.a);
    const res = await POST(csvUpload("A-1,A Product,5", MAPPING));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.upserted).toBe(1);

    const aRows = await tenants.a.scope.products.list();
    expect(aRows.some((p) => p.externalId === "A-1")).toBe(true);
    const bRows = await tenants.b.scope.products.list();
    expect(bRows.some((p) => p.externalId === "A-1")).toBe(false);
  });

  it("B reusing A's sourceId gets a 404 with no tenant data in the body", async () => {
    const { POST } = await import("./upload/import/route");
    actAs(tenants.a);
    const first = await (
      await POST(csvUpload("A-2,Another,7", MAPPING))
    ).json();

    actAs(tenants.b);
    const res = await POST(csvUpload("B-EVIL,Evil,1", MAPPING, first.sourceId));
    expect(res.status).toBe(404);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(tenants.a.merchant.id);
    expect(text).not.toContain("A-2");

    const aRows = await tenants.a.scope.products.list();
    expect(aRows.some((p) => p.externalId === "B-EVIL")).toBe(false);
  });

  it("anonymous upload is redirected to sign-in, nothing written", async () => {
    const { POST } = await import("./upload/import/route");
    actAs(null);
    await expect(POST(csvUpload("X-1,Anon,1", MAPPING))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    const aRows = await tenants.a.scope.products.list();
    expect(aRows.some((p) => p.externalId === "X-1")).toBe(false);
  });
});

describe("sync trigger isolation", () => {
  it("B cannot sync A's source; error leaks no tenant data", async () => {
    const { POST } = await import("./sources/[id]/sync/route");
    const [aSource] = await tenants.a.scope.sources.insert([
      { type: "woocommerce", name: "A store", config: { baseUrl: "https://a.example.com" } },
    ]);

    actAs(tenants.b);
    const res = await POST(
      new Request("http://test.local/api/sources/x/sync", { method: "POST" }),
      { params: Promise.resolve({ id: aSource.id }) },
    );
    expect(res.status).toBe(422);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(tenants.a.merchant.id);
    expect(text).not.toContain("A store");
  });

  it("anonymous sync trigger is redirected", async () => {
    const { POST } = await import("./sources/[id]/sync/route");
    actAs(null);
    await expect(
      POST(new Request("http://test.local/api/sources/x/sync", { method: "POST" }), {
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("woocommerce source creation isolation", () => {
  it("creates the source only in the caller's tenant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { POST } = await import("./sources/woocommerce/route");
    actAs(tenants.b);
    const res = await POST(
      new Request("http://test.local/api/sources/woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "B woo",
          baseUrl: "https://b-store.example.com",
          consumerKey: "ck_b",
          consumerSecret: "cs_b",
        }),
      }),
    );
    expect(res.status).toBe(200);
    vi.unstubAllGlobals();

    const bSources = await tenants.b.scope.sources.list();
    expect(bSources.some((s) => s.name === "B woo")).toBe(true);
    const aSources = await tenants.a.scope.sources.list();
    expect(aSources.some((s) => s.name === "B woo")).toBe(false);
  });
});
