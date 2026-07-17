import type { CatalogEntry } from "./expand";
import { formatPrice } from "./acp";
import { isValidGtin } from "@/lib/gtin";

/**
 * schema.org/Product JSON-LD per catalog entry — the on-page structured
 * data Google (and every AI surface reading pages) keys on. Structure
 * follows Google's Product rich-result requirements.
 */

const AVAILABILITY_MAP: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  pre_order: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
  // unknown: property omitted — schema.org has no unknown value
};

function gtinKey(gtin: string): "gtin8" | "gtin12" | "gtin13" | "gtin14" {
  return `gtin${gtin.length as 8 | 12 | 13 | 14}`;
}

export function buildProductJsonLd(entry: CatalogEntry): Record<string, unknown> {
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    itemCondition: "https://schema.org/NewCondition",
  };
  if (entry.url) offer.url = entry.url;
  if (entry.priceMinor != null && entry.currency) {
    offer.price = formatPrice(entry.priceMinor, entry.currency);
    offer.priceCurrency = entry.currency;
  }
  const availability = AVAILABILITY_MAP[entry.availability];
  if (availability) offer.availability = availability;

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    sku: entry.itemId,
    offers: offer,
  };
  if (entry.title) product.name = entry.title;
  if (entry.description) product.description = entry.description;
  if (entry.imageUrl) product.image = entry.imageUrl;
  if (entry.brand) product.brand = { "@type": "Brand", name: entry.brand };
  if (entry.gtin && isValidGtin(entry.gtin)) {
    product[gtinKey(entry.gtin)] = entry.gtin;
  }
  if (entry.mpn) product.mpn = entry.mpn;
  if (entry.color) product.color = entry.color;
  return product;
}

/**
 * Embeddable snippet. `<` is escaped to < inside the JSON so a
 * malicious description can never break out of the script tag.
 */
export function renderJsonLdSnippet(entry: CatalogEntry): string {
  const json = JSON.stringify(buildProductJsonLd(entry), null, 2).replace(
    /</g,
    "\\u003c",
  );
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
