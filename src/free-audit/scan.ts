import { extractProductFromPage } from "@/freshness/drift";
import type { CatalogEntry } from "@/feeds/expand";
import { auditCatalog, type CatalogAudit } from "@/audit/rules";

/**
 * Free instant agent-readiness audit (issue #24, the acquisition hook):
 * unauthenticated scan of a store URL — discover a sample of product
 * pages, extract their schema.org/Product data, score with the same
 * rules engine paying merchants get. Nothing is persisted.
 */

const PAGE_CAP = 10;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_500_000;
const CONCURRENCY = 4;
const UA = { "User-Agent": "ShelfReadyBot/1.0 (+https://useshelfready.com)" };

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: UA,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
  } catch {
    return null;
  }
}

const PRODUCT_URL_HINT = /\/(product|products|item|p|shop|artikel|produkt)[/-]/i;

/** Candidate product-page URLs from the sitemap and on-page links —
 * same-origin only (SSRF guard: we never leave the submitted host). */
export async function discoverProductUrls(storeUrl: string): Promise<string[]> {
  const origin = new URL(storeUrl).origin;
  const seen = new Set<string>();
  const candidates: string[] = [];

  const add = (raw: string) => {
    try {
      const url = new URL(raw, origin);
      if (url.origin !== origin) return;
      url.hash = "";
      const href = url.href;
      if (seen.has(href)) return;
      seen.add(href);
      if (PRODUCT_URL_HINT.test(url.pathname)) candidates.push(href);
    } catch {
      /* ignore bad URLs */
    }
  };

  const sitemap = await fetchText(`${origin}/sitemap.xml`);
  if (sitemap) {
    for (const m of sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      // Follow one level of sitemap index for product sitemaps.
      if (/sitemap[^<]*\.xml/i.test(m[1]) && /product/i.test(m[1]) && candidates.length === 0) {
        const child = await fetchText(m[1].trim());
        if (child) {
          for (const c of child.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) add(c[1].trim());
        }
      } else {
        add(m[1].trim());
      }
      if (candidates.length >= PAGE_CAP * 3) break;
    }
  }

  if (candidates.length < PAGE_CAP) {
    const home = await fetchText(storeUrl);
    if (home) {
      for (const m of home.matchAll(/href=["']([^"'#]+)["']/gi)) {
        add(m[1]);
        if (candidates.length >= PAGE_CAP * 3) break;
      }
    }
  }
  return candidates.slice(0, PAGE_CAP);
}

export interface FreeAuditResult {
  storeUrl: string;
  pagesScanned: number;
  productsFound: number;
  score: number;
  grade: CatalogAudit["grade"];
  eligible: number;
  topIssues: { code: string; message: string; count: number }[];
  noStructuredData: boolean;
}

export async function runFreeAudit(storeUrl: string): Promise<FreeAuditResult> {
  const urls = await discoverProductUrls(storeUrl);

  const entries: CatalogEntry[] = [];
  let pagesScanned = 0;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (url): Promise<CatalogEntry | null> => {
        const html = await fetchText(url);
        if (!html) return null;
        pagesScanned++;
        const page = extractProductFromPage(html);
        if (!page) return null;
        const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
        return {
          itemId: url,
          groupId: url,
          title,
          description: null, // page-level description quality is not derivable safely
          brand: null,
          url,
          imageUrl: null,
          priceMinor: page.price != null ? Math.round(page.price * 100) : null,
          currency: page.currency,
          availability: page.availability ?? "unknown",
          gtin: null,
          mpn: null,
          color: null,
          size: null,
          sizeSystem: null,
          gender: null,
        } satisfies CatalogEntry;
      }),
    );
    entries.push(...settled.filter((e): e is CatalogEntry => e !== null));
  }

  // Score with generous seller settings so only product-level issues count
  // in the teaser (full audits get the real seller checks after sign-up).
  const audit = auditCatalog(entries, {
    sellerName: "•",
    sellerUrl: "https://placeholder.example",
    storeCountry: "US",
  });

  const byCode = new Map<string, { message: string; count: number }>();
  for (const item of audit.items) {
    for (const f of item.findings) {
      const agg = byCode.get(f.code) ?? { message: f.message, count: 0 };
      agg.count++;
      byCode.set(f.code, agg);
    }
  }
  const topIssues = [...byCode.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([code, { message, count }]) => ({ code, message, count }));

  return {
    storeUrl,
    pagesScanned,
    productsFound: entries.length,
    score: audit.catalogScore,
    grade: audit.grade,
    eligible: audit.items.filter((i) => i.findings.every((f) => f.severity !== "error")).length,
    topIssues,
    noStructuredData: pagesScanned > 0 && entries.length === 0,
  };
}
