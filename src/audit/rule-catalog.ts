/**
 * UI metadata for every per-SKU audit rule in rules.ts — label/category for
 * the dashboard table, fixHint for the detail rail. Keep in sync with RULES
 * (rule-catalog.test.ts guards the code list).
 */
export interface RuleMeta {
  code: string;
  label: string;
  category: string;
  field: string;
  severity: "error" | "warning" | "info";
  weight: number;
  fixHint: string;
}

export const RULE_CATALOG: RuleMeta[] = [
  {
    code: "gtin_missing",
    label: "GTIN present",
    category: "Identifiers",
    field: "gtin",
    severity: "warning",
    weight: 18,
    fixHint:
      "Add the barcode (EAN/UPC/ISBN) from your supplier or packaging. GTINs are the #1 signal AI surfaces use to match your product to known catalog data.",
  },
  {
    code: "gtin_invalid",
    label: "GTIN valid",
    category: "Identifiers",
    field: "gtin",
    severity: "error",
    weight: 22,
    fixHint:
      "The GTIN fails GS1 length/checksum validation — usually a typo or an internal SKU pasted into the barcode field. Correct it or clear it; an invalid GTIN is worse than none.",
  },
  {
    code: "title_missing",
    label: "Title present",
    category: "Content",
    field: "title",
    severity: "error",
    weight: 15,
    fixHint: "Every item needs a human-readable title — agents can't list what they can't name.",
  },
  {
    code: "title_overlong",
    label: "Title length",
    category: "Content",
    field: "title",
    severity: "error",
    weight: 8,
    fixHint:
      "Keep titles ≤150 characters: brand + product + key attribute. Overlong titles get truncated on agent surfaces.",
  },
  {
    code: "description_missing",
    label: "Description present",
    category: "Content",
    field: "description",
    severity: "error",
    weight: 12,
    fixHint:
      "Add a factual description covering material, dimensions, and use. Agents quote descriptions when recommending products.",
  },
  {
    code: "description_thin",
    label: "Description depth",
    category: "Content",
    field: "description",
    severity: "info",
    weight: 6,
    fixHint:
      "Descriptions under ~50 characters give agents nothing to verify. Expand with concrete facts — enrichment can draft this for you.",
  },
  {
    code: "brand_missing",
    label: "Brand present",
    category: "Identifiers",
    field: "brand",
    severity: "warning",
    weight: 10,
    fixHint:
      "Set the brand (use your store name for own-label goods). Brand + GTIN is how agents deduplicate offers across sellers.",
  },
  {
    code: "url_missing",
    label: "Product URL present",
    category: "Links",
    field: "url",
    severity: "error",
    weight: 15,
    fixHint:
      "Each item needs a canonical product-page URL — it's where agents send buyers, and what freshness monitoring checks.",
  },
  {
    code: "url_not_https",
    label: "Product URL HTTPS",
    category: "Links",
    field: "url",
    severity: "error",
    weight: 8,
    fixHint: "Serve product pages over HTTPS; agents refuse plain-HTTP destinations.",
  },
  {
    code: "image_missing",
    label: "Image present",
    category: "Media",
    field: "imageUrl",
    severity: "error",
    weight: 12,
    fixHint: "Add at least one product image URL — image-less items are skipped by most surfaces.",
  },
  {
    code: "price_missing",
    label: "Price present",
    category: "Offer",
    field: "price",
    severity: "error",
    weight: 15,
    fixHint:
      "Set a price with currency. Items without a price are ineligible on every shopping surface.",
  },
  {
    code: "availability_unknown",
    label: "Availability known",
    category: "Offer",
    field: "availability",
    severity: "warning",
    weight: 10,
    fixHint:
      "Map your stock status to in_stock / out_of_stock / pre_order / backorder — \"unknown\" items are treated as unavailable.",
  },
];

export const RULE_META_BY_CODE = new Map(RULE_CATALOG.map((r) => [r.code, r]));
