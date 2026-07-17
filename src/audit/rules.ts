import type { CatalogEntry } from "@/feeds/expand";
import type { SellerSettings } from "@/feeds/acp";
import { isValidGtin } from "@/lib/gtin";

/**
 * Agent-readiness audit rules (issue #17). Pure functions over catalog
 * entries — persistence and scheduling live in run.ts. Severity model:
 * error = blocks feed eligibility (spec violation / required missing),
 * warning = hurts discoverability (recommended missing/invalid),
 * info = quality improvement.
 */

export interface AuditFinding {
  code: string;
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  /** Score deduction weight (per SKU, 0-100 scale). */
  weight: number;
}

type Rule = (entry: CatalogEntry) => AuditFinding | null;

const RULES: Rule[] = [
  (e) =>
    e.gtin == null
      ? {
          code: "gtin_missing",
          severity: "warning",
          field: "gtin",
          message:
            "No GTIN — the #1 discoverability signal for AI shopping surfaces",
          weight: 18,
        }
      : null,
  (e) =>
    e.gtin != null && !isValidGtin(e.gtin)
      ? {
          code: "gtin_invalid",
          severity: "error",
          field: "gtin",
          message: `GTIN "${e.gtin}" fails length/GS1-checksum validation`,
          weight: 22,
        }
      : null,
  (e) =>
    !e.title
      ? {
          code: "title_missing",
          severity: "error",
          field: "title",
          message: "Title is required on every surface",
          weight: 15,
        }
      : null,
  (e) =>
    e.title && e.title.length > 150
      ? {
          code: "title_overlong",
          severity: "error",
          field: "title",
          message: `Title is ${e.title.length} chars (ACP cap: 150)`,
          weight: 8,
        }
      : null,
  (e) =>
    !e.description
      ? {
          code: "description_missing",
          severity: "error",
          field: "description",
          message: "Description is required for feed eligibility",
          weight: 12,
        }
      : null,
  (e) =>
    e.description && e.description.length < 80
      ? {
          code: "description_thin",
          severity: "info",
          field: "description",
          message: `Description is only ${e.description.length} chars — agents rank rich descriptions higher`,
          weight: 6,
        }
      : null,
  (e) =>
    !e.brand
      ? {
          code: "brand_missing",
          severity: "warning",
          field: "brand",
          message: "Brand is required by ACP and GMC",
          weight: 10,
        }
      : null,
  (e) =>
    !e.url
      ? {
          code: "url_missing",
          severity: "error",
          field: "url",
          message: "Product URL is required — agents send buyers to it",
          weight: 15,
        }
      : null,
  (e) =>
    e.url && !e.url.startsWith("https://")
      ? {
          code: "url_not_https",
          severity: "error",
          field: "url",
          message: "Product URL must be HTTPS",
          weight: 8,
        }
      : null,
  (e) =>
    !e.imageUrl
      ? {
          code: "image_missing",
          severity: "error",
          field: "imageUrl",
          message: "Image URL is required on every surface",
          weight: 12,
        }
      : null,
  (e) =>
    e.priceMinor == null
      ? {
          code: "price_missing",
          severity: "error",
          field: "price",
          message: "Price is required on every surface",
          weight: 15,
        }
      : null,
  (e) =>
    e.availability === "unknown"
      ? {
          code: "availability_unknown",
          severity: "warning",
          field: "availability",
          message:
            "Availability unknown — agents skip items they can't promise",
          weight: 10,
        }
      : null,
];

export const SELLER_RULES: ((s: SellerSettings) => AuditFinding | null)[] = [
  (s) =>
    !s.sellerName || !s.sellerUrl || !s.storeCountry
      ? {
          code: "seller_settings_missing",
          severity: "error",
          field: "settings",
          message:
            "Seller name, URL, and store country are required on every feed item — set them in Settings",
          weight: 0, // catalog-level; applied as a catalog penalty
        }
      : null,
];

export function auditEntry(entry: CatalogEntry): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const rule of RULES) {
    const finding = rule(entry);
    if (finding) findings.push(finding);
  }
  return findings;
}

export function skuScore(findings: AuditFinding[]): number {
  const deduction = findings.reduce((sum, f) => sum + f.weight, 0);
  return Math.max(0, 100 - deduction);
}

export function grade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export interface CatalogAudit {
  items: { entry: CatalogEntry; findings: AuditFinding[]; score: number }[];
  catalogFindings: AuditFinding[];
  catalogScore: number;
  grade: ReturnType<typeof grade>;
}

export function auditCatalog(
  entries: CatalogEntry[],
  seller: SellerSettings,
): CatalogAudit {
  const items = entries.map((entry) => {
    const findings = auditEntry(entry);
    return { entry, findings, score: skuScore(findings) };
  });

  const catalogFindings = SELLER_RULES.map((r) => r(seller)).filter(
    (f): f is AuditFinding => f !== null,
  );

  let catalogScore =
    items.length === 0
      ? 0
      : Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);
  // Catalog-level blockers cap the score: nothing ships without them.
  if (catalogFindings.some((f) => f.severity === "error")) {
    catalogScore = Math.min(catalogScore, 40);
  }

  return { items, catalogFindings, catalogScore, grade: grade(catalogScore) };
}
