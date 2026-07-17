import { z } from "zod";
import { isValidGtin } from "@/lib/gtin";

/**
 * Canonical product model (ADR-0009) — an ACP-superset contract between
 * connectors and feeds/audit/enrichment. Constraints mirror the spec
 * snapshot in docs/ROADMAP.md §ACP; verify against live docs when feed
 * code changes.
 */

export const AVAILABILITY = [
  "in_stock",
  "out_of_stock",
  "pre_order",
  "backorder",
  "unknown",
] as const;

const CURRENCIES = new Set(Intl.supportedValuesOf("currency"));
const REGION_NAMES = new Intl.DisplayNames(["en"], {
  type: "region",
  fallback: "none",
});

export function isIsoCurrency(code: string): boolean {
  return CURRENCIES.has(code);
}

// ISO-3166 user-assigned/reserved alpha-2 ranges (AA, QM–QZ, XA–XZ, ZZ)
// have CLDR display names ("Unknown Region") but are not real countries.
const RESERVED_ALPHA2 = /^(AA|Q[M-Z]|X[A-Z]|ZZ)$/;

export function isIsoCountry(code: string): boolean {
  return (
    /^[A-Z]{2}$/.test(code) &&
    !RESERVED_ALPHA2.test(code) &&
    REGION_NAMES.of(code) !== undefined
  );
}

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), { message: "must be HTTPS" });

const gtinSchema = z
  .string()
  .refine(isValidGtin, { message: "invalid GTIN (length or GS1 checksum)" });

export const canonicalVariantSchema = z.object({
  externalId: z.string().min(1).max(100),
  sku: z.string().max(100).nullish(),
  title: z.string().max(150).nullish(),
  priceMinor: z.number().int().nonnegative().nullish(),
  currency: z
    .string()
    .refine(isIsoCurrency, { message: "not an ISO-4217 currency" })
    .nullish(),
  availability: z.enum(AVAILABILITY).default("unknown"),
  gtin: gtinSchema.nullish(),
  mpn: z.string().max(70).nullish(),
  color: z.string().max(100).nullish(),
  size: z.string().max(100).nullish(),
  sizeSystem: z.string().max(10).nullish(),
  gender: z.enum(["male", "female", "unisex"]).nullish(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export const canonicalProductSchema = z.object({
  // Stable per-source identity; feeds derive ACP item_id from it.
  externalId: z.string().min(1).max(100),
  title: z.string().min(1).max(150).nullish(),
  // ACP: plain text only. Strip HTML at the connector boundary.
  description: z.string().max(5000).nullish(),
  brand: z.string().max(70).nullish(),
  url: httpsUrl.nullish(),
  imageUrl: httpsUrl.nullish(),
  priceMinor: z.number().int().nonnegative().nullish(),
  currency: z
    .string()
    .refine(isIsoCurrency, { message: "not an ISO-4217 currency" })
    .nullish(),
  availability: z.enum(AVAILABILITY).default("unknown"),
  gtin: gtinSchema.nullish(),
  mpn: z.string().max(70).nullish(),
  variants: z.array(canonicalVariantSchema).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export type CanonicalProduct = z.infer<typeof canonicalProductSchema>;
export type CanonicalVariant = z.infer<typeof canonicalVariantSchema>;

/**
 * Structured validation result — the same shape audit_findings rows use,
 * so M3's audit engine and connector sync records consume it directly.
 */
export interface ValidationIssue {
  field: string;
  code: string;
  severity: "error" | "warning";
  message: string;
}

/** ACP-required fields a discovery feed cannot ship without. */
const REQUIRED_FOR_FEED: (keyof CanonicalProduct)[] = [
  "title",
  "description",
  "url",
  "imageUrl",
  "priceMinor",
  "currency",
];

/**
 * Validates raw connector output. Returns the parsed product (when shape
 * errors don't prevent parsing) plus field-addressed issues: zod schema
 * violations as errors, missing recommended/required-for-feed fields as
 * warnings (they gate feed eligibility, not ingest).
 */
export function validateProduct(input: unknown): {
  product: CanonicalProduct | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const parsed = canonicalProductSchema.safeParse(input);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        field: issue.path.join(".") || "(root)",
        code: `invalid_${String(issue.path[issue.path.length - 1] ?? "shape")}`,
        severity: "error",
        message: issue.message,
      });
    }
    return { product: null, issues };
  }

  const product = parsed.data;
  for (const field of REQUIRED_FOR_FEED) {
    if (product[field] == null) {
      issues.push({
        field,
        code: `missing_${String(field)}`,
        severity: "warning",
        message: `${String(field)} is required for AI-surface feeds`,
      });
    }
  }
  if (product.gtin == null) {
    issues.push({
      field: "gtin",
      code: "missing_gtin",
      severity: "warning",
      message:
        "GTIN missing — strongly recommended; the #1 discoverability signal",
    });
  }
  if (product.brand == null) {
    issues.push({
      field: "brand",
      code: "missing_brand",
      severity: "warning",
      message: "brand is required for AI-surface feeds",
    });
  }

  return { product, issues };
}
