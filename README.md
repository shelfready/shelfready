# ShelfReady

**Make any store that isn't on Shopify shoppable and discoverable by AI shopping agents.**

Point ShelfReady at a merchant's catalog and it:

1. **Emits spec-compliant, always-fresh product feeds** for every AI shopping surface — OpenAI's Agentic Commerce Protocol (ACP), Google Merchant Center, Perplexity — plus injectable schema.org/Product JSON-LD.
2. **Runs a continuous agent-readiness audit** — a per-SKU and whole-catalog score with a prioritized fix-list (missing/invalid GTINs, thin descriptions, missing structured markup, stale inventory).
3. **Fixes the catalog with Claude** — generates/expands descriptions, infers attributes (color/size/material/category), normalizes titles to spec, flags likely-invalid GTINs. Human-approved before anything is applied.
4. **Monitors freshness** — re-syncs on a schedule and alerts on price/inventory drift between the feed and the live product page.

Shopify auto-enrolled its merchants into agentic storefronts; the entire long tail — WooCommerce, BigCommerce, Magento, custom carts — got nothing. ShelfReady is for them.

> **Positioning honesty:** AI-surface merchant onboarding (e.g. OpenAI's) is gated by those platforms. ShelfReady makes your catalog compliant, discoverable, and fresh across AI surfaces — it does not control any platform's approval process.

## Status

Pre-release, under active development. See [docs/ROADMAP.md](docs/ROADMAP.md) for milestones and [issues](https://github.com/shelfready/shelfready/issues) for current work.

## Stack

TypeScript on Node 22 · Next.js (App Router), self-hosted in Docker on a VPS behind Cloudflare · Postgres (Neon) + Drizzle ORM · Upstash Redis · Inngest (jobs/cron) · Cloudflare R2 + CDN for hosted feed artifacts · Stripe (billing) · Anthropic Claude (enrichment + audit).

Observability for server-side Claude calls is via [Otterscope](https://github.com/otterscope) (self-hosted OpenTelemetry agent-run tracing).

## Development

```sh
npm install
npm run db:dev     # local Postgres (PGlite behind a pg-wire socket, no Docker)
npm run dev        # Next.js dev server (DATABASE_URL=postgres://postgres@localhost:5433/postgres)
npm run build      # production build
npm run lint       # eslint + tsc
npm test           # vitest
```

Background jobs run on [Inngest](https://www.inngest.com). Locally: `npx inngest-cli dev -u http://localhost:3112/api/inngest` (with `INNGEST_DEV=1` set for the app) and open http://localhost:8288 to inspect/trigger functions. Database migrations: `npm run db:generate` / `db:migrate` / `db:seed`.

Contribution flow, quality gates, and working agreements: [docs/WORKFLOW.md](docs/WORKFLOW.md). Architectural decisions: [docs/adr/](docs/adr/).
