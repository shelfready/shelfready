import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "AI enrichment",
  description: "Claude drafts titles, descriptions, and brands; you approve or reject every change.",
}

const toc = [
  { id: "how", title: "How enrichment works" },
  { id: "candidates", title: "What gets enriched" },
  { id: "review", title: "Reviewing & approving" },
  { id: "guardrails", title: "Guardrails" },
] as const

export default function EnrichmentPage() {
  return (
    <DocPage
      eyebrow="Guides"
      title="AI enrichment"
      description="Fill catalog content gaps with Claude-drafted titles, descriptions, and brands — with a human in the loop."
      toc={[...toc]}
      prev={{ title: "Running an audit", href: "/docs/audits" }}
      next={{ title: "Publishing feeds", href: "/docs/feeds" }}
    >
      <h2 id="how">How enrichment works</h2>
      <p>
        For products with content gaps, ShelfReady sends the existing product data to Claude in small
        batches and asks for compliant rewrites. Each proposal comes back with a rationale explaining
        why the change was drafted, and is stored as a pending proposal — never applied automatically.
      </p>

      <h2 id="candidates">What gets enriched</h2>
      <p>A product is an enrichment candidate when any of these hold:</p>
      <ul>
        <li>the description is missing or thin (under 80 characters),</li>
        <li>the brand is missing,</li>
        <li>the title is missing or over the 150-character ACP cap.</li>
      </ul>
      <p>
        These mirror the content rules in the <Link href="/docs/audits">audit</Link>, so approving
        proposals directly improves your readiness score.
      </p>
      <CodeBlock
        language="json"
        filename="proposal.json"
        code={`{
  "field": "description",
  "proposedValue": "The Ridgeline 2P is a freestanding two-person tent built for three-season backpacking…",
  "rationale": "Description was missing or thin.",
  "status": "pending"
}`}
      />

      <h2 id="review">Reviewing &amp; approving</h2>
      <p>
        Review proposals in{" "}
        <Link href="/dashboard/enrichment">Dashboard → Enrichment</Link>. Each shows a before/after
        view. Approve to apply the change to your canonical catalog (feeds pick it up on the next
        render); reject to discard it. Rejected proposals are not re-drafted unless the underlying
        product data changes.
      </p>

      <h2 id="guardrails">Guardrails</h2>
      <ul>
        <li>
          Enrichment only proposes <code>title</code>, <code>description</code>, and <code>brand</code>.
          Prices, GTINs, SKUs, and URLs are never invented or altered.
        </li>
        <li>Proposals use structured output — they arrive validated, never scraped from free text.</li>
        <li>Every proposal cites a rationale so you can audit the reasoning before approving.</li>
      </ul>
      <Callout variant="tip">
        <p>
          Run enrichment after your first sync, approve the good drafts, then re-run the audit to see
          the score move.
        </p>
      </Callout>
    </DocPage>
  )
}
