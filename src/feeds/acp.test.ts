import { describe, expect, it } from "vitest";
import { parse } from "csv-parse/sync";
import {
  ACP_COLUMNS,
  buildAcpItems,
  formatPrice,
  renderAcpCsv,
  renderAcpJson,
  type SellerSettings,
} from "./acp";
import type { products, variants } from "@/db/schema";

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

const SELLER: SellerSettings = {
  sellerName: "Demo Outdoor Supply",
  sellerUrl: "https://demo-outdoor.example.com",
  storeCountry: "DE",
};

let seq = 0;
function product(overrides: Partial<ProductRow>): ProductRow {
  return {
    id: `p-${++seq}`,
    merchantId: "m-1",
    sourceId: "s-1",
    externalId: `SKU-${seq}`,
    title: "Alpine Tent",
    description: "A tent that keeps you dry.",
    brand: "Demo Outdoor",
    url: "https://demo-outdoor.example.com/tent",
    imageUrl: "https://demo-outdoor.example.com/tent.jpg",
    priceMinor: 24900,
    currency: "EUR",
    availability: "in_stock",
    gtin: "4006381333931",
    mpn: null,
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProductRow;
}

function variant(productId: string, overrides: Partial<VariantRow>): VariantRow {
  return {
    id: `v-${++seq}`,
    merchantId: "m-1",
    productId,
    externalId: `VAR-${seq}`,
    sku: null,
    title: null,
    priceMinor: null,
    currency: null,
    availability: "in_stock",
    gtin: null,
    mpn: null,
    color: null,
    size: null,
    sizeSystem: null,
    gender: null,
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as VariantRow;
}

describe("buildAcpItems", () => {
  it("emits an eligible item for a complete simple product", () => {
    const [item] = buildAcpItems([product({})], [], SELLER);
    expect(item.is_eligible_search).toBe(true);
    expect(item.is_eligible_checkout).toBe(false);
    expect(item.price).toBe("249.00");
    expect(item.currency).toBe("EUR");
    expect(item.seller_name).toBe(SELLER.sellerName);
    expect(item.store_country).toBe("DE");
    expect(item.gtin).toBe("4006381333931");
  });

  it("marks incomplete items ineligible instead of dropping them", () => {
    const items = buildAcpItems(
      [product({ description: null }), product({ availability: "unknown" })],
      [],
      SELLER,
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => !i.is_eligible_search)).toBe(true);
  });

  it("is ineligible without seller settings", () => {
    const [item] = buildAcpItems([product({})], [], {});
    expect(item.is_eligible_search).toBe(false);
  });

  it("emits one row per variant sharing group_id, inheriting content", () => {
    const p = product({ externalId: "PARENT" });
    const items = buildAcpItems(
      [p],
      [
        variant(p.id, { externalId: "PARENT-M", size: "M", priceMinor: 1999, currency: "EUR" }),
        variant(p.id, { externalId: "PARENT-L", size: "L", availability: "out_of_stock" }),
      ],
      SELLER,
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.group_id === "PARENT")).toBe(true);
    expect(items[0]).toMatchObject({ item_id: "PARENT-M", size: "M", price: "19.99" });
    // L inherits the parent price, carries its own availability
    expect(items[1]).toMatchObject({ item_id: "PARENT-L", price: "249.00", availability: "out_of_stock" });
    expect(items[1].title).toBe(p.title);
  });

  it("drops invalid GTINs from the feed field (audit handles the finding)", () => {
    const [item] = buildAcpItems([product({ gtin: "4006381333932" })], [], SELLER);
    expect(item.gtin).toBe("");
    expect(item.is_eligible_search).toBe(true); // gtin is recommended, not required
  });
});

describe("formatPrice", () => {
  it("formats by currency exponent", () => {
    expect(formatPrice(24900, "EUR")).toBe("249.00");
    expect(formatPrice(24900, "JPY")).toBe("249"); // zero-decimal currency
  });
});

describe("renderAcpCsv", () => {
  it("emits the exact ACP header and escapes safely", () => {
    const items = buildAcpItems(
      [product({ title: 'Tent, "Alpine"\nEdition', description: "line1\nline2" })],
      [],
      SELLER,
    );
    const csv = renderAcpCsv(items);
    const [header] = csv.split("\n");
    expect(header).toBe(ACP_COLUMNS.join(","));

    const records = parse(csv, { columns: true }) as Record<string, string>[];
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe('Tent, "Alpine"\nEdition');
    expect(records[0].description).toBe("line1\nline2");
    expect(records[0].is_eligible_checkout).toBe("false");
  });
});

describe("renderAcpJson", () => {
  it("emits an items array with full column coverage", () => {
    const json = JSON.parse(renderAcpJson(buildAcpItems([product({})], [], SELLER)));
    expect(json.items).toHaveLength(1);
    for (const col of ACP_COLUMNS) expect(json.items[0]).toHaveProperty(col);
  });
});
