import type { Metadata } from "next";
import { PageShell, PageHero } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Changelog",
  description: "New features, improvements, and fixes shipped to ShelfReady.",
};

// Mirrors the real release history: github.com/shelfready/shelfready/releases
const entries = [
  {
    version: "v0.7.0",
    date: "July 17, 2026",
    tag: "New",
    title: "Public API, docs, and webhooks",
    points: [
      "REST API at /api/v1 with scoped merchant keys: catalog push, sync triggers, feed URLs, audit results.",
      "OpenAPI 3.1 spec and hosted API reference at /docs.",
      "Outbound webhooks (sync.completed, feeds.rendered, audit.completed) with HMAC-SHA256 signatures and automatic retries.",
    ],
  },
  {
    version: "v0.6.0",
    date: "July 17, 2026",
    tag: "New",
    title: "BigCommerce, Magento, and feed-URL import",
    points: [
      "BigCommerce connector (Catalog V3) and Magento / Adobe Commerce connector (REST), both with encrypted read-only credentials.",
      "Generic feed-URL importer: point ShelfReady at an existing Google Shopping XML or CSV feed — works with any cart.",
    ],
  },
  {
    version: "v0.5.0",
    date: "July 17, 2026",
    tag: "New",
    title: "AI enrichment and freshness monitoring",
    points: [
      "Claude-drafted titles, descriptions, and attributes with a human approve/reject workflow — nothing changes without your sign-off.",
      "Daily drift checks compare your live store against the feeds and email you a digest when prices or availability diverge.",
    ],
  },
  {
    version: "v0.4.0",
    date: "July 17, 2026",
    tag: "New",
    title: "Agent-readiness audit",
    points: [
      "Every SKU scored against 12 weighted rules (identifiers, descriptions, prices, images…), rolled up into a catalog score and grade.",
      "Free instant audit on the landing page: paste a store URL, get a score from your real product pages.",
    ],
  },
  {
    version: "v0.3.0",
    date: "July 17, 2026",
    tag: "New",
    title: "Feed engine",
    points: [
      "OpenAI ACP (CSV + JSON), Google Merchant Center TSV, and schema.org JSON-LD rendered from one canonical catalog.",
      "Hosted at stable tokenized URLs with one-click token rotation.",
    ],
  },
  {
    version: "v0.2.0",
    date: "July 17, 2026",
    tag: "New",
    title: "Catalog ingest",
    points: [
      "CSV/XLSX upload with automatic column mapping and locale-aware price parsing.",
      "WooCommerce connector with encrypted read-only REST credentials.",
    ],
  },
  {
    version: "v0.1.0",
    date: "July 17, 2026",
    tag: "New",
    title: "Foundation",
    points: [
      "Multi-tenant core with enforced tenant isolation, canonical product model with ACP-spec validation, and the audit-findings pipeline.",
    ],
  },
];

const tagStyles: Record<string, string> = {
  New: "border-brand/30 bg-brand/10 text-brand",
  Improved: "border-primary/30 bg-primary/10 text-primary",
  Fixed: "border-accent-amber/30 bg-accent-amber/10 text-accent-amber",
};

export default function ChangelogPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Changelog"
        title="What's new in ShelfReady"
        description="Every release, straight from the repository."
      />
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <ol className="relative space-y-12 border-l border-border pl-8">
          {entries.map((entry) => (
            <li key={entry.version} className="relative">
              <span className="absolute -left-[41px] top-1 size-2.5 rounded-full border-2 border-background bg-brand" />
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold tracking-tight">{entry.title}</h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagStyles[entry.tag]}`}
                >
                  {entry.tag}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{entry.version}</span> · {entry.date}
              </p>
              <ul className="mt-3 space-y-2">
                {entry.points.map((point) => (
                  <li key={point} className="text-sm leading-relaxed text-muted-foreground">
                    {point}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
