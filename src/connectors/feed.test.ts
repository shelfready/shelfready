import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import {
  detectFormat,
  parseFeedPrice,
  parseXmlFeed,
  parseCsvFeed,
  testFeedConnection,
  type FeedConfig,
} from "./feed";
import { runSync } from "./sync";
import "./feed";

const GMC_XML = `<?xml version="1.0"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Alpine Outdoor Supply</title>
    <item>
      <g:id>TENT-1</g:id>
      <g:title>Ridgeline 2P Tent</g:title>
      <g:description><![CDATA[<p>Storm-tested &amp; light.</p>]]></g:description>
      <g:link>https://alpine.example.com/tent-1</g:link>
      <g:image_link>https://alpine.example.com/tent-1.jpg</g:image_link>
      <g:price>299.00 EUR</g:price>
      <g:sale_price>249.00 EUR</g:sale_price>
      <g:availability>in_stock</g:availability>
      <g:brand>Ridgeline</g:brand>
      <g:gtin>4006381333931</g:gtin>
      <g:condition>new</g:condition>
    </item>
    <item>
      <g:id>SHIRT-RED-M</g:id>
      <g:item_group_id>SHIRT</g:item_group_id>
      <g:title>Trail Shirt — Red M</g:title>
      <g:link>https://alpine.example.com/shirt</g:link>
      <g:price>19.99 USD</g:price>
      <g:availability>out_of_stock</g:availability>
      <g:color>Red</g:color>
      <g:size>M</g:size>
    </item>
    <item>
      <g:id>SHIRT-BLUE-L</g:id>
      <g:item_group_id>SHIRT</g:item_group_id>
      <g:title>Trail Shirt — Blue L</g:title>
      <g:link>https://alpine.example.com/shirt</g:link>
      <g:price>19.99 USD</g:price>
      <g:availability>in stock</g:availability>
      <g:color>Blue</g:color>
      <g:size>L</g:size>
    </item>
  </channel>
</rss>`;

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <entry>
    <g:id>MUG-1</g:id>
    <title>Camp Mug</title>
    <summary>Steel mug</summary>
    <link href="https://alpine.example.com/mug"/>
    <g:price>12.00 GBP</g:price>
    <g:availability>preorder</g:availability>
  </entry>
</feed>`;

const CSV_FEED = `sku,name,price,stock status,link
BOOT-1,Scree Boot,"€ 1.299,00",in stock,https://alpine.example.com/boot
POLE-1,Trek Pole,49.90,out of stock,https://alpine.example.com/pole`;

function stubFetch(body: string, init?: ResponseInit) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status: 200, ...init })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseFeedPrice", () => {
  it("parses value + ISO currency in either order", () => {
    expect(parseFeedPrice("19.99 USD", undefined)).toEqual({
      priceMinor: 1999,
      currency: "USD",
    });
    expect(parseFeedPrice("EUR 1.299,00", undefined)).toEqual({
      priceMinor: 129900,
      currency: "EUR",
    });
  });

  it("falls back to the default currency for bare prices", () => {
    expect(parseFeedPrice("24.50", "BGN")).toEqual({
      priceMinor: 2450,
      currency: "BGN",
    });
    expect(parseFeedPrice("24.50", undefined)).toBeUndefined();
    expect(parseFeedPrice(undefined, "USD")).toBeUndefined();
  });
});

describe("detectFormat", () => {
  const config: FeedConfig = { feedUrl: "https://x.example.com/feed" };
  it("sniffs xml vs csv, honors explicit format", () => {
    expect(detectFormat(config, Buffer.from("<?xml ..."))).toBe("xml");
    expect(detectFormat(config, Buffer.from("﻿<rss>"))).toBe("xml");
    expect(detectFormat(config, Buffer.from("sku,title\n1,a"))).toBe("csv");
    expect(
      detectFormat({ ...config, format: "csv" }, Buffer.from("<xml>")),
    ).toBe("csv");
  });
});

