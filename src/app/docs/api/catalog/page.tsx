import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "API · Catalog",
  description: "Push canonical catalog items through the validation and upsert pipeline.",
}

const toc = [
  { id: "push", title: "Push catalog items" },
  { id: "item", title: "The catalog item" },
  { id: "rejections", title: "Validation & rejections" },
] as const

export default function ApiCatalogPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Catalog"
      description="Push products straight from your own systems — the API-push alternative to connecting a store."
      toc={[...toc]}
      prev={{ title: "Products", href: "/docs/api/products" }}
      next={{ title: "Syncs", href: "/docs/api/syncs" }}
    >
      <h2 id="push">Push catalog items</h2>
      <Endpoint method="POST" path="/api/v1/catalog" />
      <p>
        Push 1–5000 canonical-shaped items through the sync pipeline (validation → upsert). Items land
        on an auto-provisioned <code>api</code> source; the response is a sync run with per-item stats.
        Requires the <code>write</code> scope.
      </p>
      <CodeBlock
        filename="push.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/catalog \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [{
      "externalId": "SKU-1",
      "title": "Ridgeline 2P Tent",
      "description": "Storm-tested and light: a freestanding two-person shelter for three-season trips.",
      "brand": "Alpine Outdoor",
      "url": "https://yourstore.com/products/ridgeline-2p",
      "imageUrl": "https://yourstore.com/images/ridgeline-2p.jpg",
      "priceMinor": 29900,
      "currency": "EUR",
      "availability": "in_stock",
      "gtin": "4006381333931"
    }]
  }'`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
    "source_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "stats": { "seen": 1, "upserted": 1, "rejected": 0, "warnings": 0, "rejections": [] }
  }
}`}
      />

      <h2 id="item">The catalog item</h2>
      <p>
        Only <code>externalId</code> and <code>title</code> are required to upsert, but every field
        below feeds eligibility on the AI-surface feeds — the <Link href="/docs/audits">audit</Link>{" "}
        tells you what is missing.
      </p>
      <ParamTable
        params={[
          { name: "externalId", type: "string", required: true, description: "Stable ID in your system (SKU). Upserts match on it." },
          { name: "title", type: "string", required: true, description: "Product title, at most 150 characters (ACP cap)." },
          { name: "description", type: "string", description: "Plain text (no HTML), at most 5000 characters." },
          { name: "brand", type: "string", description: "Brand name." },
          { name: "url", type: "string", description: "HTTPS product page URL." },
          { name: "imageUrl", type: "string", description: "HTTPS primary image URL." },
          { name: "priceMinor", type: "integer", description: "Price in integer minor units — 2450 for €24.50." },
          { name: "currency", type: "string", description: "ISO-4217 code, e.g. EUR." },
          {
            name: "availability",
            type: "string",
            description: "One of in_stock, out_of_stock, pre_order, backorder, unknown. Defaults to unknown.",
          },
          { name: "gtin", type: "string", description: "GTIN — validated against length and GS1 checksum." },
          { name: "mpn", type: "string", description: "Manufacturer part number." },
          {
            name: "variants",
            type: "object[]",
            description: "Variant objects (externalId, sku, priceMinor, currency, availability, gtin, mpn, color, size).",
          },
        ]}
      />

      <h2 id="rejections">Validation &amp; rejections</h2>
      <p>
        Every item is validated against the canonical model. Items that fail (invalid GTIN checksum,
        non-HTTPS URL, unknown currency, overlong title) are rejected per-item and reported in{" "}
        <code>stats.rejections</code> with field-level issues — they never touch your catalog. Valid
        items in the same request are upserted normally.
      </p>
      <Callout variant="note">
        <p>
          A successful push cascades like any sync: feeds re-render, the audit re-runs, and a{" "}
          <code>sync.completed</code> <Link href="/docs/api/webhooks">webhook</Link> is emitted.
        </p>
      </Callout>
    </DocPage>
  )
}
