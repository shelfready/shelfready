# CLAUDE.md — ShelfReady

Make any non-Shopify store shoppable/discoverable by AI shopping agents: spec-compliant hosted feeds (OpenAI ACP, Google Merchant Center, JSON-LD), an agent-readiness audit + score, Claude-powered catalog enrichment, and freshness/drift monitoring. Free instant-audit (paste store URL → score) is the acquisition hook.

**Read `docs/WORKFLOW.md` before doing any work — the issue-driven loop there is non-negotiable.**

## Hard rules

- **Discovery-first.** The MVP is feeds + audit + enrichment + monitoring. **Never build or wire checkout / Shared-Payment-Token settlement** (merchant-of-record, tax/fraud/refund liability) without Kalin's explicit, in-the-moment go-ahead. See ADR-0001.
- **Stripe stays in test mode** — test keys, test webhooks, test cards — until Kalin explicitly says otherwise. Never deploy billing to production or take a real payment without his go.
- **Multi-tenant from day one.** Tenant-owned tables (products, variants, sources, feed_runs, audit_findings) are touched **only** through `forMerchant(db, merchantId)` in `src/db/tenant.ts` — never via raw `db.select()/insert()/…`. Queries that outgrow the scoped accessors go in that module, next to the scope they must respect. Every PR touching tenant-scoped code includes an isolation test (harness: `createTwoTenants` in `src/db/test-tenants.ts`) that tenant A cannot read/write tenant B's data.
- **Secrets:** never in the repo or any client-visible surface. Merchant platform API keys (connector credentials) are encrypted at rest, never logged, never sent to the client.
- **Marketing honesty:** we promise "compliant + discoverable + fresh", never "we get you into ChatGPT" — OpenAI's merchant approval gate is theirs, not ours.
- **Outward-facing actions** (production deploys, live payments, anything public) need Kalin's explicit go each time.

## Architecture map

Pre-code — this section grows as M0 lands. Planned shape (ADR-0002):

- `src/app/` — Next.js App Router: dashboard + API routes. Self-hosted: Docker image (standalone output) on a netcup VPS behind Cloudflare — no Vercel-only APIs anywhere (ADR-0005).
- `src/db/` — Drizzle schema + migrations (`drizzle/`, via `npm run db:generate|db:migrate|db:seed`). Core tables: `merchants` (tenants), `users`/`memberships`, `sources` (connector configs, encrypted creds), `products`, `variants`, `feed_runs`, `audit_findings`. Prices are integer minor units + ISO-4217; `availability` is the ACP enum. DB tests run against **PGlite** (in-process Postgres) via `src/db/test-db.ts` — no Docker needed.
- `src/connectors/` — one thin plugin interface (`fetchProducts()`, `watchInventory()`); implementations: CSV/XLSX upload → WooCommerce → BigCommerce → Magento → generic feed-URL importer. See ADR-0003.
- `src/feeds/` — canonical product model → per-surface feed renderers (ACP CSV/JSON, GMC, JSON-LD). Artifacts rendered to Cloudflare R2, served via signed CDN-cached URLs. See ADR-0004.
- `src/audit/` — rules engine → per-SKU + catalog agent-readiness score + findings.
- `src/enrichment/` — Claude batch enrichment, human-in-the-loop approve/apply. All Claude calls instrumented with OTel → Otterscope (`OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` locally).
- `src/inngest/` — durable jobs: sync cron, drift monitoring, enrichment batches.

The ACP feed spec (required fields, limits, enums) is captured in `docs/ROADMAP.md` §ACP and must be verified against live docs (developers.openai.com/commerce) whenever feed code changes — the spec moves.

## Pointers

- Working loop, quality gates, debt policy: `docs/WORKFLOW.md`
- Milestones + backlog philosophy: `docs/ROADMAP.md`
- Decisions: `docs/adr/`
- Org: github.com/shelfready · Domain: `useshelfready.com` (Cloudflare registrar + DNS + R2)
