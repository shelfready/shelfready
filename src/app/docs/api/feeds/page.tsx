import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint } from "@/components/docs/endpoint"

export const metadata: Metadata = {
  title: "API · Feeds",
  description: "List hosted feed URLs and re-render feed artifacts on demand.",
}

const toc = [
  { id: "list", title: "List feed URLs" },
  { id: "render", title: "Re-render feeds" },
] as const

export default function ApiFeedsPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Feeds"
      description="Every catalog renders to four hosted artifacts — ACP CSV, ACP JSON, Google Merchant Center TSV, and schema.org JSON-LD — at stable tokenized URLs."
      toc={[...toc]}
      prev={{ title: "Audits", href: "/docs/api/audits" }}
      next={{ title: "Webhooks", href: "/docs/api/webhooks" }}
    >
      <h2 id="list">List feed URLs</h2>
      <Endpoint method="GET" path="/api/v1/feeds" />
      <p>
        Tokenized URLs for every feed surface plus the last render run. Requires the <code>read</code>{" "}
        scope. The URLs are public capability URLs — hand them to your agent integrations directly; see{" "}
        <Link href="/docs/feeds">publishing feeds</Link>.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/feeds \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "feeds": [
      {
        "file": "acp.csv",
        "content_type": "text/csv; charset=utf-8",
        "url": "https://useshelfready.com/f/alpine-outdoor/6b1f…9c4e/acp.csv"
      },
      {
        "file": "acp.json",
        "content_type": "application/json",
        "url": "https://useshelfready.com/f/alpine-outdoor/6b1f…9c4e/acp.json"
      },
      {
        "file": "gmc.tsv",
        "content_type": "text/tab-separated-values; charset=utf-8",
        "url": "https://useshelfready.com/f/alpine-outdoor/6b1f…9c4e/gmc.tsv"
      },
      {
        "file": "jsonld.json",
        "content_type": "application/json",
        "url": "https://useshelfready.com/f/alpine-outdoor/6b1f…9c4e/jsonld.json"
      }
    ],
    "last_render": {
      "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
      "status": "succeeded",
      "stats": { "items": 1284 },
      "started_at": "2026-07-17T09:12:00.000Z",
      "finished_at": "2026-07-17T09:12:02.000Z"
    }
  }
}`}
      />

      <h2 id="render">Re-render feeds</h2>
      <Endpoint method="POST" path="/api/v1/feeds" />
      <p>
        Regenerate all four feed artifacts now. Feeds also re-render automatically after every{" "}
        <Link href="/docs/api/syncs">sync</Link>, so you only need this after out-of-band changes (for
        example, approving <Link href="/docs/enrichment">enrichment proposals</Link>). A failed render
        returns <code>422</code>; each successful render emits a <code>feeds.rendered</code>{" "}
        <Link href="/docs/api/webhooks">webhook</Link>. Requires the <code>write</code> scope.
      </p>
      <CodeBlock
        filename="render.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/feeds \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
    </DocPage>
  )
}
