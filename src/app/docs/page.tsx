import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ui";
import { OPENAPI_DOCUMENT } from "../api/v1/openapi.json/route";

export const metadata: Metadata = {
  title: "API documentation — ShelfReady",
  description:
    "REST API reference: push catalogs, trigger syncs, read hosted feed URLs and agent-readiness audit results.",
};

/**
 * Hosted API docs (#59), rendered straight from the OpenAPI document so
 * the reference cannot drift from the spec.
 */

const METHOD_TONE: Record<string, string> = {
  get: "bg-sky-100 text-sky-800",
  post: "bg-brand-100 text-brand-800",
  delete: "bg-red-100 text-red-800",
};

interface Operation {
  method: string;
  path: string;
  summary: string;
  description: string;
  scope: "read" | "write" | "none";
  curl: string;
}

function curlFor(method: string, path: string): string {
  const base = "https://useshelfready.com";
  const auth = ' \\\n  -H "Authorization: Bearer $SHELFREADY_API_KEY"';
  if (method === "get") return `curl ${base}${path.replace("{id}", "<uuid>")}${auth}`;
  if (path === "/api/v1/catalog") {
    return `curl -X POST ${base}${path}${auth} \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [{
      "externalId": "SKU-1",
      "title": "Ridgeline 2P Tent",
      "description": "Storm-tested and light.",
      "url": "https://yourstore.com/tent",
      "imageUrl": "https://yourstore.com/tent.jpg",
      "priceMinor": 29900,
      "currency": "EUR",
      "availability": "in_stock",
      "gtin": "4006381333931"
    }]
  }'`;
  }
  if (path === "/api/v1/webhooks" && method === "post") {
    return `curl -X POST ${base}${path}${auth} \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/hooks/shelfready",
    "events": ["sync.completed", "audit.completed"]
  }'`;
  }
  if (path === "/api/v1/webhooks" && method === "delete") {
    return `curl -X DELETE ${base}${path}${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"id": "<uuid>"}'`;
  }
  if (path === "/api/v1/syncs") {
    return `curl -X POST ${base}${path}${auth} \\
  -H "Content-Type: application/json" \\
  -d '{"source_id": "<uuid>"}'`;
  }
  return `curl -X POST ${base}${path}${auth}`;
}

function operations(): Operation[] {
  const ops: Operation[] = [];
  for (const [path, methods] of Object.entries(OPENAPI_DOCUMENT.paths)) {
    for (const [method, op] of Object.entries(
      methods as Record<string, { summary: string; description: string }>,
    )) {
      const scope = op.description.includes("`write` scope")
        ? "write"
        : op.description.includes("`read` scope")
          ? "read"
          : "none";
      ops.push({
        method,
        path,
        summary: op.summary,
        description: op.description.replace(/`/g, ""),
        scope,
        curl: curlFor(method, path),
      });
    }
  }
  return ops;
}

function anchor(op: Operation): string {
  return `${op.method}-${op.path.replace(/[^a-z0-9]+/gi, "-")}`;
}

export default function DocsPage() {
  const ops = operations();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BrandMark className="h-6 w-6" />
            ShelfReady <span className="font-normal text-slate-400">/ docs</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a href="/api/v1/openapi.json" className="text-slate-600 hover:text-slate-900">
              OpenAPI 3.1
            </a>
            <Link href="/demo" className="text-slate-600 hover:text-slate-900">
              Demo
            </Link>
            <Link
              href="/dashboard/settings"
              className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              Get an API key
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 text-sm">
            <p className="mb-2 font-semibold text-slate-900">Getting started</p>
            <ul className="mb-5 space-y-1.5 border-l border-slate-200 pl-3 text-slate-600">
              <li><a href="#auth" className="hover:text-slate-900">Authentication</a></li>
              <li><a href="#errors" className="hover:text-slate-900">Errors & rate limits</a></li>
            </ul>
            <p className="mb-2 font-semibold text-slate-900">Endpoints</p>
            <ul className="space-y-1.5 border-l border-slate-200 pl-3 text-slate-600">
              {ops.map((op) => (
                <li key={anchor(op)}>
                  <a href={`#${anchor(op)}`} className="hover:text-slate-900">
                    <span className="font-mono text-[10px] uppercase text-slate-400">
                      {op.method}
                    </span>{" "}
                    {op.summary}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">API reference</h1>
          <p className="mb-8 max-w-2xl text-slate-600">
            Everything the dashboard does, as a REST API: push your catalog,
            trigger syncs, read your hosted feed URLs and agent-readiness audit
            results. Machine-readable spec at{" "}
            <a href="/api/v1/openapi.json" className="text-brand-700 underline">
              /api/v1/openapi.json
            </a>
            .
          </p>

          <section id="auth" className="mb-10 scroll-mt-20">
            <h2 className="mb-2 text-xl font-semibold">Authentication</h2>
            <p className="mb-3 max-w-2xl text-sm text-slate-600">
              Create an API key in{" "}
              <Link href="/dashboard/settings" className="text-brand-700 underline">
                Dashboard → Settings → API keys
              </Link>
              . Keys look like <code className="rounded bg-slate-100 px-1 font-mono text-xs">sr_…</code>,
              are shown once at creation, and carry <code className="rounded bg-slate-100 px-1 font-mono text-xs">read</code> and/or{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">write</code> scopes.
              Send the key on every request:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {`curl https://useshelfready.com/api/v1/products \\\n  -H "Authorization: Bearer $SHELFREADY_API_KEY"`}
            </pre>
          </section>

          <section id="errors" className="mb-10 scroll-mt-20">
            <h2 className="mb-2 text-xl font-semibold">Errors &amp; rate limits</h2>
            <p className="mb-3 max-w-2xl text-sm text-slate-600">
              Errors share one shape. Keys are limited to{" "}
              <strong>60 requests/minute</strong>; a 429 includes a{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">Retry-After</code> header.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {`{"error": {"status": 403, "message": "this key lacks the \\"write\\" scope"}}`}
            </pre>
          </section>

          {ops.map((op) => (
            <section key={anchor(op)} id={anchor(op)} className="mb-10 scroll-mt-20 border-t border-slate-100 pt-8">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-semibold uppercase ${METHOD_TONE[op.method] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {op.method}
                </span>
                <code className="font-mono text-sm">{op.path}</code>
                {op.scope !== "none" && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                    scope: {op.scope}
                  </span>
                )}
              </div>
              <h3 className="mb-1 text-lg font-semibold">{op.summary}</h3>
              <p className="mb-3 max-w-2xl text-sm text-slate-600">{op.description}</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                {op.curl}
              </pre>
            </section>
          ))}

          <footer className="border-t border-slate-100 pt-6 text-sm text-slate-500">
            Questions?{" "}
            <a href="mailto:support@useshelfready.com" className="text-brand-700 underline">
              support@useshelfready.com
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
