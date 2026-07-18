import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"

export const metadata: Metadata = {
  title: "Running an audit",
  description: "How the 12 agent-readiness rules score your catalog, and how to read the results.",
}

const toc = [
  { id: "trigger", title: "Trigger an audit" },
  { id: "rules", title: "The 12 rules" },
  { id: "scoring", title: "Scoring & grades" },
  { id: "results", title: "Reading results" },
  { id: "continuous", title: "Continuous audits" },
] as const

const rules: [string, string, number, string][] = [
  ["gtin_missing", "warning", 18, "No GTIN — the #1 discoverability signal for AI shopping surfaces"],
  ["gtin_invalid", "error", 22, "GTIN fails length or GS1-checksum validation"],
  ["title_missing", "error", 15, "Title is required on every surface"],
  ["title_overlong", "error", 8, "Title exceeds the 150-character ACP cap"],
  ["description_missing", "error", 12, "Description is required for feed eligibility"],
  ["description_thin", "info", 6, "Description under 80 characters — agents rank rich descriptions higher"],
  ["brand_missing", "warning", 10, "Brand is required by ACP and GMC"],
  ["url_missing", "error", 15, "Product URL is required — agents send buyers to it"],
  ["url_not_https", "error", 8, "Product URL must be HTTPS"],
  ["image_missing", "error", 12, "Image URL is required on every surface"],
  ["price_missing", "error", 15, "Price is required on every surface"],
  ["availability_unknown", "warning", 10, "Availability unknown — agents skip items they can't promise"],
]

export default function AuditsPage() {
  return (
    <DocPage
      eyebrow="Guides"
      title="Running an audit"
      description="Audits score every SKU against 12 weighted agent-readiness rules and produce a prioritized fix list."
      toc={[...toc]}
      prev={{ title: "Connecting a store", href: "/docs/connect" }}
      next={{ title: "AI enrichment", href: "/docs/enrichment" }}
    >
      <h2 id="trigger">Trigger an audit</h2>
      <p>
        Audits run automatically after every sync, but you can trigger one on demand from the dashboard
        or the API. The API call is synchronous and returns the score directly.
      </p>
      <CodeBlock
        filename="audit.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/audit/runs \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />

      <h2 id="rules">The 12 rules</h2>
      <p>
        Each rule checks one field on every catalog entry. The weight is the score deduction a failing
        SKU takes (on a 0–100 scale).
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Rule</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Weight</th>
              <th className="px-4 py-2.5 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.map(([code, severity, weight, meaning]) => (
              <tr key={code} className="align-top">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground">
                  {code}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{severity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{weight}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        One catalog-level rule, <code>seller_settings_missing</code>, checks that seller name, seller
        URL, and store country are set (in{" "}
        <Link href="/dashboard/settings">Dashboard → Settings</Link>) — every feed item needs them, so
        while it fails the catalog score is capped at 40.
      </p>

      <h2 id="scoring">Scoring &amp; grades</h2>
      <p>
        Each SKU starts at 100 and loses the weight of every rule it fails (floored at 0). The catalog
        score is the average across SKUs, graded <strong>A</strong> (90–100), <strong>B</strong>{" "}
        (75–89), <strong>C</strong> (60–74), <strong>D</strong> (40–59), or <strong>F</strong> (below
        40). Severity tells you what a finding means: <strong>error</strong> findings are spec
        violations that make an item ineligible on the target surface, <strong>warning</strong>{" "}
        findings hurt discoverability, and <strong>info</strong> findings are quality improvements.
      </p>

      <h2 id="results">Reading results</h2>
      <p>
        <Link href="/docs/api/audits">GET /api/v1/audit</Link> returns the latest run plus the current
        findings snapshot. Each finding points at a product (and variant, when applicable), the field,
        and the rule code:
      </p>
      <CodeBlock
        language="json"
        filename="finding.json"
        code={`{
  "product_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
  "variant_id": null,
  "code": "gtin_missing",
  "severity": "warning",
  "field": "gtin",
  "message": "No GTIN — the #1 discoverability signal for AI shopping surfaces"
}`}
      />
      <p>A practical fixing order:</p>
      <ol>
        <li>
          Resolve <strong>error</strong> findings so items become spec-compliant on every surface.
        </li>
        <li>
          Tackle the heavy <strong>warning</strong> rules — <code>gtin_missing</code> alone costs 18
          points per SKU.
        </li>
        <li>
          Batch content gaps (<code>description_thin</code>, <code>brand_missing</code>) through{" "}
          <Link href="/docs/enrichment">AI enrichment</Link>.
        </li>
      </ol>

      <h2 id="continuous">Continuous audits</h2>
      <p>
        Because audits re-run on every sync, your score tracks reality. Subscribe to the{" "}
        <code>audit.completed</code> <Link href="/docs/api/webhooks">webhook</Link> and wire it to your
        alerting so score regressions surface immediately.
      </p>
    </DocPage>
  )
}
