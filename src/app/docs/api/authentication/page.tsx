import type { Metadata } from "next"
import Link from "next/link"
import { DocPage } from "@/components/docs/doc-page"
import { CodeBlock } from "@/components/docs/code-block"
import { Callout } from "@/components/docs/callout"

export const metadata: Metadata = {
  title: "API · Authentication",
  description: "Authenticate requests to the ShelfReady REST API with bearer API keys.",
}

const toc = [
  { id: "keys", title: "API keys" },
  { id: "requests", title: "Authenticating requests" },
  { id: "scopes", title: "Scopes" },
  { id: "errors", title: "Errors" },
  { id: "rate-limits", title: "Rate limits" },
  { id: "openapi", title: "OpenAPI spec" },
] as const

export default function ApiAuthPage() {
  return (
    <DocPage
      eyebrow="API reference"
      title="Authentication"
      description="The ShelfReady API uses bearer API keys over HTTPS. All requests must be authenticated."
      toc={[...toc]}
      prev={{ title: "Publishing feeds", href: "/docs/feeds" }}
      next={{ title: "Products", href: "/docs/api/products" }}
    >
      <h2 id="keys">API keys</h2>
      <p>
        Create keys in <Link href="/dashboard/settings">Dashboard → Settings → API keys</Link>. Keys
        look like <code>sr_</code> followed by 64 hex characters and are shown <strong>once</strong> at
        creation — only a hash is stored, so a lost key must be replaced, not recovered.
      </p>
      <Callout variant="warning">
        <p>Treat keys like passwords. Never commit them or expose them in client-side code.</p>
      </Callout>

      <h2 id="requests">Authenticating requests</h2>
      <p>
        Pass the key as a bearer token in the <code>Authorization</code> header on every request.
      </p>
      <CodeBlock
        code={`curl https://useshelfready.com/api/v1/products \\
  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
      />

      <h2 id="scopes">Scopes</h2>
      <p>
        Every key carries one or both scopes: <code>read</code> (list products, syncs, feeds, audit
        results, webhooks) and <code>write</code> (push catalog items, trigger syncs, re-render feeds,
        run audits, manage webhooks). Each endpoint&apos;s reference page states the scope it requires.
      </p>

      <h2 id="errors">Errors</h2>
      <p>All errors share one JSON shape:</p>
      <CodeBlock
        language="json"
        filename="error.json"
        code={`{ "error": { "status": 403, "message": "this key lacks the \\"write\\" scope" } }`}
      />
      <ul>
        <li>
          <code>401</code> — missing, malformed, invalid, or revoked API key.
        </li>
        <li>
          <code>403</code> — the key lacks the required scope.
        </li>
        <li>
          <code>429</code> — rate limit exceeded.
        </li>
      </ul>

      <h2 id="rate-limits">Rate limits</h2>
      <p>
        Each key is limited to <strong>60 requests per minute</strong> (sliding window). Exceeding the
        limit returns <code>429 Too Many Requests</code> with a <code>Retry-After</code> header giving
        the seconds to wait.
      </p>

      <h2 id="openapi">OpenAPI spec</h2>
      <p>
        The full API is described by a machine-readable OpenAPI 3.1 document at{" "}
        <a href="/api/v1/openapi.json">/api/v1/openapi.json</a> — use it to generate clients or import
        the API into your tooling.
      </p>
    </DocPage>
  )
}
