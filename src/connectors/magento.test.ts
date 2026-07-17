import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import {
  fetchMagentoProducts,
  magentoPriceMinor,
  mapMagentoAvailability,
  mapMagentoProduct,
  testMagentoConnection,
} from "./magento";
import { runSync, setSourceCredentials } from "./sync";
import "./magento";

const CONFIG = { baseUrl: "https://store.example.com" };
const CREDS = { accessToken: "tok_test" };

function stubMagento(fixtures: Record<string, unknown>) {
  const calls: { path: string; auth: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = decodeURIComponent(
        url.pathname.replace("/rest/V1/", "") + url.search,
      );
      calls.push({
        path,
        auth: (init?.headers as Record<string, string>)?.Authorization ?? null,
      });
      const key = Object.keys(fixtures).find((k) => path.startsWith(k));
      if (!key) return new Response(JSON.stringify({ items: [] }), { status: 200 });
      return new Response(JSON.stringify(fixtures[key]), { status: 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const cattr = (code: string, value: unknown) => ({ attribute_code: code, value });

describe("mapping helpers", () => {
  it("maps status + stock_item to ACP availability", () => {
    expect(mapMagentoAvailability({ status: 2 })).toBe("out_of_stock");
    expect(
      mapMagentoAvailability({
        status: 1,
        extension_attributes: { stock_item: { is_in_stock: true } },
      }),
    ).toBe("in_stock");
    expect(
      mapMagentoAvailability({
        status: 1,
        extension_attributes: { stock_item: { is_in_stock: false, backorders: 1 } },
      }),
    ).toBe("backorder");
    expect(
      mapMagentoAvailability({
        status: 1,
        extension_attributes: { stock_item: { is_in_stock: false } },
      }),
    ).toBe("out_of_stock");
    expect(mapMagentoAvailability({ status: 1 })).toBe("unknown");
  });

  it("uses special_price only when set and lower", () => {
    expect(magentoPriceMinor({ price: 49.9 })).toBe(4990);
    expect(
      magentoPriceMinor({
        price: 49.9,
        custom_attributes: [cattr("special_price", "39.90")],
      }),
    ).toBe(3990);
    expect(
      magentoPriceMinor({
        price: 49.9,
        custom_attributes: [cattr("special_price", "59.90")],
      }),
    ).toBe(4990);
    expect(magentoPriceMinor({})).toBeUndefined();
  });

  it("maps a configurable with children, urls, images, attributes", () => {
    const mapped = mapMagentoProduct(
      {
        sku: "JKT",
        name: "Alpine Jacket",
        price: 0,
        status: 1,
        type_id: "configurable",
        custom_attributes: [
          cattr("description", "<p>Warm &amp; dry</p>"),
          cattr("manufacturer", "Ridgeline"),
          cattr("url_key", "alpine-jacket"),
        ],
        media_gallery_entries: [
          { file: "/j/k/jkt.jpg", types: ["image"] },
        ],
        extension_attributes: { stock_item: { is_in_stock: false } },
      },
      [
        {
          sku: "JKT-RED-M",
          name: "Alpine Jacket Red M",
          price: 129,
          status: 1,
          extension_attributes: { stock_item: { is_in_stock: true } },
          custom_attributes: [
            cattr("color", "Red"),
            cattr("size", "M"),
            cattr("ean", "4006381333931"),
          ],
        },
      ],
      "EUR",
      "https://store.example.com/",
    ) as Record<string, unknown> & { variants: Record<string, unknown>[] };

    expect(mapped).toMatchObject({
      externalId: "JKT",
      title: "Alpine Jacket",
      description: "Warm & dry",
      brand: "Ridgeline",
      url: "https://store.example.com/alpine-jacket.html",
      imageUrl: "https://store.example.com/media/catalog/product/j/k/jkt.jpg",
      priceMinor: 12900, // configurable price 0 → child price
      currency: "EUR",
      availability: "in_stock", // any child in stock
    });
    expect(mapped.variants[0]).toMatchObject({
      externalId: "JKT-RED-M",
      priceMinor: 12900,
      availability: "in_stock",
      color: "Red",
      size: "M",
      gtin: "4006381333931",
    });
  });
});

describe("fetchMagentoProducts", () => {
  it("paginates, pulls configurable children, dedupes child simples", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      sku: `P${i}`,
      name: `P${i}`,
      price: 5,
      status: 1,
      type_id: "simple",
      extension_attributes: { stock_item: { is_in_stock: true } },
    }));
    const page2 = [
      {
        sku: "CONF",
        name: "Configurable",
        price: 0,
        status: 1,
        type_id: "configurable",
      },
      // This simple is a child of CONF — must not be emitted twice.
      { sku: "CONF-A", name: "Conf A", price: 9, status: 1, type_id: "simple" },
    ];
    const calls = stubMagento({
      "directory/currency": { base_currency_code: "EUR" },
      "products?searchCriteria[pageSize]=100&searchCriteria[currentPage]=1": {
        items: page1,
      },
      "products?searchCriteria[pageSize]=100&searchCriteria[currentPage]=2": {
        items: page2,
      },
      "configurable-products/CONF/children": [
        { sku: "CONF-A", name: "Conf A", price: 9, status: 1 },
      ],
    });

    const items = [];
    for await (const item of fetchMagentoProducts(CONFIG, CREDS)) items.push(item);

    // 100 simples + 1 configurable; CONF-A folded into CONF as a variant.
    expect(items).toHaveLength(101);
    const conf = items.find(
      (i) => (i as { externalId: string }).externalId === "CONF",
    ) as { variants: unknown[]; priceMinor: number };
    expect(conf.variants).toHaveLength(1);
    expect(conf.priceMinor).toBe(900);
    expect(items.filter((i) => (i as { externalId: string }).externalId === "CONF-A")).toHaveLength(0);
    expect(calls.every((c) => c.auth === "Bearer tok_test")).toBe(true);
  });

  it("filters for enabled products in searchCriteria", async () => {
    const calls = stubMagento({
      "directory/currency": { base_currency_code: "USD" },
    });
    for await (const _ of fetchMagentoProducts(CONFIG, CREDS)) void _;
    const productCall = calls.find((c) => c.path.startsWith("products?"));
    expect(productCall?.path).toContain("[field]=status");
    expect(productCall?.path).toContain("[value]=1");
  });

  it("testMagentoConnection surfaces auth failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    await expect(testMagentoConnection(CONFIG, CREDS)).rejects.toThrow(/401/);
  });
});

