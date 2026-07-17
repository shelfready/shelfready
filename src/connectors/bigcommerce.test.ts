import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import {
  bcPriceMinor,
  fetchBigCommerceProducts,
  mapBcAvailability,
  mapBcProduct,
  testBigCommerceConnection,
} from "./bigcommerce";
import { runSync, setSourceCredentials } from "./sync";
import "./bigcommerce";

const CONFIG = { storeHash: "abc123", storefrontUrl: "https://shop.example.com" };
const CREDS = { accessToken: "tok_test" };

type Fixture = unknown;

function stubBc(fixtures: Record<string, Fixture>) {
  const calls: { path: string; token: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname.replace("/stores/abc123/", "") + url.search;
      calls.push({
        path,
        token: (init?.headers as Record<string, string>)?.["X-Auth-Token"] ?? null,
      });
      const key = Object.keys(fixtures).find((k) => path.startsWith(k));
      if (!key) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      return new Response(JSON.stringify(fixtures[key]), { status: 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapping helpers", () => {
  it("maps availability from status + inventory tracking", () => {
    expect(mapBcAvailability({ availability: "disabled" })).toBe("out_of_stock");
    expect(mapBcAvailability({ availability: "preorder" })).toBe("pre_order");
    expect(mapBcAvailability({ availability: "available" })).toBe("in_stock");
    expect(
      mapBcAvailability({
        availability: "available",
        inventory_tracking: "product",
        inventory_level: 0,
      }),
    ).toBe("out_of_stock");
    expect(
      mapBcAvailability(
        { availability: "available", inventory_tracking: "variant" },
        { inventory_level: 3 },
      ),
    ).toBe("in_stock");
    expect(
      mapBcAvailability(
        { availability: "available", inventory_tracking: "variant" },
        { inventory_level: 0 },
      ),
    ).toBe("out_of_stock");
    expect(
      mapBcAvailability(
        { availability: "available" },
        { purchasing_disabled: true },
      ),
    ).toBe("out_of_stock");
  });

  it("prefers sale price, falls back calculated → regular, in minor units", () => {
    expect(bcPriceMinor(24.99, null)).toBe(2499);
    expect(bcPriceMinor(24.99, 19.99)).toBe(1999);
    expect(bcPriceMinor(24.99, 0, 22.5)).toBe(2250);
    expect(bcPriceMinor(null, null)).toBeUndefined();
    expect(bcPriceMinor(-1, null)).toBeUndefined();
  });

  it("maps a product with variants, options, and storefront URLs", () => {
    const mapped = mapBcProduct(
      {
        id: 77,
        name: "Alpine Jacket",
        sku: "JKT",
        description: "<p>Warm &amp; dry</p>",
        price: 129.0,
        brand_id: 5,
        availability: "available",
        inventory_tracking: "variant",
        custom_url: { url: "/alpine-jacket/" },
        images: [
          { url_standard: "https://cdn.example.com/2.jpg" },
          { url_standard: "https://cdn.example.com/1.jpg", is_thumbnail: true },
        ],
        upc: "4006381333931",
        variants: [
          {
            id: 771,
            sku: "JKT-RED-M",
            price: null,
            sale_price: null,
            inventory_level: 4,
            option_values: [
              { option_display_name: "Color", label: "Red" },
              { option_display_name: "Size", label: "M" },
            ],
          },
          {
            id: 772,
            sku: "JKT-BLUE-M",
            price: 139.0,
            inventory_level: 0,
            option_values: [
              { option_display_name: "Color", label: "Blue" },
              { option_display_name: "Size", label: "M" },
            ],
          },
        ],
      },
      "Ridgeline",
      "EUR",
      "https://shop.example.com",
    ) as Record<string, unknown> & { variants: Record<string, unknown>[] };

    expect(mapped).toMatchObject({
      externalId: "77",
      title: "Alpine Jacket",
      description: "Warm & dry",
      brand: "Ridgeline",
      url: "https://shop.example.com/alpine-jacket/",
      imageUrl: "https://cdn.example.com/1.jpg",
      priceMinor: 12900,
      currency: "EUR",
      gtin: "4006381333931",
    });
    expect(mapped.variants[0]).toMatchObject({
      externalId: "771",
      sku: "JKT-RED-M",
      priceMinor: 12900, // inherits product price
      availability: "in_stock",
      color: "Red",
      size: "M",
    });
    expect(mapped.variants[1]).toMatchObject({
      priceMinor: 13900,
      availability: "out_of_stock",
      color: "Blue",
    });
  });

  it("treats a single auto-generated variant as a simple product", () => {
    const mapped = mapBcProduct(
      {
        id: 8,
        name: "Mug",
        price: 12,
        availability: "available",
        variants: [{ id: 81, sku: "MUG" }],
      },
      undefined,
      "USD",
      undefined,
    ) as { variants: unknown[] };
    expect(mapped.variants).toHaveLength(0);
  });
});

describe("fetchBigCommerceProducts", () => {
  it("paginates, sends the token, caches brand lookups", async () => {
    const page1 = Array.from({ length: 250 }, (_, i) => ({
      id: i + 1,
      name: `P${i + 1}`,
      price: 5,
      brand_id: 5,
      availability: "available",
    }));
    const calls = stubBc({
      "v2/currencies": [{ currency_code: "GBP", is_default: true }],
      "v3/catalog/brands/5": { data: { name: "Ridgeline" } },
      "v3/catalog/products?include=variants,images&limit=250&page=1": {
        data: page1,
      },
      "v3/catalog/products?include=variants,images&limit=250&page=2": {
        data: [{ id: 999, name: "Last", price: 9, availability: "available" }],
      },
    });

    const items = [];
    for await (const item of fetchBigCommerceProducts(CONFIG, CREDS)) {
      items.push(item);
    }

    expect(items).toHaveLength(251);
    expect((items[0] as { currency: string }).currency).toBe("GBP");
    expect((items[0] as { brand: string }).brand).toBe("Ridgeline");
    expect(calls.every((c) => c.token === "tok_test")).toBe(true);
    // 250 products share brand 5 — one lookup, not 250.
    expect(calls.filter((c) => c.path.startsWith("v3/catalog/brands/5"))).toHaveLength(1);
  });

  it("falls back to config currency when /v2/currencies fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("currencies")) return new Response("nope", { status: 500 });
        if (url.includes("page=1"))
          return new Response(
            JSON.stringify({ data: [{ id: 1, name: "P", price: 2, availability: "available" }] }),
            { status: 200 },
          );
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }),
    );
    const items = [];
    for await (const item of fetchBigCommerceProducts(
      { storeHash: "abc123", currency: "BGN" },
      CREDS,
    )) {
      items.push(item);
    }
    expect((items[0] as { currency: string }).currency).toBe("BGN");
  });

  it("testBigCommerceConnection surfaces auth failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    await expect(testBigCommerceConnection(CONFIG, CREDS)).rejects.toThrow(/401/);
  });
});

