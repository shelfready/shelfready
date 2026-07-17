import { registerConnector } from "./registry";
import { stripHtml } from "./woocommerce";

/**
 * Magento / Adobe Commerce REST pull connector (#26). Auth: integration
 * access token (Bearer), stored encrypted. Enabled products are paged via
 * searchCriteria; configurable products pull their children for variants.
 */

export interface MagentoConfig {
  /** Store base URL — REST lives at {baseUrl}/rest/V1. */
  baseUrl: string;
  /** Fallback if /rest/V1/directory/currency is unreachable. */
  currency?: string;
}

export interface MagentoCredentials {
  accessToken: string;
}

interface MagentoCustomAttribute {
  attribute_code?: string;
  value?: unknown;
}

interface MagentoStockItem {
  is_in_stock?: boolean;
  qty?: number;
  backorders?: number;
}

interface MagentoMediaEntry {
  file?: string;
  types?: string[];
  disabled?: boolean;
}

interface MagentoProduct {
  id?: number;
  sku?: string;
  name?: string;
  price?: number;
  status?: number; // 1 enabled, 2 disabled
  type_id?: string; // simple | configurable | virtual | …
  custom_attributes?: MagentoCustomAttribute[];
  extension_attributes?: { stock_item?: MagentoStockItem };
  media_gallery_entries?: MagentoMediaEntry[];
}

const PAGE_SIZE = 100;

function attr(product: MagentoProduct, code: string): string | undefined {
  const value = product.custom_attributes?.find(
    (a) => a.attribute_code === code,
  )?.value;
  if (value == null || value === "") return undefined;
  return String(value);
}

