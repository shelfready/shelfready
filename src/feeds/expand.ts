import type { products, variants } from "@/db/schema";

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

/**
 * One sellable item per feed row: simple products emit themselves;
 * variable products emit one entry per variant sharing group_id, with
 * variant fields inheriting product-level content where absent.
 * Shared by every surface renderer (ACP, GMC, JSON-LD).
 */
export interface CatalogEntry {
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
  color: string | null;
  size: string | null;
  sizeSystem: string | null;
  gender: string | null;
}

export function expandCatalog(
  rows: ProductRow[],
  variantRows: VariantRow[],
): CatalogEntry[] {
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const entries: CatalogEntry[] = [];
  for (const p of rows) {
    const vs = variantsByProduct.get(p.id) ?? [];
    if (vs.length === 0) {
      entries.push({
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
        color: null,
        size: null,
        sizeSystem: null,
        gender: null,
      });
      continue;
    }
    for (const v of vs) {
      entries.push({
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
      });
    }
  }
  return entries;
}
