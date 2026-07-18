import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "Quickstart",
  description: "Connect a store, run an audit, and publish your first feed in minutes.",
}

const toc = [
  { id: "api-key", title: "Get an API key" },
  { id: "connect", title: "1. Connect a source" },
  { id: "audit", title: "2. Run an audit" },
  { id: "feeds", title: "3. Get your feed URLs" },
  { id: "verify", title: "4. Verify the output" },
] as const

export default function QuickstartPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Quickstart"
      description="Go from a raw catalog to a live, agent-readable feed in four steps."
      toc={[...toc]}
      prev={{ title: "Introduction", href: "/docs" }}
      next={{ title: "Core concepts", href: "/docs/concepts" }}
    >
      <h2 id="api-key">Get an API key</h2>
      <p>
        Create an account, then generate a key in{" "}
        <Link href="/dashboard">Dashboard</Link> → Settings → API keys. Keys look like{" "}
        <code>sr_</code> followed by 64 hex characters, carry <code>read</code> and/or{" "}
        <code>write</code> scopes, and are shown <strong>once</strong> at creation — store yours
        immediately.
      </p>
      <CodeBlock
        filename=".env"
        code={`SHELFREADY_API_KEY=sr_9f2c…  # 64 hex chars, shown once at creation`}
      />
      <Callout variant="warning">
        <p>Treat keys like passwords. Never commit them or expose them in client-side code.</p>
      </Callout>

      <h2 id="connect">1. Connect a source</h2>
      <p>
        Connect your store in <Link href="/dashboard/sources">Dashboard → Sources</Link>: WooCommerce,
        BigCommerce, Magento, an existing feed URL (Google Shopping XML or CSV), or a CSV/XLSX upload.
        See <Link href="/docs/connect">connecting a store</Link> for platform-specific steps.
      </p>
      <p>
        No supported platform? Push your catalog directly through the API instead — items are validated
        and upserted in one call:
      </p>
      <CodeBlock
        filename="push-catalog.sh"
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

      <h2 id="audit">2. Run an audit</h2>
      <p>
        Audits run automatically after every sync, but you can trigger one on demand. The response is
        synchronous — you get the catalog score and grade right away.
      </p>
      <CodeBlock
        filename="audit.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/audit/runs \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
    "catalog_score": 72,
    "grade": "B"
  }
}`}
      />

      <h2 id="feeds">3. Get your feed URLs</h2>
      <p>
        Feeds re-render automatically after every sync. List the hosted, tokenized URLs for all four
        surfaces — ACP CSV, ACP JSON, Google Merchant Center TSV, and schema.org JSON-LD:
      </p>
      <CodeBlock
        filename="feeds.sh"
        code={`curl https://useshelfready.com/api/v1/feeds \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />

      <Callout variant="warning">
        <p>
          Feeds inherit the readiness of your catalog. Fix <strong>error</strong>-severity findings
          first — they mark spec violations that make items ineligible on the target surface.
        </p>
      </Callout>

      <h2 id="verify">4. Verify the output</h2>
      <p>
        Each feed lives at a stable URL of the form{" "}
        <code>{"https://useshelfready.com/f/<your-slug>/<token>/acp.json"}</code>. Fetch it to confirm
        items render, then hand the URL to your agent integration.
      </p>
      <CodeBlock code={`curl "https://useshelfready.com/f/<your-slug>/<token>/acp.json"`} />
      <p>
        That is the full loop. Next, read <Link href="/docs/concepts">core concepts</Link> to understand
        how scoring and rules work under the hood.
      </p>
    </DocPage>
  )
}
