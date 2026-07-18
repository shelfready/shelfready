import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"

export const metadata: Metadata = {
  title: "API · Audits",
  description: "Run the agent-readiness audit and read scores and findings.",
}

const toc = [
  { id: "get", title: "Get audit results" },
  { id: "run", title: "Run the audit" },
  { id: "finding", title: "The finding object" },
] as const

export default function ApiAuditsPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Audits"
      description="Score the catalog against the 12 agent-readiness rules and read the results programmatically."
      toc={[...toc]}
      prev={{ title: "Syncs", href: "/docs/api/syncs" }}
      next={{ title: "Feeds", href: "/docs/api/feeds" }}
    >
      <h2 id="get">Get audit results</h2>
      <Endpoint method="GET" path="/api/v1/audit" />
      <p>
        The latest audit run and the current findings snapshot. Requires the <code>read</code> scope.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/audit \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />
      <CodeBlock
        language="json"
        filename="response.json"
        code={`{
  "data": {
    "last_run": {
      "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
      "status": "succeeded",
      "stats": { "catalogScore": 72, "grade": "B", "items": 128, "findings": 41 },
      "started_at": "2026-07-17T09:12:00.000Z",
      "finished_at": "2026-07-17T09:12:04.000Z"
    },
    "findings": [
      {
        "product_id": "5b6c7d8e-9fa0-b1c2-d3e4-f5a6b7c8d9e0",
        "variant_id": null,
        "code": "gtin_missing",
        "severity": "warning",
        "field": "gtin",
        "message": "No GTIN — the #1 discoverability signal for AI shopping surfaces"
      }
    ]
  }
}`}
      />

      <h2 id="run">Run the audit</h2>
      <Endpoint method="POST" path="/api/v1/audit/runs" />
      <p>
        Score the catalog for agent readiness now. Synchronous — the response carries the catalog score
        (0–100) and grade (A–F). A failed audit returns <code>422</code>. Requires the{" "}
        <code>write</code> scope. Audits also run automatically after every{" "}
        <Link href="/docs/api/syncs">sync</Link>, and each run emits an <code>audit.completed</code>{" "}
        <Link href="/docs/api/webhooks">webhook</Link>.
      </p>
      <CodeBlock
        filename="run.sh"
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

      <h2 id="finding">The finding object</h2>
      <p>
        Findings are rule violations; see <Link href="/docs/audits">running an audit</Link> for all 12
        rule codes, severities, and weights.
      </p>
      <ParamTable
        params={[
          { name: "product_id", type: "uuid | null", description: "The product the finding points at (null for catalog-level findings)." },
          { name: "variant_id", type: "uuid | null", description: "The variant, when the finding is variant-specific." },
          { name: "code", type: "string", description: "Rule code, e.g. gtin_missing or url_not_https." },
          { name: "severity", type: "string", description: "error, warning, or info." },
          { name: "field", type: "string | null", description: "The canonical field the finding is about." },
          { name: "message", type: "string", description: "Human-readable explanation." },
        ]}
      />
    </DocPage>
  )
}
