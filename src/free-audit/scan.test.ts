import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverProductUrls, runFreeAudit } from "./scan";

const ORIGIN = "https://store.example.com";

const productPage = (price: string, availability = "https://schema.org/InStock") => `
<html><head><title>Nice Product</title>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Nice Product",
 "offers":{"@type":"Offer","price":"${price}","priceCurrency":"EUR","availability":"${availability}"}}
</script></head><body>p</body></html>`;

function stubStore(pages: Record<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const path = new URL(url).pathname + (new URL(url).search ?? "");
      const body = pages[path];
      if (body === undefined) return new Response("not found", { status: 404 });
      return new Response(body, { status: 200 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("discoverProductUrls", () => {
  it("finds product URLs in the sitemap, same-origin only", async () => {
    stubStore({
      "/sitemap.xml": `<urlset>
        <loc>${ORIGIN}/product/tent</loc>
        <loc>${ORIGIN}/about</loc>
        <loc>https://evil.example.com/product/steal</loc>
        <loc>${ORIGIN}/products/sock</loc>
      </urlset>`,
    });
    const urls = await discoverProductUrls(ORIGIN);
    expect(urls).toEqual([`${ORIGIN}/product/tent`, `${ORIGIN}/products/sock`]);
  });

  it("falls back to homepage links when the sitemap is missing", async () => {
    stubStore({
      "/": `<a href="/product/one">1</a> <a href="/blog/post">b</a> <a href="/product/two">2</a>`,
    });
    const urls = await discoverProductUrls(`${ORIGIN}/`);
    expect(urls).toEqual([`${ORIGIN}/product/one`, `${ORIGIN}/product/two`]);
  });

  it("caps the number of candidates", async () => {
    const locs = Array.from({ length: 60 }, (_, i) => `<loc>${ORIGIN}/product/${i}</loc>`).join("");
    stubStore({ "/sitemap.xml": `<urlset>${locs}</urlset>` });
    const urls = await discoverProductUrls(ORIGIN);
    expect(urls.length).toBeLessThanOrEqual(10);
  });
});

describe("runFreeAudit", () => {
  it("scores discovered products with the audit engine", async () => {
    stubStore({
      "/sitemap.xml": `<urlset><loc>${ORIGIN}/product/a</loc><loc>${ORIGIN}/product/b</loc></urlset>`,
      "/product/a": productPage("19.99"),
      "/product/b": productPage("5.00", "https://schema.org/OutOfStock"),
    });
    const result = await runFreeAudit(ORIGIN);
    expect(result.productsFound).toBe(2);
    expect(result.score).toBeGreaterThan(0);
    expect(result.grade).toMatch(/^[A-F]$/);
    expect(result.topIssues.length).toBeGreaterThan(0); // no gtin/brand/desc on pages
    expect(result.noStructuredData).toBe(false);
  });

  it("reports stores with no structured data honestly", async () => {
    stubStore({
      "/sitemap.xml": `<urlset><loc>${ORIGIN}/product/bare</loc></urlset>`,
      "/product/bare": "<html><body>no ld+json here</body></html>",
    });
    const result = await runFreeAudit(ORIGIN);
    expect(result.productsFound).toBe(0);
    expect(result.noStructuredData).toBe(true);
    expect(result.grade).toBe("F");
  });
});