describe("magento through the sync pipeline", () => {
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
    stubMagento({
      "directory/currency": { base_currency_code: "EUR" },
      "products?searchCriteria[pageSize]=100&searchCriteria[currentPage]=1": {
        items: [
          {
            sku: "LANTERN",
            name: "Magento Lantern",
            price: 24.5,
            status: 1,
            type_id: "simple",
            custom_attributes: [
              cattr("description", "<p>Bright</p>"),
              cattr("url_key", "lantern"),
            ],
            extension_attributes: { stock_item: { is_in_stock: true } },
          },
        ],
      },
    });

    const [source] = await tenants.a.scope.sources.insert([
      { type: "magento", name: "Magento store", config: CONFIG },
    ]);
    await setSourceCredentials(db, tenants.a.merchant.id, source.id, CREDS);

    const bBefore = await tenants.b.scope.products.list();
    const { stats } = await runSync(db, tenants.a.merchant.id, source.id);
    expect(stats).toMatchObject({ seen: 1, upserted: 1, rejected: 0 });

    const rows = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    expect(rows[0]).toMatchObject({
      externalId: "LANTERN",
      title: "Magento Lantern",
      priceMinor: 2450,
      currency: "EUR",
      availability: "in_stock",
      url: "https://store.example.com/lantern.html",
    });
    expect(await tenants.b.scope.products.list()).toEqual(bBefore);
  });
});
