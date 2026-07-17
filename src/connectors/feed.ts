import { XMLParser } from "fast-xml-parser";
import { registerConnector } from "./registry";
import { stripHtml } from "./woocommerce";
import {
  guessMapping,
  normalizeAvailability,
  parsePriceToMinor,
  parseUpload,
  type CsvMapping,
} from "./csv";

/**
 * Generic feed-URL importer (#27). Pulls an existing product feed the
 * merchant already publishes — Google Shopping XML (RSS 2.0 or Atom) or
 * CSV/TSV — so custom carts work without a dedicated connector.
 * Credential-less: feed URLs are public or capability URLs.
 */

export interface FeedConfig {
  feedUrl: string;
  /** "auto" sniffs from content: leading "<" means XML. */
  format?: "auto" | "xml" | "csv";
  /** Applied when a price carries no currency (CSV, bare XML prices). */
  defaultCurrency?: string;
}

/** Refuse to buffer feeds beyond this size (protects the sync worker). */
const MAX_FEED_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 60_000;

export async function fetchFeedBody(config: FeedConfig): Promise<Buffer> {
  const url = new URL(config.feedUrl);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("feed URL must be HTTPS");
  }
  const res = await fetch(url, {
    headers: { Accept: "application/xml, text/csv, text/plain, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`feed fetch: HTTP ${res.status}`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_FEED_BYTES) throw new Error("feed exceeds 50MB limit");
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_FEED_BYTES) throw new Error("feed exceeds 50MB limit");
  if (body.length === 0) throw new Error("feed is empty");
  return body;
}

export function detectFormat(config: FeedConfig, body: Buffer): "xml" | "csv" {
  if (config.format && config.format !== "auto") return config.format;
  const head = body.toString("utf8", 0, 256).replace(/^﻿/, "").trimStart();
  return head.startsWith("<") ? "xml" : "csv";
}

// ---------------------------------------------------------------------------
// Google Shopping XML (RSS 2.0 `rss.channel.item` / Atom `feed.entry`)
// ---------------------------------------------------------------------------

type XmlItem = Record<string, unknown>;

function text(item: XmlItem, ...names: string[]): string | undefined {
  for (const name of names) {
    const raw = item[name];
    const value =
      raw != null && typeof raw === "object"
        ? ((raw as Record<string, unknown>)["#text"] ??
          // Atom <link href="..."/>
          (raw as Record<string, unknown>)["@_href"])
        : raw;
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

/** `"19.99 USD"` / `"USD 19.99"` / `"1.299,00"` → minor units + currency. */
export function parseFeedPrice(
  input: string | undefined,
  defaultCurrency: string | undefined,
): { priceMinor: number; currency: string } | undefined {
  if (!input) return undefined;
  const currencyMatch = input.match(/\b([A-Z]{3})\b/);
  const priceMinor = parsePriceToMinor(input.replace(/\b[A-Z]{3}\b/, ""));
  const currency = currencyMatch?.[1] ?? defaultCurrency;
  if (priceMinor == null || !currency) return undefined;
  return { priceMinor, currency };
}

interface FeedRow {
  id: string;
  groupId?: string;
  canonical: Record<string, unknown>;
  variant: Record<string, unknown>;
}

function mapXmlItem(
  item: XmlItem,
  defaultCurrency: string | undefined,
): FeedRow | undefined {
  const id = text(item, "g:id", "id", "guid");
  if (!id) return undefined;
  // Sale price wins when present, mirroring Google's serving behavior.
  const price =
    parseFeedPrice(text(item, "g:sale_price"), defaultCurrency) ??
    parseFeedPrice(text(item, "g:price"), defaultCurrency);
  const availability = normalizeAvailability(
    text(item, "g:availability")?.replace(/_/g, " "),
  );
  const gtin = text(item, "g:gtin");
  const mpn = text(item, "g:mpn");
  return {
    id,
    groupId: text(item, "g:item_group_id"),
    canonical: {
      externalId: id,
      title: text(item, "g:title", "title"),
      description: stripHtml(text(item, "g:description", "description", "summary")),
      brand: text(item, "g:brand"),
      url: text(item, "g:link", "link"),
      imageUrl: text(item, "g:image_link"),
      priceMinor: price?.priceMinor,
      currency: price?.currency,
      availability,
      gtin,
      mpn,
      attributes: compactAttributes({
        condition: text(item, "g:condition"),
        googleProductCategory: text(item, "g:google_product_category"),
      }),
    },
    variant: {
      externalId: id,
      sku: id,
      priceMinor: price?.priceMinor,
      currency: price?.currency,
      availability,
      gtin,
      mpn,
      color: text(item, "g:color"),
      size: text(item, "g:size"),
    },
  };
}

function compactAttributes(
  attrs: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) if (v) out[k] = v;
  return out;
}

export function parseXmlFeed(
  body: Buffer,
  defaultCurrency: string | undefined,
): unknown[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });
  const doc = parser.parse(body.toString("utf8")) as Record<string, unknown>;
  const rss = doc.rss as { channel?: { item?: XmlItem | XmlItem[] } } | undefined;
  const atom = doc.feed as { entry?: XmlItem | XmlItem[] } | undefined;
  const raw = rss?.channel?.item ?? atom?.entry;
  if (raw == null) {
    throw new Error("unrecognized XML feed (no rss.channel.item or feed.entry)");
  }
  const items = (Array.isArray(raw) ? raw : [raw])
    .map((item) => mapXmlItem(item, defaultCurrency))
    .filter((row): row is FeedRow => row != null);

  // item_group_id rows are variants of one product; standalone rows map 1:1.
  const groups = new Map<string, FeedRow[]>();
  const order: string[] = [];
  for (const row of items) {
    const key = row.groupId ?? `__solo__${row.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => {
    const rows = groups.get(key)!;
    const first = rows[0];
    if (rows.length === 1 && !first.groupId) return first.canonical;
    return {
      ...first.canonical,
      externalId: first.groupId ?? first.id,
      // The group is in stock if any member is.
      availability: rows.some((r) => r.canonical.availability === "in_stock")
        ? "in_stock"
        : first.canonical.availability,
      variants: rows.map((r) => r.variant),
    };
  });
}

// ---------------------------------------------------------------------------
// CSV feeds — reuse the upload parser + header auto-mapping
// ---------------------------------------------------------------------------

export async function parseCsvFeed(
  body: Buffer,
  defaultCurrency: string,
): Promise<unknown[]> {
  const { headers, rows } = await parseUpload("feed.csv", body);
  const mapping: CsvMapping = {
    columns: guessMapping(headers),
    defaultCurrency,
  };
  if (!mapping.columns.externalId || !mapping.columns.title) {
    throw new Error(
      `could not auto-map CSV feed headers (found: ${headers.join(", ") || "none"})`,
    );
  }
  const { rowToCanonical } = await import("./csv");
  return rows.map((row) => rowToCanonical(row, mapping));
}

export async function parseFeed(config: FeedConfig): Promise<unknown[]> {
  const body = await fetchFeedBody(config);
  const currency = config.defaultCurrency ?? "USD";
  return detectFormat(config, body) === "xml"
    ? parseXmlFeed(body, config.defaultCurrency)
    : parseCsvFeed(body, currency);
}

/** Fetch + parse, requiring at least one usable item — source-setup test. */
export async function testFeedConnection(
  config: FeedConfig,
): Promise<{ itemCount: number }> {
  const items = await parseFeed(config);
  if (items.length === 0) throw new Error("feed parsed but contains no items");
  return { itemCount: items.length };
}

registerConnector({
  type: "feed",
  capabilities: { pull: true, watchInventory: false },
  async *fetchProducts({ config }) {
    yield* await parseFeed(config as FeedConfig);
  },
});