describe("bigcommerce through the sync pipeline", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

  beforeAll(async () => {
    process.env.CREDENTIALS_KEY = "c".repeat(64);
    ({ db, close } = await createTestDb());
    tenants = await createTwoTenants(db);
  });

  afterAll(async () => {
    delete process.env.CREDENTIALS_KEY;
    await close();
  });

  it("runs a full sync with encrypted credentials and isolation", async () => {
    stubBc({
      "v2/currencies": [{ currency_code: "EUR", is_default: true }],
      "v3/catalog/products?include=variants,images&limit=250&page=1": {
        data: [
          {
            id: 7,
            name: "BC Lantern",
            description: "<p>Bright</p>",
            price: 24.5,
            availability: "available",
            custom_url: { url: "/lantern/" },
            images: [{ url_standard: "https://cdn.example.com/lantern.jpg" }],
          },
        ],
      },
    });

    const [source] = await tenants.a.scope.sources.insert([
      { type: "bigcommerce", name: "BC store", config: CONFIG },
    ]);
    await setSourceCredentials(db, tenants.a.merchant.id, source.id, CREDS);

    const bBefore = await tenants.b.scope.products.list();
    const { stats } = await runSync(db, tenants.a.merchant.id, source.id);
    expect(stats).toMatchObject({ seen: 1, upserted: 1, rejected: 0 });

    const rows = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    expect(rows[0]).toMatchObject({
      externalId: "7",
      title: "BC Lantern",
      priceMinor: 2450,
      currency: "EUR",
      availability: "in_stock",
      url: "https://shop.example.com/lantern/",
    });
    expect(await tenants.b.scope.products.list()).toEqual(bBefore);
  });
});
