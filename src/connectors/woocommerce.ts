import { registerConnector } from "./registry";
import { parsePriceToMinor } from "./csv";

/**
 * WooCommerce REST (wc/v3) pull connector. Auth: consumer key/secret
 * (basic auth over HTTPS), stored encrypted (ADR-0003 / #9).
 */

export interface WooConfig {
  baseUrl: string;
  /** Fallback if wc/v3/data/currencies/current is unreachable. */
  currency?: string;
}

export interface WooCredentials {
  consumerKey: string;
  consumerSecret: string;
}

interface WooImage {
  src?: string;
}

interface WooAttribute {
  name?: string;
  option?: string;
  options?: string[];
}

interface WooProduct {
  id: number;
  name?: string;
  sku?: string;
  permalink?: string;
  description?: string;
  short_description?: string;
  price?: string;
  stock_status?: string;
  type?: string;
  images?: WooImage[];
  attributes?: WooAttribute[];
  global_unique_id?: string;
  brands?: { name?: string }[];
}

interface WooVariation {
  id: number;
  sku?: string;
  price?: string;
  stock_status?: string;
  image?: WooImage;
  attributes?: WooAttribute[];
  global_unique_id?: string;
}

const PER_PAGE = 100;

export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

export function mapStockStatus(status: string | undefined): string {
  switch (status) {
    case "instock":
      return "in_stock";
    case "outofstock":
      return "out_of_stock";
    case "onbackorder":
      return "backorder";
    default:
      return "unknown";
  }
}

function priceToMinor(price: string | undefined): number | undefined {
  if (!price) return undefined;
  return parsePriceToMinor(price) ?? undefined;
}

function attributeOption(
  attributes: WooAttribute[] | undefined,
  name: string,
): string | undefined {
  const attr = attributes?.find(
    (a) => a.name?.toLowerCase() === name.toLowerCase(),
  );
  return attr?.option ?? attr?.options?.[0];
}

export function mapWooProduct(
  product: WooProduct,
  variations: WooVariation[],
  currency: string,
): unknown {
  return {
    externalId: String(product.id),
    title: product.name,
    description:
      stripHtml(product.description) ?? stripHtml(product.short_description),
    brand: product.brands?.[0]?.name,
    url: product.permalink,
    imageUrl: product.images?.[0]?.src,
    priceMinor: priceToMinor(product.price),
    currency: priceToMinor(product.price) != null ? currency : undefined,
    availability: mapStockStatus(product.stock_status),
    gtin: product.global_unique_id || undefined,
    attributes: product.sku ? { sku: product.sku } : {},
    variants: variations.map((v) => ({
      externalId: String(v.id),
      sku: v.sku || undefined,
      priceMinor: priceToMinor(v.price),
      currency: priceToMinor(v.price) != null ? currency : undefined,
      availability: mapStockStatus(v.stock_status),
      gtin: v.global_unique_id || undefined,
      color: attributeOption(v.attributes, "color"),
      size: attributeOption(v.attributes, "size"),
    })),
  };
}

function authHeader(creds: WooCredentials): string {
  return `Basic ${Buffer.from(
    `${creds.consumerKey}:${creds.consumerSecret}`,
  ).toString("base64")}`;
}

async function wooGet(
  config: WooConfig,
  creds: WooCredentials,
  path: string,
): Promise<unknown> {
  const base = config.baseUrl.replace(/\/$/, "");
  const url = `${base}/wp-json/wc/v3/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(creds), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`woocommerce ${path}: HTTP ${res.status}`);
  }
  return res.json();
}

async function storeCurrency(
  config: WooConfig,
  creds: WooCredentials,
): Promise<string> {
  try {
    const current = (await wooGet(config, creds, "data/currencies/current")) as {
      code?: string;
    };
    if (current.code) return current.code;
  } catch {
    // fall through to config
  }
  return config.currency ?? "USD";
}

/** One lightweight authenticated call — used by the source-setup test. */
export async function testWooConnection(
  config: WooConfig,
  creds: WooCredentials,
): Promise<void> {
  await wooGet(config, creds, `products?per_page=1`);
}

export async function* fetchWooProducts(
  config: WooConfig,
  creds: WooCredentials,
): AsyncIterable<unknown> {
  const currency = await storeCurrency(config, creds);
  for (let page = 1; ; page++) {
    const products = (await wooGet(
      config,
      creds,
      `products?per_page=${PER_PAGE}&page=${page}&status=publish`,
    )) as WooProduct[];
    if (products.length === 0) break;

    for (const product of products) {
      const variations =
        product.type === "variable"
          ? ((await wooGet(
              config,
              creds,
              `products/${product.id}/variations?per_page=${PER_PAGE}`,
            )) as WooVariation[])
          : [];
      yield mapWooProduct(product, variations, currency);
    }
    if (products.length < PER_PAGE) break;
  }
}

registerConnector({
  type: "woocommerce",
  capabilities: { pull: true, watchInventory: true },
  async *fetchProducts({ config, credentials }) {
    if (!credentials) throw new Error("woocommerce source has no credentials");
    yield* fetchWooProducts(config as WooConfig, credentials as WooCredentials);
  },
});
