import { registerConnector } from "./registry";
import { stripHtml } from "./woocommerce";

/**
 * BigCommerce Catalog V3 pull connector (#25). Auth: store hash (config)
 * + store-level API account access token (encrypted, X-Auth-Token).
 * Variants and images arrive inline via ?include=, so sync is one
 * request per page — no per-product fan-out.
 */

export interface BigCommerceConfig {
  storeHash: string;
  /** Storefront base for product URLs (custom_url is path-only). */
  storefrontUrl?: string;
  /** Fallback if /v2/currencies is unreachable. */
  currency?: string;
}

export interface BigCommerceCredentials {
  accessToken: string;
}

interface BcImage {
  url_standard?: string;
  is_thumbnail?: boolean;
}

interface BcOptionValue {
  option_display_name?: string;
  label?: string;
}

interface BcVariant {
  id: number;
  sku?: string;
  price?: number | null;
  sale_price?: number | null;
  calculated_price?: number;
  inventory_level?: number;
  purchasing_disabled?: boolean;
  upc?: string;
  ean?: string;
  gtin?: string;
  mpn?: string;
  option_values?: BcOptionValue[];
  image_url?: string;
}

interface BcProduct {
  id: number;
  name?: string;
  sku?: string;
  description?: string;
  price?: number;
  sale_price?: number;
  calculated_price?: number;
  brand_id?: number;
  is_visible?: boolean;
  availability?: string; // available | disabled | preorder
  inventory_tracking?: string; // none | product | variant
  inventory_level?: number;
  custom_url?: { url?: string };
  images?: BcImage[];
  variants?: BcVariant[];
  upc?: string;
  gtin?: string;
  mpn?: string;
}

const PAGE_LIMIT = 250;

async function bcGet(
  config: BigCommerceConfig,
  creds: BigCommerceCredentials,
  path: string,
): Promise<unknown> {
  const url = `https://api.bigcommerce.com/stores/${config.storeHash}/${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": creds.accessToken,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`bigcommerce ${path}: HTTP ${res.status}`);
  return res.json();
}

/** available/disabled/preorder × inventory levels → ACP availability. */
export function mapBcAvailability(
  product: Pick<BcProduct, "availability" | "inventory_tracking" | "inventory_level">,
  variant?: Pick<BcVariant, "inventory_level" | "purchasing_disabled">,
): string {
  if (product.availability === "disabled" || variant?.purchasing_disabled) {
    return "out_of_stock";
  }
  if (product.availability === "preorder") return "pre_order";
  const tracking = product.inventory_tracking ?? "none";
  if (tracking === "variant" && variant) {
    return (variant.inventory_level ?? 0) > 0 ? "in_stock" : "out_of_stock";
  }
  if (tracking === "product") {
    return (product.inventory_level ?? 0) > 0 ? "in_stock" : "out_of_stock";
  }
  return "in_stock";
}

/** BigCommerce prices are decimal major units; sale price wins when set. */
export function bcPriceMinor(
  regular: number | null | undefined,
  sale: number | null | undefined,
  calculated?: number,
): number | undefined {
  const price =
    sale != null && sale > 0 ? sale : (calculated ?? regular ?? undefined);
  if (price == null || !Number.isFinite(price) || price < 0) return undefined;
  return Math.round(price * 100);
}

function optionValue(
  values: BcOptionValue[] | undefined,
  name: string,
): string | undefined {
  return values?.find(
    (v) => v.option_display_name?.toLowerCase() === name.toLowerCase(),
  )?.label;
}

export function mapBcProduct(
  product: BcProduct,
  brandName: string | undefined,
  currency: string,
  storefrontUrl: string | undefined,
): unknown {
  const priceMinor = bcPriceMinor(
    product.price,
    product.sale_price,
    product.calculated_price,
  );
  const image =
    product.images?.find((i) => i.is_thumbnail) ?? product.images?.[0];
  const path = product.custom_url?.url;
  // A single auto-generated variant means a simple product in BigCommerce.
  const variants =
    (product.variants?.length ?? 0) > 1 ? product.variants! : [];
  return {
    externalId: String(product.id),
    title: product.name,
    description: stripHtml(product.description),
    brand: brandName,
    url:
      storefrontUrl && path
        ? `${storefrontUrl.replace(/\/$/, "")}${path}`
        : undefined,
    imageUrl: image?.url_standard,
    priceMinor,
    currency: priceMinor != null ? currency : undefined,
    availability: mapBcAvailability(product),
    gtin: product.gtin || product.upc || undefined,
    mpn: product.mpn || undefined,
    attributes: product.sku ? { sku: product.sku } : {},
    variants: variants.map((v) => {
      const vPrice = bcPriceMinor(v.price, v.sale_price, v.calculated_price);
      return {
        externalId: String(v.id),
        sku: v.sku || undefined,
        priceMinor: vPrice ?? priceMinor,
        currency: (vPrice ?? priceMinor) != null ? currency : undefined,
        availability: mapBcAvailability(product, v),
        gtin: v.gtin || v.upc || v.ean || undefined,
        mpn: v.mpn || undefined,
        color: optionValue(v.option_values, "color"),
        size: optionValue(v.option_values, "size"),
      };
    }),
  };
}

async function storeCurrency(
  config: BigCommerceConfig,
  creds: BigCommerceCredentials,
): Promise<string> {
  try {
    const currencies = (await bcGet(config, creds, "v2/currencies")) as {
      currency_code?: string;
      is_default?: boolean;
    }[];
    const def = currencies.find((c) => c.is_default) ?? currencies[0];
    if (def?.currency_code) return def.currency_code;
  } catch {
    // fall through to config
  }
  return config.currency ?? "USD";
}

/** One lightweight authenticated call — used by the source-setup test. */
export async function testBigCommerceConnection(
  config: BigCommerceConfig,
  creds: BigCommerceCredentials,
): Promise<void> {
  await bcGet(config, creds, "v3/catalog/products?limit=1");
}

export async function* fetchBigCommerceProducts(
  config: BigCommerceConfig,
  creds: BigCommerceCredentials,
): AsyncIterable<unknown> {
  const currency = await storeCurrency(config, creds);
  const brands = new Map<number, string>();

  async function brandName(id: number | undefined): Promise<string | undefined> {
    if (!id) return undefined;
    if (!brands.has(id)) {
      try {
        const { data } = (await bcGet(config, creds, `v3/catalog/brands/${id}`)) as {
          data?: { name?: string };
        };
        brands.set(id, data?.name ?? "");
      } catch {
        brands.set(id, "");
      }
    }
    return brands.get(id) || undefined;
  }

  for (let page = 1; ; page++) {
    const { data } = (await bcGet(
      config,
      creds,
      `v3/catalog/products?include=variants,images&limit=${PAGE_LIMIT}&page=${page}&is_visible=true`,
    )) as { data?: BcProduct[] };
    const products = data ?? [];
    if (products.length === 0) break;

    for (const product of products) {
      yield mapBcProduct(
        product,
        await brandName(product.brand_id),
        currency,
        config.storefrontUrl,
      );
    }
    if (products.length < PAGE_LIMIT) break;
  }
}

registerConnector({
  type: "bigcommerce",
  capabilities: { pull: true, watchInventory: true },
  async *fetchProducts({ config, credentials }) {
    if (!credentials) throw new Error("bigcommerce source has no credentials");
    yield* fetchBigCommerceProducts(
      config as BigCommerceConfig,
      credentials as BigCommerceCredentials,
    );
  },
});
