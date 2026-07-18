import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "Publishing feeds",
  description: "Hosted ACP, Google Merchant Center, and JSON-LD feeds at stable tokenized URLs.",
}

const toc = [
  { id: "formats", title: "Supported formats" },
  { id: "urls", title: "Feed URLs" },
  { id: "freshness", title: "Freshness & re-render" },
  { id: "seller-settings", title: "Seller settings" },
] as const

const files: [string, string][] = [
  ["acp.csv", "OpenAI ACP product feed, CSV"],
  ["acp.json", "OpenAI ACP product feed, JSON"],
  ["gmc.tsv", "Google Merchant Center feed, TSV"],
  ["jsonld.json", "schema.org Product + Offer JSON-LD"],
]

export default function FeedsPage() {
  return (
    <DocPage
      eyebrow="Guides"
      title="Publishing feeds"
      description="Turn your audited, enriched catalog into hosted feeds that agent integrations can consume directly."
      toc={[...toc]}
      prev={{ title: "AI enrichment", href: "/docs/enrichment" }}
      next={{ title: "Authentication", href: "/docs/api/authentication" }}
    >
      <h2 id="formats">Supported formats</h2>
      <p>Every catalog renders to four artifacts:</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">File</th>
              <th className="px-4 py-2.5 font-medium">Format</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {files.map(([file, format]) => (
              <tr key={file}>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground">
                  {file}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="urls">Feed URLs</h2>
      <p>
        Feeds are hosted at stable, tokenized URLs — no auth headers needed, so you can hand a URL to
        any integration:
      </p>
      <CodeBlock code={`https://useshelfready.com/f/<your-slug>/<token>/<file>`} />
      <p>
        The token is a capability: anyone with the URL can read the feed, and any mismatch returns a
        plain 404. List your URLs in <Link href="/dashboard/feeds">Dashboard → Feeds</Link> or via{" "}
        <Link href="/docs/api/feeds">GET /api/v1/feeds</Link>.
      </p>

      <h2 id="freshness">Freshness &amp; re-render</h2>
      <p>
        Feeds re-render automatically after every sync — scheduled (every six hours for pull sources)
        or on demand. You can also force a re-render with{" "}
        <Link href="/docs/api/feeds">POST /api/v1/feeds</Link>. Every render emits a{" "}
        <code>feeds.rendered</code> <Link href="/docs/api/webhooks">webhook</Link>, and a daily drift
        check compares your live product pages against the catalog so stale prices and availability get
        caught between syncs.
      </p>

      <h2 id="seller-settings">Seller settings</h2>
      <p>
        ACP and GMC items carry seller-level fields — seller name, seller URL, and store country. Set
        them once in <Link href="/dashboard/settings">Dashboard → Settings</Link>; they are attached to
        every item at render time.
      </p>
      <Callout variant="warning">
        <p>
          Until seller settings are filled in, the audit caps your catalog score at 40 — no feed item is
          valid without them.
        </p>
      </Callout>
    </DocPage>
  )
}
