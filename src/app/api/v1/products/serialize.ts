import type { products, variants } from "@/db/schema";

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

/**
 * Project DB rows onto the documented API shape (OpenAPI `Product`) —
 * serializing raw Drizzle rows would silently publish every future
 * internal column as API surface.
 */
export function toApiVariant(v: VariantRow) {
  return {
    id: v.id,
    externalId: v.externalId,
    sku: v.sku,
    title: v.title,
    priceMinor: v.priceMinor,
    currency: v.currency,
    availability: v.availability,
    gtin: v.gtin,
    mpn: v.mpn,
    color: v.color,
    size: v.size,
    sizeSystem: v.sizeSystem,
    gender: v.gender,
  };
}

export function toApiProduct(p: ProductRow, productVariants: VariantRow[]) {
  return {
    id: p.id,
    externalId: p.externalId,
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
    variants: productVariants.map(toApiVariant),
  };
}
