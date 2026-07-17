import { describe, expect, it } from "vitest";
import {
  canonicalProductSchema,
  isIsoCountry,
  isIsoCurrency,
  validateProduct,
} from "./product";

const valid = {
  externalId: "SKU-1",
  title: "Alpine 2-Person Tent",
  description: "Lightweight two-person tent with taped seams.",
  brand: "Demo Outdoor",
  url: "https://shop.example.com/tent",
  imageUrl: "https://shop.example.com/tent.jpg",
  priceMinor: 24900,
  currency: "EUR",
  availability: "in_stock",
  gtin: "4006381333931",
};

describe("canonicalProductSchema", () => {
  it("accepts a fully-populated valid product", () => {
    const { product, issues } = validateProduct(valid);
    expect(product).not.toBeNull();
    expect(issues).toEqual([]);
  });

  it("applies defaults for availability, variants, attributes", () => {
    const parsed = canonicalProductSchema.parse({ externalId: "X" });
    expect(parsed.availability).toBe("unknown");
    expect(parsed.variants).toEqual([]);
    expect(parsed.attributes).toEqual({});
  });

  const errorCases: [string, object, string][] = [
    ["overlong title", { title: "x".repeat(151) }, "title"],
    ["overlong externalId", { externalId: "x".repeat(101) }, "externalId"],
    ["overlong description", { description: "x".repeat(5001) }, "description"],
    ["overlong brand", { brand: "x".repeat(71) }, "brand"],
    ["http (non-https) url", { url: "http://shop.example.com/tent" }, "url"],
    ["non-url imageUrl", { imageUrl: "not a url" }, "imageUrl"],
    ["negative price", { priceMinor: -1 }, "priceMinor"],
    ["fractional price", { priceMinor: 12.5 }, "priceMinor"],
    ["unknown currency", { currency: "EUX" }, "currency"],
    ["bad availability", { availability: "sold_out" }, "availability"],
    ["bad gtin checksum", { gtin: "4006381333932" }, "gtin"],
    ["bad gtin length", { gtin: "12345" }, "gtin"],
  ];

  it.each(errorCases)("rejects %s with a field-addressed error", (_n, patch, field) => {
    const { product, issues } = validateProduct({ ...valid, ...patch });
    expect(product).toBeNull();
    expect(issues.some((i) => i.field === field && i.severity === "error")).toBe(
      true,
    );
  });

  it("validates nested variants with their own field paths", () => {
    const { product, issues } = validateProduct({
      ...valid,
      variants: [{ externalId: "SKU-1-M", gtin: "bad" }],
    });
    expect(product).toBeNull();
    expect(issues[0].field).toBe("variants.0.gtin");
  });
});

describe("feed-readiness warnings", () => {
  it("warns on missing recommended/required-for-feed fields", () => {
    const { product, issues } = validateProduct({ externalId: "SKU-BARE" });
    expect(product).not.toBeNull();
    const codes = issues.map((i) => i.code).sort();
    expect(codes).toContain("missing_gtin");
    expect(codes).toContain("missing_brand");
    expect(codes).toContain("missing_title");
    expect(codes).toContain("missing_priceMinor");
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("vocabulary helpers", () => {
  it("validates ISO-4217 currencies via Intl", () => {
    expect(isIsoCurrency("USD")).toBe(true);
    expect(isIsoCurrency("BGN")).toBe(true);
    expect(isIsoCurrency("EUX")).toBe(false);
  });

  it("validates ISO-3166 alpha-2 countries via Intl", () => {
    expect(isIsoCountry("DE")).toBe(true);
    expect(isIsoCountry("BG")).toBe(true);
    expect(isIsoCountry("ZZ")).toBe(false);
    expect(isIsoCountry("de")).toBe(false);
  });
});
