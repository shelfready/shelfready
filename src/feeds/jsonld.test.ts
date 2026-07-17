import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "./expand";
import { buildProductJsonLd, renderJsonLdSnippet } from "./jsonld";

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
    mpn: "MT-100",
    color: null,
    size: null,
    sizeSystem: null,
    gender: null,
    ...overrides,
  };
}

describe("buildProductJsonLd", () => {
  it("builds a complete Product with Offer per rich-result requirements", () => {
    const ld = buildProductJsonLd(entry({}));
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Alpine Tent",
      sku: "SKU-1",
      gtin13: "4006381333931",
      mpn: "MT-100",
      brand: { "@type": "Brand", name: "Demo Outdoor" },
    });
    expect(ld.offers).toMatchObject({
      "@type": "Offer",
      price: "249.00",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
  });

  it("selects the gtin property by length", () => {
    expect(buildProductJsonLd(entry({ gtin: "96385074" }))).toHaveProperty("gtin8");
    expect(buildProductJsonLd(entry({ gtin: "036000291452" }))).toHaveProperty("gtin12");
    expect(buildProductJsonLd(entry({ gtin: "00012345600012" }))).toHaveProperty("gtin14");
    expect(buildProductJsonLd(entry({ gtin: "123" }))).not.toHaveProperty("gtin8");
  });

  it("omits absent fields and unknown availability", () => {
    const ld = buildProductJsonLd(
      entry({ title: null, brand: null, gtin: null, availability: "unknown", priceMinor: null }),
    );
    expect(ld).not.toHaveProperty("name");
    expect(ld).not.toHaveProperty("brand");
    expect(ld.offers).not.toHaveProperty("availability");
    expect(ld.offers).not.toHaveProperty("price");
  });
});

describe("renderJsonLdSnippet", () => {
  it("wraps in a script tag and prevents script breakout", () => {
    const snippet = renderJsonLdSnippet(
      entry({ description: 'evil </script><script>alert(1)</script>' }),
    );
    expect(snippet.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(snippet.endsWith("</script>")).toBe(true);
    // exactly one opening and one closing script tag — the payload's are escaped
    expect(snippet.match(/<script/g)).toHaveLength(1);
    expect(snippet.match(/<\/script>/g)).toHaveLength(1);
    const inner = snippet.slice(snippet.indexOf("\n") + 1, snippet.lastIndexOf("\n"));
    expect(JSON.parse(inner).description).toContain("</script>");
  });
});
