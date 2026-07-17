import type { products, variants } from "@/db/schema";
import { isIsoCountry, isIsoCurrency } from "@/model/product";
import { isValidGtin } from "@/lib/gtin";

/**
 * OpenAI ACP feed renderer (ROADMAP §ACP, API version 2025-09-12).
 * Discovery-only per ADR-0001: is_eligible_checkout is always false and
 * checkout-only fields are omitted. Items that fail feed requirements
 * are emitted with is_eligible_search=false — surfaced, never dropped.
 */

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

export interface SellerSettings {
  sellerName?: string;
  sellerUrl?: string;
  storeCountry?: string;
}

export interface AcpItem {
  is_eligible_search: boolean;
  is_eligible_checkout: false;
  item_id: string;
  title: string;
  description: string;
  url: string;
  brand: string;
  image_url: string;
  price: string;
  currency: string;
  availability: string;
  seller_name: string;
  seller_url: string;
  store_country: string;
  gtin: string;
  mpn: string;
  group_id: string;
  color: string;
  size: string;
  size_system: string;
  gender: string;
}

export const ACP_COLUMNS: (keyof AcpItem)[] = [
  "is_eligible_search",
  "is_eligible_checkout",
  "item_id",
  "title",
  "description",
  "url",
  "brand",
  "image_url",
  "price",
  "currency",
  "availability",
  "seller_name",
  "seller_url",
  "store_country",
  "gtin",
  "mpn",
  "group_id",
  "color",
  "size",
  "size_system",
  "gender",
];

/** Currency minor-unit exponent from the runtime's own tables. */
export function currencyExponent(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency })
        .resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function formatPrice(priceMinor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  return (priceMinor / 100).toFixed(exponent);
}

interface ItemSource {
  itemId: string;
  groupId: string;
  title: string | null;
  description: string | null;
  brand: string | null;
  url: string | null;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: string | null;
  availability: string;
  gtin: string | null;
  mpn: string | null;
  color?: string | null;
  size?: string | null;
  sizeSystem?: string | null;
  gender?: string | null;
}

function toItem(src: ItemSource, seller: SellerSettings): AcpItem {
  const requiredPresent =
    !!src.title &&
    src.title.length <= 150 &&
    !!src.description &&
    !!src.url &&
    !!src.imageUrl &&
    src.priceMinor != null &&
    !!src.currency &&
    isIsoCurrency(src.currency) &&
    src.availability !== "unknown" &&
    !!seller.sellerName &&
    !!seller.sellerUrl &&
    !!seller.storeCountry &&
    isIsoCountry(seller.storeCountry);

  return {
    is_eligible_search: requiredPresent,
    is_eligible_checkout: false,
    item_id: src.itemId.slice(0, 100),
    title: src.title ?? "",
    description: (src.description ?? "").slice(0, 5000),
    url: src.url ?? "",
    brand: src.brand ?? "",
    image_url: src.imageUrl ?? "",
    price:
      src.priceMinor != null && src.currency
        ? formatPrice(src.priceMinor, src.currency)
        : "",
    currency: src.currency ?? "",
    availability: src.availability,
    seller_name: seller.sellerName ?? "",
    seller_url: seller.sellerUrl ?? "",
    store_country: seller.storeCountry ?? "",
    gtin: src.gtin && isValidGtin(src.gtin) ? src.gtin : "",
    mpn: src.mpn ?? "",
    group_id: src.groupId,
    color: src.color ?? "",
    size: src.size ?? "",
    size_system: src.sizeSystem ?? "",
    gender: src.gender ?? "",
  };
}

/**
 * Products + their variants → ACP items. Simple products emit one row;
 * variable products emit one row per variant sharing group_id (variant
 * fields inherit product-level content where the variant lacks its own).
 */
export function buildAcpItems(
  rows: ProductRow[],
  variantRows: VariantRow[],
  seller: SellerSettings,
): AcpItem[] {
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const items: AcpItem[] = [];
  for (const p of rows) {
    const vs = variantsByProduct.get(p.id) ?? [];
    if (vs.length === 0) {
      items.push(
        toItem(
          {
            itemId: p.externalId,
            groupId: p.externalId,
            title: p.title,
            description: p.description,
            brand: p.brand,
            url: p.url,
            imageUrl: p.imageUrl,
            priceMinor: p.priceMinor,
            currency: p.currency,
            availability: p.availability,
            gtin: p.gtin,
            mpn: p.mpn,
          },
          seller,
        ),
      );
      continue;
    }
    for (const v of vs) {
      items.push(
        toItem(
          {
            itemId: v.externalId,
            groupId: p.externalId,
            title: v.title ?? p.title,
            description: p.description,
            brand: p.brand,
            url: p.url,
            imageUrl: p.imageUrl,
            priceMinor: v.priceMinor ?? p.priceMinor,
            currency: v.currency ?? p.currency,
            availability: v.availability,
            gtin: v.gtin,
            mpn: v.mpn ?? p.mpn,
            color: v.color,
            size: v.size,
            sizeSystem: v.sizeSystem,
            gender: v.gender,
          },
          seller,
        ),
      );
    }
  }
  return items;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function renderAcpCsv(items: AcpItem[]): string {
  const header = ACP_COLUMNS.join(",");
  const lines = items.map((item) =>
    ACP_COLUMNS.map((col) => csvEscape(String(item[col]))).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

export function renderAcpJson(items: AcpItem[]): string {
  return JSON.stringify({ items }, null, 2) + "\n";
}
