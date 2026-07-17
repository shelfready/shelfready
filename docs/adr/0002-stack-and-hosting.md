# ADR-0002: Stack & hosting

Status: Accepted · 2026-07-17 · Hosting portion superseded by ADR-0005 (self-host on netcup VPS)

## Context

ShelfReady is a feed-transformation + hosted-feed-endpoints + dashboard + billing + LLM-enrichment product, built and operated by one person. The stack must minimize ops, keep iteration fast, and handle read-heavy public feed URLs cheaply. The domain `useshelfready.com` already lives on Cloudflare (registrar + DNS).

## Decision

- **TypeScript on Node 22** throughout.
- **Next.js (App Router)** full-stack — dashboard + API in one deployable — on **Vercel**.
- **Postgres (Neon) + Drizzle ORM.** Catalog data is relational (merchants, sources, products, variants, feed_runs, audit_findings); Drizzle is TS-native with plain-SQL migrations.
- **Upstash Redis** for queues' backing state, rate limits, caching.
- **Inngest** for background jobs — durable cron + retries for sync, drift monitoring, enrichment batches. No hand-rolled queue.
- **Cloudflare R2** for feed artifacts, served as **signed, CDN-cached URLs**; same account as DNS (ADR-0004).
- **Stripe** Checkout + Billing, SKU-count tiers, webhooks → entitlement flags. Test mode until explicit go.
- **Anthropic Claude API** (TS SDK), server-side only, for enrichment + audit; batched, cached, human-approved; OTel-instrumented → Otterscope.
- **Multi-tenant from day one**: merchant = tenant/org.

## Consequences

- Everything rides generous free tiers with near-zero ops; scaling knobs exist on every layer.
- Vercel serverless constrains long-running work — that work belongs in Inngest functions by construction, which is the discipline we want anyway.
- If the API outgrows Next.js route handlers (e.g. high-volume delta-push endpoints), split to Hono behind a new ADR.
- Single-vendor risks are spread (Vercel/Neon/Cloudflare/Upstash/Inngest all replaceable individually behind thin seams).
