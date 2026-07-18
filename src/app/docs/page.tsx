import type { Metadata } from "next"
import Link from "next/link"
import { ClipboardCheck, Rss, Sparkles, Store } from "lucide-react"
import { DocPage } from "@/components/docs/doc-page"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "Introduction",
  description: "ShelfReady makes non-Shopify catalogs readable by AI shopping agents.",
}

const toc = [
  { id: "what-is-shelfready", title: "What is ShelfReady" },
  { id: "why-it-matters", title: "Why it matters" },
  { id: "how-it-works", title: "How it works" },
  { id: "next-steps", title: "Next steps" },
] as const

const capabilities = [
  {
    icon: Store,
    title: "Connect",
    body: "WooCommerce, BigCommerce, Magento, an existing feed URL, a CSV/XLSX upload, or a direct API push.",
  },
  {
    icon: ClipboardCheck,
    title: "Audit",
    body: "Score every SKU against 12 weighted agent-readiness rules and get a graded fix list.",
  },
  {
    icon: Sparkles,
    title: "Enrich",
    body: "Claude drafts titles, descriptions, and brands; nothing applies without your approval.",
  },
  {
    icon: Rss,
    title: "Publish",
    body: "Hosted ACP, Google Merchant Center, and JSON-LD feeds at stable tokenized URLs, kept fresh.",
  },
]

export default function DocsIntroPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Introduction"
      description="ShelfReady turns any non-Shopify store into a spec-compliant, discoverable, and always-fresh catalog that AI shopping agents can actually read."
      toc={[...toc]}
      next={{ title: "Quickstart", href: "/docs/quickstart" }}
    >
      <h2 id="what-is-shelfready">What is ShelfReady</h2>
      <p>
        AI assistants increasingly recommend specific products to shoppers. To do that reliably they
        read structured product feeds. If your catalog is missing identifiers, has thin descriptions,
        or drifts out of date, agents cannot read it with confidence.
      </p>
      <p>
        ShelfReady sits between your store and these agents. It audits your catalog, helps you fix the
        gaps with AI-assisted enrichment, and publishes clean, spec-compliant feeds in the formats that
        matter — so your catalog is compliant, discoverable, and fresh.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {capabilities.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="size-5" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-card-foreground">{c.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      <h2 id="why-it-matters">Why it matters</h2>
      <p>
        Shopify stores get agent-ready feeds almost for free through native integrations. Everyone else —
        the majority of the long tail of ecommerce — is on their own. ShelfReady closes that gap without
        requiring a re-platform.
      </p>
      <ul>
        <li>
          <strong>Spec-compliant:</strong> feeds render against OpenAI ACP (CSV and JSON), Google
          Merchant Center (TSV), and schema.org JSON-LD out of the box.
        </li>
        <li>
          <strong>Discoverable:</strong> complete identifiers and attributes so agents can match products
          to shopper intent.
        </li>
        <li>
          <strong>Fresh:</strong> scheduled syncs and daily drift monitoring catch price and availability
          changes before agents see stale data.
        </li>
      </ul>
      <Callout variant="note">
        <p>
          ShelfReady makes your catalog compliant, discoverable, and fresh. Whether a given AI surface
          lists your store is that surface&apos;s decision — for example, OpenAI runs its own merchant
          approval process.
        </p>
      </Callout>

      <h2 id="how-it-works">How it works</h2>
      <p>
        You connect a source once. ShelfReady ingests your products into a canonical model, re-renders
        your feeds, runs an audit, and produces a prioritized fix list. You review Claude-drafted
        enrichment proposals and approve the ones you like. From then on, pull sources re-sync every six
        hours and feeds re-render automatically after every sync.
      </p>

      <Callout variant="tip">
        <p>
          You do not need to connect a store to try it. Paste a product URL on the{" "}
          <Link href="/">home page</Link> to run a free sample audit in seconds, or click through the{" "}
          <Link href="/demo">live demo</Link>.
        </p>
      </Callout>

      <h2 id="next-steps">Next steps</h2>
      <p>Ready to make your catalog agent-ready? Start with the quickstart, then wire up the API.</p>
      <ul>
        <li>
          <Link href="/docs/quickstart">Quickstart</Link> — connect a store and publish your first feed.
        </li>
        <li>
          <Link href="/docs/concepts">Core concepts</Link> — readiness scores, rules, and feeds explained.
        </li>
        <li>
          <Link href="/docs/api/authentication">API reference</Link> — automate everything with the REST
          API (machine-readable spec at <a href="/api/v1/openapi.json">/api/v1/openapi.json</a>).
        </li>
      </ul>
    </DocPage>
  )
}
