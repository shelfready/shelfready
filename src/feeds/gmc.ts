import type { CatalogEntry } from "./expand";
import { formatPrice } from "./acp";
import { isValidGtin } from "@/lib/gtin";

/**
 * Google Merchant Center classic TSV feed. Attribute names per the GMC
 * product data specification (verify live docs when this changes —
 * ROADMAP §ACP note applies to Google too).
 */

export const GMC_COLUMNS = [
  "id",
  "item_group_id",
  "title",
  "description",
  "link",
  "image_link",
  "price",
  "availability",
  "brand",
  "gtin",
  "mpn",
  "condition",
  "color",
  "size",
  "gender",
] as const;

const AVAILABILITY_MAP: Record<string, string> = {
  in_stock: "in stock",
  out_of_stock: "out of stock",
  pre_order: "preorder",
  backorder: "backorder",
  // GMC has no "unknown" — safest truthful value is out of stock.
  unknown: "out of stock",
};

/** GMC TSV has no quoting — control characters collapse to spaces. */
function tsvSanitize(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

export function buildGmcRows(entries: CatalogEntry[]): Record<string, string>[] {
  return entries.map((e) => ({
    id: e.itemId,
    item_group_id: e.groupId === e.itemId ? "" : e.groupId,
    title: e.title ?? "",
    description: e.description ?? "",
    link: e.url ?? "",
    image_link: e.imageUrl ?? "",
    price:
      e.priceMinor != null && e.currency
        ? `${formatPrice(e.priceMinor, e.currency)} ${e.currency}`
        : "",
    availability: AVAILABILITY_MAP[e.availability] ?? "out of stock",
    brand: e.brand ?? "",
    gtin: e.gtin && isValidGtin(e.gtin) ? e.gtin : "",
    mpn: e.mpn ?? "",
    condition: "new",
    color: e.color ?? "",
    size: e.size ?? "",
    gender: e.gender ?? "",
  }));
}

export function renderGmcTsv(entries: CatalogEntry[]): string {
  const rows = buildGmcRows(entries);
  const header = GMC_COLUMNS.join("\t");
  const lines = rows.map((row) =>
    GMC_COLUMNS.map((col) => tsvSanitize(row[col] ?? "")).join("\t"),
  );
  return [header, ...lines].join("\n") + "\n";
}