describe("parseXmlFeed", () => {
  it("maps GMC RSS items, prefers sale price, groups variants", () => {
    const items = parseXmlFeed(Buffer.from(GMC_XML), undefined) as Record<
      string,
      unknown
    >[];
    expect(items).toHaveLength(2);

    expect(items[0]).toMatchObject({
      externalId: "TENT-1",
      title: "Ridgeline 2P Tent",
      description: "Storm-tested & light.",
      brand: "Ridgeline",
      url: "https://alpine.example.com/tent-1",
      imageUrl: "https://alpine.example.com/tent-1.jpg",
      priceMinor: 24900,
      currency: "EUR",
      availability: "in_stock",
      gtin: "4006381333931",
      attributes: { condition: "new" },
    });
    expect(items[0].variants).toBeUndefined();

    const shirt = items[1] as { variants: Record<string, unknown>[] } & Record<
      string,
      unknown
    >;
    expect(shirt.externalId).toBe("SHIRT");
    // Group availability: in stock if any member is.
    expect(shirt.availability).toBe("in_stock");
    expect(shirt.variants).toHaveLength(2);
    expect(shirt.variants[0]).toMatchObject({
      externalId: "SHIRT-RED-M",
      availability: "out_of_stock",
      color: "Red",
      size: "M",
      priceMinor: 1999,
      currency: "USD",
    });
    expect(shirt.variants[1]).toMatchObject({ color: "Blue", size: "L" });
  });

  it("maps Atom entries including href links", () => {
    const [mug] = parseXmlFeed(Buffer.from(ATOM_XML), undefined) as Record<
      string,
      unknown
    >[];
    expect(mug).toMatchObject({
      externalId: "MUG-1",
      title: "Camp Mug",
      description: "Steel mug",
      url: "https://alpine.example.com/mug",
      priceMinor: 1200,
      currency: "GBP",
      availability: "pre_order",
    });
  });

  it("rejects unrecognized XML", () => {
    expect(() => parseXmlFeed(Buffer.from("<html></html>"), undefined)).toThrow(
      /unrecognized/,
    );
  });
});

describe("parseCsvFeed", () => {
  it("auto-maps headers and parses locale prices", async () => {
    const rows = (await parseCsvFeed(Buffer.from(CSV_FEED), "EUR")) as Record<
      string,
      unknown
    >[];
    expect(rows[0]).toMatchObject({
      externalId: "BOOT-1",
      title: "Scree Boot",
      priceMinor: 129900,
      currency: "EUR",
      availability: "in_stock",
      url: "https://alpine.example.com/boot",
    });
    expect(rows[1]).toMatchObject({
      externalId: "POLE-1",
      availability: "out_of_stock",
    });
  });

  it("fails loudly when headers cannot be mapped", async () => {
    await expect(
      parseCsvFeed(Buffer.from("foo,bar\n1,2"), "USD"),
    ).rejects.toThrow(/could not auto-map/);
  });
});

describe("testFeedConnection", () => {
  const config: FeedConfig = { feedUrl: "https://x.example.com/feed.xml" };

  it("returns the item count for a healthy feed", async () => {
    stubFetch(GMC_XML);
    await expect(testFeedConnection(config)).resolves.toEqual({ itemCount: 2 });
  });

  it("rejects non-HTTPS urls and HTTP errors", async () => {
    stubFetch(GMC_XML);
    await expect(
      testFeedConnection({ feedUrl: "http://x.example.com/feed" }),
    ).rejects.toThrow(/HTTPS/);
    stubFetch("nope", { status: 404 });
    await expect(testFeedConnection(config)).rejects.toThrow(/404/);
  });

  it("rejects empty feeds", async () => {
    stubFetch("");
    await expect(testFeedConnection(config)).rejects.toThrow(/empty/);
  });
});

describe("feed through the sync pipeline", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    tenants = await createTwoTenants(db);
  });

  afterAll(async () => {
    await close();
  });

  it("syncs an XML feed with variant groups and tenant isolation", async () => {
    stubFetch(GMC_XML);
    const [source] = await tenants.a.scope.sources.insert([
      {
        type: "feed",
        name: "GMC feed",
        config: { feedUrl: "https://alpine.example.com/feed.xml" },
      },
    ]);

    const bBefore = await tenants.b.scope.products.list();
    const { stats } = await runSync(db, tenants.a.merchant.id, source.id);
    expect(stats).toMatchObject({ seen: 2, upserted: 2, rejected: 0 });

    const rows = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    const shirt = rows.find((p) => p.externalId === "SHIRT");
    expect(shirt).toMatchObject({
      title: "Trail Shirt — Red M",
      availability: "in_stock",
      currency: "USD",
    });
    expect(await tenants.b.scope.products.list()).toEqual(bBefore);
  });
});