async function magentoGet(
  config: MagentoConfig,
  creds: MagentoCredentials,
  path: string,
): Promise<unknown> {
  const base = config.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/V1/${path}`, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`magento ${path.split("?")[0]}: HTTP ${res.status}`);
  return res.json();
}

export function mapMagentoAvailability(product: MagentoProduct): string {
  if (product.status === 2) return "out_of_stock";
  const stock = product.extension_attributes?.stock_item;
  if (!stock) return "unknown";
  if (stock.is_in_stock) return "in_stock";
  return (stock.backorders ?? 0) > 0 ? "backorder" : "out_of_stock";
}

/** special_price wins when set and lower than the regular price. */
export function magentoPriceMinor(
  product: MagentoProduct,
): number | undefined {
  const special = Number(attr(product, "special_price"));
  const regular = product.price;
  const price =
    Number.isFinite(special) && special > 0 && (regular == null || special < regular)
      ? special
      : regular;
  if (price == null || !Number.isFinite(price) || price < 0) return undefined;
  return Math.round(price * 100);
}

function productImage(
  product: MagentoProduct,
  baseUrl: string,
): string | undefined {
  const entries = product.media_gallery_entries?.filter((e) => !e.disabled);
  const entry =
    entries?.find((e) => e.types?.includes("image")) ?? entries?.[0];
  if (!entry?.file) return undefined;
  return `${baseUrl.replace(/\/$/, "")}/media/catalog/product${entry.file}`;
}

function productUrl(
  product: MagentoProduct,
  baseUrl: string,
): string | undefined {
  const key = attr(product, "url_key");
  if (!key) return undefined;
  return `${baseUrl.replace(/\/$/, "")}/${key}.html`;
}

export function mapMagentoProduct(
  product: MagentoProduct,
  children: MagentoProduct[],
  currency: string,
  baseUrl: string,
): unknown {
  // Configurables often carry price 0/null — fall back to a child's price.
  const priceMinor =
    magentoPriceMinor(product) ||
    children.map(magentoPriceMinor).find((p) => p != null) ||
    undefined;
  const availability =
    children.length > 0 &&
    children.some((c) => mapMagentoAvailability(c) === "in_stock")
      ? "in_stock"
      : mapMagentoAvailability(product);
  return {
    externalId: product.sku,
    title: product.name,
    description: stripHtml(attr(product, "description") ?? attr(product, "short_description")),
    brand: attr(product, "brand") ?? attr(product, "manufacturer"),
    url: productUrl(product, baseUrl),
    imageUrl: productImage(product, baseUrl),
    priceMinor,
    currency: priceMinor != null ? currency : undefined,
    availability,
    gtin: attr(product, "gtin") ?? attr(product, "ean") ?? attr(product, "upc"),
    mpn: attr(product, "mpn"),
    attributes: {},
    variants: children.map((child) => {
      const childPrice = magentoPriceMinor(child) ?? priceMinor;
      return {
        externalId: child.sku,
        sku: child.sku,
        priceMinor: childPrice,
        currency: childPrice != null ? currency : undefined,
        availability: mapMagentoAvailability(child),
        gtin: attr(child, "gtin") ?? attr(child, "ean") ?? attr(child, "upc"),
        mpn: attr(child, "mpn"),
        color: attr(child, "color"),
        size: attr(child, "size"),
      };
    }),
  };
}

async function storeCurrency(
  config: MagentoConfig,
  creds: MagentoCredentials,
): Promise<string> {
  try {
    const dir = (await magentoGet(config, creds, "directory/currency")) as {
      base_currency_code?: string;
    };
    if (dir.base_currency_code) return dir.base_currency_code;
  } catch {
    // fall through to config
  }
  return config.currency ?? "USD";
}

function searchCriteria(page: number): string {
  const params = new URLSearchParams({
    "searchCriteria[pageSize]": String(PAGE_SIZE),
    "searchCriteria[currentPage]": String(page),
    "searchCriteria[filter_groups][0][filters][0][field]": "status",
    "searchCriteria[filter_groups][0][filters][0][value]": "1",
    "searchCriteria[filter_groups][0][filters][0][condition_type]": "eq",
  });
  return params.toString();
}

/** One lightweight authenticated call — used by the source-setup test. */
export async function testMagentoConnection(
  config: MagentoConfig,
  creds: MagentoCredentials,
): Promise<void> {
  await magentoGet(config, creds, "products?searchCriteria[pageSize]=1");
}

export async function* fetchMagentoProducts(
  config: MagentoConfig,
  creds: MagentoCredentials,
): AsyncIterable<unknown> {
  const currency = await storeCurrency(config, creds);
  const seenChildSkus = new Set<string>();
  const queue: { product: MagentoProduct; children: MagentoProduct[] }[] = [];

  for (let page = 1; ; page++) {
    const { items = [] } = (await magentoGet(
      config,
      creds,
      `products?${searchCriteria(page)}`,
    )) as { items?: MagentoProduct[] };
    if (items.length === 0) break;

    for (const product of items) {
      if (!product.sku) continue;
      if (product.type_id === "configurable") {
        let children: MagentoProduct[] = [];
        try {
          children = (await magentoGet(
            config,
            creds,
            `configurable-products/${encodeURIComponent(product.sku)}/children`,
          )) as MagentoProduct[];
        } catch {
          // children endpoint can 404 on broken configurables — sync the parent alone
        }
        for (const child of children) if (child.sku) seenChildSkus.add(child.sku);
        queue.push({ product, children });
      } else {
        queue.push({ product, children: [] });
      }
    }
    if (items.length < PAGE_SIZE) break;
  }

  // Children also appear as top-level simples in /products — emit each SKU once.
  for (const { product, children } of queue) {
    if (children.length === 0 && seenChildSkus.has(product.sku!)) continue;
    yield mapMagentoProduct(product, children, currency, config.baseUrl);
  }
}

registerConnector({
  type: "magento",
  capabilities: { pull: true, watchInventory: true },
  async *fetchProducts({ config, credentials }) {
    if (!credentials) throw new Error("magento source has no credentials");
    yield* fetchMagentoProducts(
      config as MagentoConfig,
      credentials as MagentoCredentials,
    );
  },
});
