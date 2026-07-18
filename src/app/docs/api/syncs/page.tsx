import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"

export const metadata: Metadata = {
  title: "API · Syncs",
  description: "List sync runs and trigger pull syncs on demand.",
}

const toc = [
  { id: "list", title: "List sync runs" },
  { id: "trigger", title: "Trigger a sync" },
  { id: "object", title: "The run object" },
] as const

export default function ApiSyncsPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Syncs"
      description="Pull sources re-sync automatically every six hours; use this API to sync on demand and to inspect run history."
      toc={[...toc]}
      prev={{ title: "Catalog", href: "/docs/api/catalog" }}
      next={{ title: "Audits", href: "/docs/api/audits" }}
    >
      <h2 id="list">List sync runs</h2>
      <Endpoint method="GET" path="/api/v1/syncs" />
      <p>
        The 50 most recent sync runs, newest first. Requires the <code>read</code> scope.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/syncs \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />

      <h2 id="trigger">Trigger a sync</h2>
      <Endpoint method="POST" path="/api/v1/syncs" />
      <p>
        Run a pull sync for one source (WooCommerce, BigCommerce, Magento, or feed URL) now. The call is
        synchronous and returns the run stats; a failed sync (unknown source, connector error) returns{" "}
        <code>422</code>. Requires the <code>write</code> scope.
      </p>
      <ParamTable
        params={[
          { name: "source_id", type: "uuid", required: true, description: "The source to sync. Find source IDs in Dashboard → Sources." },
        ]}
      />
      <CodeBlock
        filename="sync.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/syncs \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "source_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809" }'`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
    "stats": { "seen": 1284, "upserted": 1284, "rejected": 0, "warnings": 37, "rejections": [] }
  }
}`}
      />
      <p>
        Every successful sync re-renders your <Link href="/docs/api/feeds">feeds</Link>, re-runs the{" "}
        <Link href="/docs/api/audits">audit</Link>, and emits a <code>sync.completed</code>{" "}
        <Link href="/docs/api/webhooks">webhook</Link>.
      </p>

      <h2 id="object">The run object</h2>
      <ParamTable
        params={[
          { name: "run_id", type: "uuid", description: "Unique run identifier." },
          { name: "source_id", type: "uuid | null", description: "The source this run belongs to." },
          { name: "status", type: "string", description: "running, succeeded, or failed." },
          { name: "stats", type: "object", description: "seen, upserted, rejected, warnings, and capped per-item rejections." },
          { name: "started_at", type: "datetime", description: "When the run started." },
          { name: "finished_at", type: "datetime | null", description: "When the run finished, if it has." },
        ]}
      />
    </DocPage>
  )
}
