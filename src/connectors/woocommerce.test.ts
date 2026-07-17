import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import {
  fetchWooProducts,
  mapStockStatus,
  mapWooProduct,
  stripHtml,
  testWooConnection,
} from "./woocommerce";
import { runSync, setSourceCredentials } from "./sync";
import "./woocommerce";

const CONFIG = { baseUrl: "https://store.example.com" };
const CREDS = { consumerKey: "ck_test", consumerSecret: "cs_test" };

type Fixture = Record<string, unknown>;

function stubWoo(fixtures: Record<string, Fixture[] | Fixture>) {
  const calls: { path: string; auth: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname.replace("/wp-json/wc/v3/", "") + url.search;
      calls.push({
        path,
        auth: (init?.headers as Record<string, string>)?.Authorization ?? null,
      });
      const key = Object.keys(fixtures).find((k) => path.startsWith(k));
      if (!key) return new Response("[]", { status: 200 });
      return new Response(JSON.stringify(fixtures[key]), { status: 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapping helpers", () => {
  it("strips html and entities to plain text", () => {
    expect(stripHtml("<p>Nice <b>tent</b> &amp; more&nbsp;stuff</p>")).toBe(
      "Nice tent & more stuff",
    );
    expect(stripHtml("")).toBeUndefined();
  });

  it("maps woo stock_status to ACP availability", () => {
    expect(mapStockStatus("instock")).toBe("in_stock");
    expect(mapStockStatus("outofstock")).toBe("out_of_stock");
    expect(mapStockStatus("onbackorder")).toBe("backorder");
    expect(mapStockStatus(undefined)).toBe("unknown");
  });

  it("maps a woo product with variations", () => {
    const mapped = mapWooProduct(
      {
        id: 42,
        name: "Vario Shirt",
        sku: "SHIRT",
        permalink: "https://store.example.com/shirt",
        description: "<p>Soft shirt</p>",
        price: "19.99",
        stock_status: "instock",
        type: "variable",
        images: [{ src: "https://store.example.com/shirt.jpg" }],
        global_unique_id: "4006381333931",
      },
      [
        {
          id: 421,
          sku: "SHIRT-M-RED",
          price: "19.99",
          stock_status: "outofstock",
          attributes: [
            { name: "Color", option: "Red" },
            { name: "Size", option: "M" },
          ],
        },
      ],
      "EUR",
    ) as { variants: Record<string, unknown>[] } & Record<string, unknown>;

    expect(mapped).toMatchObject({
      externalId: "42",
      title: "Vario Shirt",
      description: "Soft shirt",
      priceMinor: 1999,
      currency: "EUR",
      availability: "in_stock",
      gtin: "4006381333931",
      attributes: { sku: "SHIRT" },
    });
    expect(mapped.variants[0]).toMatchObject({
      externalId: "421",
      sku: "SHIRT-M-RED",
      availability: "out_of_stock",
      color: "Red",
      size: "M",
    });
  });
});

describe("fetchWooProducts", () => {
  it("paginates, fetches variations for variable products, sends auth", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `P${i + 1}`,
      price: "5.00",
      stock_status: "instock",
      type: "simple",
    }));
    const page2 = [
      {
        id: 200,
        name: "Vario",
        price: "9.00",
        stock_status: "instock",
        type: "variable",
      },
    ];
    const calls = stubWoo({
      "data/currencies/current": { code: "EUR" },
      "products?per_page=100&page=1": page1,
      "products?per_page=100&page=2": page2,
      "products/200/variations": [
        { id: 2001, price: "9.00", stock_status: "instock" },
      ],
    });

    const items = [];
    for await (const item of fetchWooProducts(CONFIG, CREDS)) items.push(item);

    expect(items).toHaveLength(101);
    const vario = items[100] as { variants: unknown[] };
    expect(vario.variants).toHaveLength(1);
    expect(
      calls.every((c) => c.auth === `Basic ${Buffer.from("ck_test:cs_test").toString("base64")}`),
    ).toBe(true);
    expect(calls.some((c) => c.path.startsWith("products/200/variations"))).toBe(
      true,
    );
  });

  it("falls back to config currency when the currency endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("currencies")) return new Response("nope", { status: 500 });
        if (url.includes("page=1"))
          return new Response(
            JSON.stringify([{ id: 1, name: "P", price: "2.00", stock_status: "instock", type: "simple" }]),
            { status: 200 },
          );
        return new Response("[]", { status: 200 });
      }),
    );
    const items = [];
    for await (const item of fetchWooProducts(
      { ...CONFIG, currency: "BGN" },
      CREDS,
    ))
      items.push(item);
    expect((items[0] as { currency: string }).currency).toBe("BGN");
  });

  it("testWooConnection surfaces auth failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    await expect(testWooConnection(CONFIG, CREDS)).rejects.toThrow(/401/);
  });
});

describe("woocommerce through the sync pipeline", () => {
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
    stubWoo({
      "data/currencies/current": { code: "EUR" },
      "products?per_page=100&page=1": [
        {
          id: 7,
          name: "Woo Lantern",
          permalink: "https://store.example.com/lantern",
          description: "<p>Bright</p>",
          price: "24.50",
          stock_status: "instock",
          type: "simple",
          images: [{ src: "https://store.example.com/lantern.jpg" }],
        },
      ],
    });

    const [source] = await tenants.a.scope.sources.insert([
      { type: "woocommerce", name: "Woo store", config: CONFIG },
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
      title: "Woo Lantern",
      priceMinor: 2450,
      currency: "EUR",
      availability: "in_stock",
    });
    expect(await tenants.b.scope.products.list()).toEqual(bBefore);
  });
});
