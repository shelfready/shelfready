import type { Metadata } from "next"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Endpoint, ParamTable } from "@/components/docs/endpoint"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "API · Webhooks",
  description: "Register HTTPS endpoints and receive signed event deliveries.",
}

const toc = [
  { id: "events", title: "Event types" },
  { id: "manage", title: "Managing webhooks" },
  { id: "payload", title: "Deliveries" },
  { id: "verify", title: "Verifying signatures" },
  { id: "retries", title: "Retries" },
] as const

const events: [string, string][] = [
  ["sync.completed", "A source sync finished (scheduled, on-demand, or a catalog push)."],
  ["feeds.rendered", "The feed artifacts were regenerated."],
  ["audit.completed", "An audit run finished, with the new score and grade."],
]

const payload = `{
  "event": "audit.completed",
  "created_at": "2026-07-17T09:20:44.000Z",
  "data": {
    "run_id": "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
    "catalog_score": 72,
    "grade": "B"
  }
}`

const verify = `import { createHmac, timingSafeEqual } from "node:crypto"

export function verifyShelfReady(secret: string, body: string, header: string): boolean {
  // header: "t=<unix ts>,v1=<hex hmac>"
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)))
  const t = Number(parts.t)
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false

  const expected = createHmac("sha256", secret).update(\`\${t}.\${body}\`).digest()
  const given = Buffer.from(parts.v1 ?? "", "hex")
  return given.length === expected.length && timingSafeEqual(given, expected)
}`

export default function ApiWebhooksPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Webhooks"
      description="Subscribe to events so your systems react the moment syncs, renders, and audits complete."
      toc={[...toc]}
      prev={{ title: "Feeds", href: "/docs/api/feeds" }}
      next={{ title: "Usage", href: "/docs/api/usage" }}
    >
      <h2 id="events">Event types</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map(([name, desc]) => (
              <tr key={name}>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground">
                  {name}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="manage">Managing webhooks</h2>
      <Endpoint method="POST" path="/api/v1/webhooks" />
      <p>
        Register an HTTPS endpoint for one or more events. Requires the <code>write</code> scope. The
        response includes the signing <code>secret</code> (prefixed <code>whsec_</code>){" "}
        <strong>once</strong> — store it immediately; it is never returned again.
      </p>
      <ParamTable
        params={[
          { name: "url", type: "string", required: true, description: "HTTPS endpoint to deliver events to." },
          { name: "events", type: "string[]", required: true, description: "One or more of the event types above." },
        ]}
      />
      <CodeBlock
        filename="create.sh"
        code={`curl -X POST https://useshelfready.com/api/v1/webhooks \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/hooks/shelfready",
    "events": ["sync.completed", "audit.completed"]
  }'`}
      />
      <Endpoint method="GET" path="/api/v1/webhooks" />
      <p>
        List registered endpoints (signing secrets are never returned). Requires the <code>read</code>{" "}
        scope.
      </p>
      <Endpoint method="DELETE" path="/api/v1/webhooks" />
      <p>
        Remove an endpoint by ID. Requires the <code>write</code> scope.
      </p>
      <CodeBlock
        filename="delete.sh"
        code={`curl -X DELETE https://useshelfready.com/api/v1/webhooks \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "id": "9e8d7c6b-5a49-3827-1605-f4e3d2c1b0a9" }'`}
      />

      <h2 id="payload">Deliveries</h2>
      <p>
        Every delivery is a JSON <code>POST</code> with a top-level <code>event</code>,{" "}
        <code>created_at</code>, and an event-specific <code>data</code> object. Requests carry{" "}
        <code>X-ShelfReady-Signature</code> and <code>X-ShelfReady-Event</code> headers and the{" "}
        <code>User-Agent</code> <code>ShelfReady-Webhooks/1.0</code>, and time out after 10 seconds —
        respond with a 2xx quickly and do the work asynchronously.
      </p>
      <CodeBlock language="json" filename="audit.completed" code={payload} />

      <h2 id="verify">Verifying signatures</h2>
      <p>
        The <code>X-ShelfReady-Signature</code> header has the form{" "}
        <code>{"t=<unix ts>,v1=<hex HMAC-SHA256>"}</code>, where the MAC is computed over{" "}
        <code>{"<ts>.<body>"}</code> with your <code>whsec_…</code> secret. Verify every delivery and
        reject stale timestamps.
      </p>
      <CodeBlock language="typescript" filename="verify.ts" code={verify} />
      <Callout variant="warning">
        <p>
          Compute the signature against the exact raw bytes you received. Parsing to JSON first can
          reorder keys and break verification.
        </p>
      </Callout>

      <h2 id="retries">Retries</h2>
      <p>
        A delivery that fails (non-2xx, timeout, or connection error) is retried after 1 minute, 5
        minutes, 30 minutes, 2 hours, and 12 hours. After the last failed attempt the delivery is
        marked dead and not retried again.
      </p>
    </DocPage>
  )
}
