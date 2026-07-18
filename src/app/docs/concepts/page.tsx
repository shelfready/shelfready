import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "Core concepts",
  description: "Sources, the canonical model, readiness scores, rules, enrichment, and feeds.",
}

const toc = [
  { id: "sources", title: "Sources" },
  { id: "canonical-model", title: "The canonical model" },
  { id: "readiness-score", title: "Readiness score" },
  { id: "rules", title: "Rules & severity" },
  { id: "enrichment", title: "Enrichment" },
  { id: "feeds", title: "Feeds" },
  { id: "freshness", title: "Freshness" },
] as const

export default function ConceptsPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Core concepts"
      description="A quick mental model of how ShelfReady thinks about your catalog."
      toc={[...toc]}
      prev={{ title: "Quickstart", href: "/docs/quickstart" }}
      next={{ title: "Connecting a store", href: "/docs/connect" }}
    >
      <h2 id="sources">Sources</h2>
      <p>
        A <strong>source</strong> is a connection to where your product data lives — a WooCommerce,
        BigCommerce, or Magento store, an existing feed URL (Google Shopping XML or CSV), a CSV/XLSX
        upload, or an API push source created automatically when you use{" "}
        <Link href="/docs/api/catalog">POST /api/v1/catalog</Link>. A workspace can have multiple
        sources, and each syncs independently.
      </p>

      <h2 id="canonical-model">The canonical model</h2>
      <p>
        Every connector normalizes into one canonical product shape: <code>externalId</code>,{" "}
        <code>title</code>, <code>description</code>, <code>brand</code>, <code>url</code>,{" "}
        <code>imageUrl</code>, <code>priceMinor</code>, <code>currency</code>,{" "}
        <code>availability</code>, <code>gtin</code>, <code>mpn</code>, and <code>variants</code>.
        Prices are integer minor units (e.g. <code>2450</code> for €24.50) with an ISO-4217 currency;
        availability is the ACP enum (<code>in_stock</code>, <code>out_of_stock</code>,{" "}
        <code>pre_order</code>, <code>backorder</code>, <code>unknown</code>). Audit, enrichment, and
        every feed renderer work from this one model.
      </p>

      <h2 id="readiness-score">Readiness score</h2>
      <p>
        The <strong>readiness score</strong> is a 0–100 number summarizing how agent-ready a catalog is.
        Each SKU starts at 100 and loses the weight of every rule it fails; the catalog score is the
        average across SKUs. Missing seller settings (name, URL, store country) cap the catalog score at
        40 until fixed, because no feed item is valid without them.
      </p>
      <ul>
        <li>
          <strong>A (90–100):</strong> agent-ready.
        </li>
        <li>
          <strong>B (75–89):</strong> mostly ready with a few high-impact gaps.
        </li>
        <li>
          <strong>C (60–74):</strong> meaningful issues that suppress discoverability.
        </li>
        <li>
          <strong>D (40–59) / F (&lt;40):</strong> critical failures across much of the catalog.
        </li>
      </ul>

      <h2 id="rules">Rules &amp; severity</h2>
      <p>
        A <strong>rule</strong> is a single check applied to every product — for example{" "}
        <code>gtin_missing</code> or <code>description_thin</code>. There are 12 weighted rules plus a
        catalog-level seller-settings check; see <Link href="/docs/audits">running an audit</Link> for
        the full table. Every finding carries a severity:
      </p>
      <ul>
        <li>
          <strong>Error:</strong> a spec violation or missing required field — the item is not eligible
          on the target surface until fixed (missing price, non-HTTPS URL, invalid GTIN).
        </li>
        <li>
          <strong>Warning:</strong> hurts discoverability significantly (missing GTIN, missing brand,
          unknown availability).
        </li>
        <li>
          <strong>Info:</strong> quality improvements that raise match rates over time (thin
          descriptions).
        </li>
      </ul>

      <h2 id="enrichment">Enrichment</h2>
      <p>
        <strong>Enrichment</strong> is Claude-assisted content generation for products with content
        gaps. ShelfReady drafts titles, descriptions, and brands from your existing data, each with a
        rationale. Nothing is applied without explicit approval.
      </p>
      <Callout variant="note">
        <p>
          Enrichment only ever proposes <code>title</code>, <code>description</code>, and{" "}
          <code>brand</code>. Prices, GTINs, and SKUs are never invented or altered.
        </p>
      </Callout>

      <h2 id="feeds">Feeds</h2>
      <p>
        A <strong>feed</strong> is a rendered, hosted representation of your catalog in a specific
        format — OpenAI ACP (CSV and JSON), Google Merchant Center TSV, or schema.org JSON-LD. Feeds
        live at stable tokenized URLs of the form{" "}
        <code>{"/f/<slug>/<token>/<file>"}</code> and re-render automatically after every sync.
      </p>

      <h2 id="freshness">Freshness</h2>
      <p>
        Pull sources re-sync every six hours, and each sync cascades into a feed re-render and a fresh
        audit. A daily drift check fetches your live product pages and compares price and availability
        against the catalog, emailing you a digest when something drifted. Continue to{" "}
        <Link href="/docs/connect">connecting a store</Link> to put these concepts into practice.
      </p>
    </DocPage>
  )
}
