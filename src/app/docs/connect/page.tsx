import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "Connecting a store",
  description:
    "Connect WooCommerce, BigCommerce, Magento, a feed URL, a CSV/XLSX upload, or push via the API.",
}

const toc = [
  { id: "woocommerce", title: "WooCommerce" },
  { id: "bigcommerce", title: "BigCommerce" },
  { id: "magento", title: "Magento" },
  { id: "feed-url", title: "Feed URL" },
  { id: "csv", title: "CSV / XLSX upload" },
  { id: "api-push", title: "API push" },
  { id: "sync", title: "Sync behavior" },
] as const

export default function ConnectPage() {
  return (
    <DocPage
      eyebrow="Guides"
      title="Connecting a store"
      description="ShelfReady ingests products from hosted platforms, existing feeds, flat files, or a direct API push. Sources are connected in Dashboard → Sources; pick the path that matches your setup."
      toc={[...toc]}
      prev={{ title: "Core concepts", href: "/docs/concepts" }}
      next={{ title: "Running an audit", href: "/docs/audits" }}
    >
      <h2 id="woocommerce">WooCommerce</h2>
      <p>
        Generate REST API keys in <strong>WooCommerce → Settings → Advanced → REST API</strong> with{" "}
        <em>Read</em> access. In <Link href="/dashboard/sources">Dashboard → Sources</Link>, choose
        WooCommerce and enter your store URL plus the consumer key (<code>ck_…</code>) and consumer
        secret (<code>cs_…</code>).
      </p>

      <h2 id="bigcommerce">BigCommerce</h2>
      <p>
        Create a store-level API account with the <em>Products: read-only</em> scope. Connect with your
        store hash and the access token. Optionally set your storefront base URL so product links point
        at your public store.
      </p>

      <h2 id="magento">Magento</h2>
      <p>
        Magento (Adobe Commerce) connects via an integration access token with catalog read
        permissions. Provide your store base URL (the REST API is reached at{" "}
        <code>{"{baseUrl}"}/rest/V1</code>) and the token.
      </p>

      <h2 id="feed-url">Feed URL</h2>
      <p>
        Already publish a product feed? Point ShelfReady at its URL — no credentials needed. Supported
        formats are Google Shopping XML (RSS 2.0 or Atom) and CSV/TSV; the format is auto-detected, and
        common column names are mapped automatically. Feed URLs must be HTTPS and at most 50&nbsp;MB.
        You can set a default currency for feeds whose prices carry none.
      </p>

      <h2 id="csv">CSV / XLSX upload</h2>
      <p>
        No feed and no supported platform? Upload a CSV or XLSX file in the dashboard. ShelfReady
        guesses the column mapping from your headers and lets you remap columns before importing.
        Re-upload whenever your catalog changes.
      </p>

      <h2 id="api-push">API push</h2>
      <p>
        Push canonical-shaped items straight from your own systems with{" "}
        <Link href="/docs/api/catalog">POST /api/v1/catalog</Link>. The first push auto-provisions an{" "}
        <code>api</code> source; every push validates items and upserts them through the same pipeline
        as the other connectors.
      </p>
      <CodeBlock
        filename="push.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/catalog \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "items": [{ "externalId": "SKU-1", "title": "Ridgeline 2P Tent" }] }'`}
      />

      <h2 id="sync">Sync behavior</h2>
      <p>
        Pull sources (WooCommerce, BigCommerce, Magento, feed URL) re-sync automatically every six
        hours. You can also sync on demand from the dashboard or with{" "}
        <Link href="/docs/api/syncs">POST /api/v1/syncs</Link>. Every successful sync re-renders your
        feeds, re-runs the audit, and emits a <code>sync.completed</code> webhook.
      </p>
      <Callout variant="note">
        <p>ShelfReady only ever reads from your store. It never writes back to your catalog.</p>
      </Callout>
    </DocPage>
  )
}
