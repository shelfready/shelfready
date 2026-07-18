import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"

export const metadata: Metadata = {
  title: "API · Usage",
  description: "Daily API request counts per key, for self-monitoring your integration.",
}

const toc = [
  { id: "get", title: "Get usage" },
  { id: "fields", title: "Response fields" },
  { id: "limits", title: "Counting & retention" },
] as const

export default function ApiUsagePage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Usage"
      description="Monitor how your integration uses the API: daily request counts with a per-endpoint breakdown, and 7-day/30-day totals per key."
      toc={[...toc]}
      prev={{ title: "Webhooks", href: "/docs/api/webhooks" }}
    >
      <h2 id="get">Get usage</h2>
      <Endpoint method="GET" path="/api/v1/usage" />
      <p>
        Request counts for your merchant over the trailing 30 days. Requires the{" "}
        <code>read</code> scope. The same numbers power the usage chart in{" "}
        <Link href="/dashboard/settings">Dashboard → Settings</Link>.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/usage \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "window_days": 30,
    "days": [
      { "day": "2026-07-17", "total": 412, "endpoints": { "products": 300, "catalog": 100, "feeds": 12 } },
      { "day": "2026-07-18", "total": 87,  "endpoints": { "products": 80, "audit": 7 } }
    ],
    "keys": [
      {
        "id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
        "name": "CI pipeline",
        "prefix": "sr_ab12cd34",
        "revoked": false,
        "requests_7d": 499,
        "requests_30d": 2310
      }
    ]
  },
  "rate_limit": { "requests_per_minute": 60 }
}`}
      />

      <h2 id="fields">Response fields</h2>
      <ParamTable
        params={[
          { name: "data.window_days", type: "integer", description: "Size of the reporting window (30)." },
          { name: "data.days[].day", type: "date", description: "UTC calendar day." },
          { name: "data.days[].total", type: "integer", description: "All authenticated requests that day, across your keys." },
          { name: "data.days[].endpoints", type: "object", description: "Per-endpoint-group breakdown (products, catalog, syncs, feeds, audit, webhooks, usage)." },
          { name: "data.keys[]", type: "array", description: "Every key on the account (including revoked) with requests_7d / requests_30d totals." },
          { name: "rate_limit.requests_per_minute", type: "integer", description: "The per-key rate limit (sliding window)." },
        ]}
      />

      <h2 id="limits">Counting &amp; retention</h2>
      <p>
        A request is counted once its API key authenticates successfully — <code>401</code>/<code>403</code>{" "}
        rejections and <code>429</code> rate-limited requests are not counted. Counters are per UTC day and
        retained for <strong>90 days</strong>. Counting is fire-and-forget: it never slows down or fails your
        request.
      </p>
      <p>
        Approaching the rate limit? Batch catalog changes through{" "}
        <Link href="/docs/api/catalog">
          <code>POST /api/v1/catalog</code>
        </Link>{" "}
        (many items per request) instead of item-by-item calls.
      </p>
    </DocPage>
  )
}
