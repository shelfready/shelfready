import { and, eq, like } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { auditFindings, memberships, products, users } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { formatPrice } from "@/feeds/acp";

type AnyDb = ReturnType<typeof getDb> | TestDb;
type ProductRow = typeof products.$inferSelect;

export interface PageProduct {
  price: number | null; // major units as given on the page
  currency: string | null;
  availability: string | null; // normalized to our enum values
}

const SCHEMA_AVAILABILITY: Record<string, string> = {
  instock: "in_stock",
  outofstock: "out_of_stock",
  preorder: "pre_order",
  backorder: "backorder",
};

function normalizeAvailability(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.toLowerCase().replace(/^https?:\/\/schema\.org\//, "");
  return SCHEMA_AVAILABILITY[key] ?? null;
}

function findProductNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
    return obj;
  }
  if (obj["@graph"]) return findProductNode(obj["@graph"]);
  return null;
}

/**
 * Extracts price/currency/availability from a live product page's
 * schema.org/Product JSON-LD (the durable, markup-based truth AI
 * surfaces read — same signal we tell merchants to publish).
 */
export function extractProductFromPage(html: string): PageProduct | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const match of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const product = findProductNode(parsed);
    if (!product) continue;

    const offersRaw = product.offers;
    const offer = (
      Array.isArray(offersRaw) ? offersRaw[0] : offersRaw
    ) as Record<string, unknown> | undefined;
    const priceRaw = offer?.price;
    const price =
      typeof priceRaw === "number"
        ? priceRaw
        : typeof priceRaw === "string" && priceRaw.trim() !== ""
          ? Number(priceRaw)
          : null;
    return {
      price: price != null && Number.isFinite(price) ? price : null,
      currency:
        typeof offer?.priceCurrency === "string" ? offer.priceCurrency : null,
      availability: normalizeAvailability(offer?.availability),
    };
  }
  return null;
}

export interface DriftFinding {
  code: string;
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
}

export function compareDrift(
  product: ProductRow,
  page: PageProduct | null,
  fetchFailed = false,
): DriftFinding[] {
  if (fetchFailed) {
    return [
      {
        code: "drift_page_unreachable",
        severity: "error",
        field: "url",
        message: `Product page could not be fetched — agents will drop items whose pages fail`,
      },
    ];
  }
  if (!page) {
    return [
      {
        code: "drift_no_structured_data",
        severity: "info",
        field: "url",
        message:
          "No schema.org/Product JSON-LD on the live page — add the ShelfReady snippet for stronger discovery",
      },
    ];
  }

  const findings: DriftFinding[] = [];
  if (page.price != null && product.priceMinor != null && product.currency) {
    const feedPrice = Number(formatPrice(product.priceMinor, product.currency));
    if (feedPrice !== page.price) {
      findings.push({
        code: "drift_price",
        severity: "error",
        field: "price",
        message: `Feed price ${feedPrice} ${product.currency} but the live page shows ${page.price}${page.currency ? " " + page.currency : ""}`,
      });
    }
  }
  if (
    page.availability &&
    product.availability !== "unknown" &&
    page.availability !== product.availability
  ) {
    findings.push({
      code: "drift_availability",
      severity: "error",
      field: "availability",
      message: `Feed says ${product.availability} but the live page shows ${page.availability}`,
    });
  }
  return findings;
}

const FETCH_TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "ShelfReadyBot/1.0 (+https://useshelfready.com)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Freshness check for one merchant: fetch live pages for a sample of
 * products, compare against the catalog, snapshot drift_* findings,
 * record a drift feed_run, and email the owner a digest when something
 * drifted.
 */
export async function runDriftCheck(
  db: AnyDb,
  merchantId: string,
  options: { limit?: number; sendAlert?: boolean } = {},
): Promise<{ checked: number; drifted: number; findings: number }> {
  const scope = forMerchant(db, merchantId);
  const candidates = (await scope.products.list())
    .filter((p) => p.url)
    .slice(0, options.limit ?? 25);

  const [run] = await scope.feedRuns.insert([{ kind: "drift", status: "running" }]);

  const results: { product: ProductRow; findings: DriftFinding[] }[] = [];
  try {
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const batch = candidates.slice(i, i + CONCURRENCY);
      const settled = await Promise.all(
        batch.map(async (product) => {
          const html = await fetchPage(product.url!);
          const page = html ? extractProductFromPage(html) : null;
          return { product, findings: compareDrift(product, page, html === null) };
        }),
      );
      results.push(...settled);
    }

    // Snapshot semantics for drift findings only (audit owns the rest).
    await db
      .delete(auditFindings)
      .where(
        and(
          eq(auditFindings.merchantId, merchantId),
          like(auditFindings.code, "drift_%"),
        ),
      );

    const rows = results.flatMap(({ product, findings }) =>
      findings.map((f) => ({
        merchantId,
        productId: product.id,
        code: f.code,
        severity: f.severity,
        field: f.field,
        message: f.message,
        data: { itemId: product.externalId },
      })),
    );
    if (rows.length > 0) await db.insert(auditFindings).values(rows);

    const drifted = results.filter((r) =>
      r.findings.some((f) => f.code === "drift_price" || f.code === "drift_availability"),
    );

    if (drifted.length > 0 && options.sendAlert !== false) {
      await sendDriftDigest(db, merchantId, drifted).catch(() => undefined);
    }

    const stats = { checked: results.length, drifted: drifted.length, findings: rows.length };
    await scope.feedRuns.update(run.id, {
      status: "succeeded",
      stats,
      finishedAt: new Date(),
    });
    return stats;
  } catch (error) {
    await scope.feedRuns.update(run.id, {
      status: "failed",
      error: (error as Error).message,
      finishedAt: new Date(),
    });
    throw error;
  }
}

async function sendDriftDigest(
  db: AnyDb,
  merchantId: string,
  drifted: { product: ProductRow; findings: DriftFinding[] }[],
) {
  const { emailConfigured, sendEmail } = await import("@/lib/email");
  if (!emailConfigured()) return;

  const [owner] = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.merchantId, merchantId));
  if (!owner) return;

  const lines = drifted
    .slice(0, 20)
    .map(
      ({ product, findings }) =>
        `• ${product.externalId} (${product.title ?? "untitled"}): ${findings.map((f) => f.message).join("; ")}`,
    )
    .join("\n");

  await sendEmail({
    to: owner.email,
    subject: `ShelfReady: ${drifted.length} product${drifted.length === 1 ? "" : "s"} drifted from your live store`,
    text: `Your hosted feeds no longer match your live product pages:\n\n${lines}\n\nFix the source data or re-sync, then feeds regenerate automatically: https://staging.useshelfready.com/dashboard/audit`,
  });
}
