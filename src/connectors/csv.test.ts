import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  guessMapping,
  normalizeAvailability,
  parsePriceToMinor,
  parseUpload,
  rowToCanonical,
  type CsvMapping,
} from "./csv";

describe("parseUpload (csv)", () => {
  it("parses a straightforward csv", async () => {
    const buf = Buffer.from("sku,title,price\nA-1,Widget,12.99\nA-2,Gadget,5\n");
    const { headers, rows } = await parseUpload("catalog.csv", buf);
    expect(headers).toEqual(["sku", "title", "price"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ sku: "A-1", title: "Widget", price: "12.99" });
  });

  it("handles BOM, semicolons, quoted newlines, and empty lines", async () => {
    const buf = Buffer.from(
      '﻿sku;title;description\nB-1;Tent;"Line one\nline two"\n\nB-2;Sock;plain\n',
    );
    const { headers, rows } = await parseUpload("export.csv", buf);
    expect(headers).toEqual(["sku", "title", "description"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toContain("line two");
  });

  it("does not split unquoted commas when the delimiter is a semicolon", async () => {
    const buf = Buffer.from(
      "sku;title;price\nM-1;Tent;€ 1.299,00\nM-2;Sock;12,99\n",
    );
    const { rows } = await parseUpload("euro.csv", buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].price).toBe("€ 1.299,00");
  });

  it("parses xlsx via the first worksheet", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Catalog");
    ws.addRow(["SKU", "Name", "Price"]);
    ws.addRow(["X-1", "Excel Widget", "19,99"]);
    ws.addRow([]);
    ws.addRow(["X-2", "Excel Gadget", "7"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { headers, rows } = await parseUpload("catalog.xlsx", buf);
    expect(headers).toEqual(["SKU", "Name", "Price"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ SKU: "X-1", Name: "Excel Widget" });
  });
});

describe("guessMapping", () => {
  it("maps common header synonyms", () => {
    const guess = guessMapping(["SKU", "Product Name", "EAN", "Image Link", "Regular Price", "Stock Status"]);
    expect(guess).toMatchObject({
      externalId: "SKU",
      title: "Product Name",
      gtin: "EAN",
      imageUrl: "Image Link",
      price: "Regular Price",
      availability: "Stock Status",
    });
  });

  it("leaves unknown headers unmapped", () => {
    expect(guessMapping(["foo", "bar"])).toEqual({});
  });
});

describe("parsePriceToMinor", () => {
  const cases: [string, number | null][] = [
    ["12.99", 1299],
    ["12,99", 1299],
    ["€12.99", 1299],
    ["12,99 лв", 1299],
    ["1.299,00", 129900],
    ["1,299.00", 129900],
    ["1299", 129900],
    ["1.299", 129900], // thousands, not decimal (3 digits after dot)
    ["0", 0],
    ["free", null],
    ["-5", null],
  ];
  it.each(cases)("%s -> %s", (input, expected) => {
    expect(parsePriceToMinor(input)).toBe(expected);
  });
});

describe("normalizeAvailability", () => {
  it("normalizes common vocabularies", () => {
    expect(normalizeAvailability("instock")).toBe("in_stock");
    expect(normalizeAvailability("In Stock")).toBe("in_stock");
    expect(normalizeAvailability("1")).toBe("in_stock");
    expect(normalizeAvailability("outofstock")).toBe("out_of_stock");
    expect(normalizeAvailability("Sold Out")).toBe("out_of_stock");
    expect(normalizeAvailability("pre-order")).toBe("pre_order");
    expect(normalizeAvailability("backorder")).toBe("backorder");
    expect(normalizeAvailability("")).toBe("unknown");
    expect(normalizeAvailability("weird")).toBe("unknown");
  });
});

describe("rowToCanonical", () => {
  const mapping: CsvMapping = {
    columns: {
      externalId: "sku",
      title: "name",
      description: "desc",
      price: "price",
      gtin: "ean",
      availability: "stock",
    },
    defaultCurrency: "EUR",
  };

  it("maps, strips html, parses price, applies currency", () => {
    const out = rowToCanonical(
      {
        sku: "A-1",
        name: "Widget",
        desc: "<p>Nice <b>widget</b></p>",
        price: "€ 12,99",
        ean: "4006381333931",
        stock: "instock",
      },
      mapping,
    ) as Record<string, unknown>;
    expect(out).toMatchObject({
      externalId: "A-1",
      title: "Widget",
      description: "Nice widget",
      priceMinor: 1299,
      currency: "EUR",
      availability: "in_stock",
      gtin: "4006381333931",
    });
  });

  it("omits currency when there is no price and skips empty cells", () => {
    const out = rowToCanonical({ sku: "A-2", name: "" }, mapping) as Record<
      string,
      unknown
    >;
    expect(out.priceMinor).toBeUndefined();
    expect(out.currency).toBeUndefined();
    expect(out.title).toBeUndefined();
  });
});
