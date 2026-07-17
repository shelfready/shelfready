import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/feeds/expand";
import { auditCatalog, auditEntry, grade, skuScore } from "./rules";

const SELLER = {
  sellerName: "Shop",
  sellerUrl: "https://shop.example.com",
  storeCountry: "DE",
};

function entry(overrides: Partial<CatalogEntry>): CatalogEntry {
  return {
    itemId: "SKU-1",
    groupId: "SKU-1",
    title: "Alpine Tent",
    description:
      "A lightweight two-person tent with taped seams and aluminium poles for serious hikers.",
    brand: "Demo",
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

describe("auditEntry rules", () => {
  it("clean entry produces no findings and a perfect score", () => {
    const findings = auditEntry(entry({}));
    expect(findings).toEqual([]);
    expect(skuScore(findings)).toBe(100);
  });

  const cases: [Partial<CatalogEntry>, string, string][] = [
    [{ gtin: null }, "gtin_missing", "warning"],
    [{ gtin: "4006381333932" }, "gtin_invalid", "error"],
    [{ title: null }, "title_missing", "error"],
    [{ title: "x".repeat(151) }, "title_overlong", "error"],
    [{ description: null }, "description_missing", "error"],
    [{ description: "Short." }, "description_thin", "info"],
    [{ brand: null }, "brand_missing", "warning"],
    [{ url: null }, "url_missing", "error"],
    [{ url: "http://shop.example.com/x" }, "url_not_https", "error"],
    [{ imageUrl: null }, "image_missing", "error"],
    [{ priceMinor: null }, "price_missing", "error"],
    [{ availability: "unknown" }, "availability_unknown", "warning"],
  ];
  it.each(cases)("flags %o as %s (%s)", (patch, code, severity) => {
    const findings = auditEntry(entry(patch));
    const hit = findings.find((f) => f.code === code);
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe(severity);
  });

  it("fixing an issue never lowers the score (monotonicity)", () => {
    const broken = auditEntry(entry({ gtin: null, brand: null }));
    const halfFixed = auditEntry(entry({ gtin: null }));
    const fixed = auditEntry(entry({}));
    expect(skuScore(halfFixed)).toBeGreaterThan(skuScore(broken));
    expect(skuScore(fixed)).toBeGreaterThan(skuScore(halfFixed));
  });

  it("scores floor at 0", () => {
    const findings = auditEntry(
      entry({
        gtin: "bad",
        title: null,
        description: null,
        brand: null,
        url: null,
        imageUrl: null,
        priceMinor: null,
        availability: "unknown",
      }),
    );
    expect(skuScore(findings)).toBe(0);
  });
});

describe("auditCatalog", () => {
  it("aggregates the mean and grades it", () => {
    const audit = auditCatalog([entry({}), entry({ gtin: null })], SELLER);
    expect(audit.catalogScore).toBe(Math.round((100 + 82) / 2));
    expect(audit.grade).toBe("A");
    expect(audit.catalogFindings).toEqual([]);
  });

  it("caps the catalog score when seller settings are missing", () => {
    const audit = auditCatalog([entry({})], {});
    expect(audit.catalogScore).toBeLessThanOrEqual(40);
    expect(audit.catalogFindings[0].code).toBe("seller_settings_missing");
    expect(["D", "F"]).toContain(audit.grade);
  });

  it("empty catalog scores 0 / F", () => {
    const audit = auditCatalog([], SELLER);
    expect(audit.catalogScore).toBe(0);
    expect(audit.grade).toBe("F");
  });
});

describe("grade boundaries", () => {
  it("maps scores to letters", () => {
    expect(grade(95)).toBe("A");
    expect(grade(90)).toBe("A");
    expect(grade(89)).toBe("B");
    expect(grade(60)).toBe("C");
    expect(grade(59)).toBe("D");
    expect(grade(10)).toBe("F");
  });
});
