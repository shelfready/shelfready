import { describe, expect, it } from "vitest";
import { expandCatalog, type CatalogEntry } from "./expand";
import { buildGmcRows, GMC_COLUMNS, renderGmcTsv } from "./gmc";
import type { products, variants } from "@/db/schema";

function entry(overrides: Partial<CatalogEntry>): CatalogEntry {
  return {
    itemId: "SKU-1",
    groupId: "SKU-1",
    title: "Alpine Tent",
    description: "Dry and light.",
    brand: "Demo Outdoor",
    url: "https://shop.example.com/tent",
    imageUrl: "https://shop.example.com/tent.jpg",
    priceMinor: 24900,
    currency: "EUR",
    availability: "in_stock",
    gtin: "4006381333931",
    mpn: null,
    color: null,
    size: null,
    sizeSystem: null,
    gender: null,
    ...overrides,
  };
}

describe("buildGmcRows", () => {
  it("maps a complete entry with GMC price and availability formats", () => {
    const [row] = buildGmcRows([entry({})]);
    expect(row).toMatchObject({
      id: "SKU-1",
      item_group_id: "", // simple product: no group id
      price: "249.00 EUR",
      availability: "in stock",
      condition: "new",
      gtin: "4006381333931",
    });
  });

  it("maps the availability vocabulary incl. unknown → out of stock", () => {
    const rows = buildGmcRows([
      entry({ availability: "out_of_stock" }),
      entry({ availability: "pre_order" }),
      entry({ availability: "backorder" }),
      entry({ availability: "unknown" }),
    ]);
    expect(rows.map((r) => r.availability)).toEqual([
      "out of stock",
      "preorder",
      "backorder",
      "out of stock",
    ]);
  });

  it("sets item_group_id only for variants and blanks invalid gtins", () => {
    const [row] = buildGmcRows([
      entry({ itemId: "SKU-1-M", groupId: "SKU-1", gtin: "123" }),
    ]);
    expect(row.item_group_id).toBe("SKU-1");
    expect(row.gtin).toBe("");
  });
});

describe("renderGmcTsv", () => {
  it("emits the exact header and sanitizes tabs/newlines", () => {
    const tsv = renderGmcTsv([
      entry({ title: "Tent\twith\ttabs", description: "line1\nline2" }),
    ]);
    // no trimEnd on the row — it would eat trailing tabs of empty cells
    const [header, row] = tsv.split("\n");
    expect(header).toBe(GMC_COLUMNS.join("\t"));
    const cells = row.split("\t");
    expect(cells).toHaveLength(GMC_COLUMNS.length);
    expect(cells[GMC_COLUMNS.indexOf("title")]).toBe("Tent with tabs");
    expect(cells[GMC_COLUMNS.indexOf("description")]).toBe("line1 line2");
  });

  it("renders expandCatalog output (integration with shared expansion)", () => {
    const p = {
      id: "p1",
      externalId: "PARENT",
      title: "Shirt",
      description: "Soft.",
      brand: "B",
      url: "https://s.example.com/shirt",
      imageUrl: "https://s.example.com/shirt.jpg",
      priceMinor: 1999,
      currency: "EUR",
      availability: "in_stock",
      gtin: null,
      mpn: null,
    } as unknown as typeof products.$inferSelect;
    const v = {
      id: "v1",
      productId: "p1",
      externalId: "PARENT-M",
      size: "M",
      availability: "in_stock",
      priceMinor: null,
      currency: null,
      gtin: null,
      mpn: null,
      title: null,
      color: null,
      sizeSystem: null,
      gender: null,
    } as unknown as typeof variants.$inferSelect;

    const tsv = renderGmcTsv(expandCatalog([p], [v]));
    const [, row] = tsv.trimEnd().split("\n");
    const cells = row.split("\t");
    expect(cells[GMC_COLUMNS.indexOf("id")]).toBe("PARENT-M");
    expect(cells[GMC_COLUMNS.indexOf("item_group_id")]).toBe("PARENT");
    expect(cells[GMC_COLUMNS.indexOf("price")]).toBe("19.99 EUR");
    expect(cells[GMC_COLUMNS.indexOf("size")]).toBe("M");
  });
});
