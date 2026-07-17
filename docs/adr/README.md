# Architecture Decision Records

One file per load-bearing decision, numbered, never edited after acceptance — superseded by a new ADR instead.

Template: **Context** (the forces), **Decision** (what we chose), **Consequences** (what it costs us, what it buys us, what would change our mind).

| # | Title | Status |
|---|-------|--------|
| [0001](0001-discovery-first-no-checkout-in-mvp.md) | Discovery-first: no checkout/settlement in the MVP | Accepted |
| [0002](0002-stack-and-hosting.md) | Stack & hosting: Next.js + Vercel + Neon/Drizzle + Inngest + R2 | Partly superseded by 0005 |
| [0003](0003-connector-plugin-interface.md) | Source connectors behind one thin plugin interface | Accepted |
| [0004](0004-feed-artifacts-on-object-storage.md) | Feed artifacts rendered to R2, served as signed CDN URLs | Accepted |
| [0005](0005-self-host-app-on-vps.md) | Self-host the app on a VPS (netcup) instead of Vercel | Accepted |
| [0006](0006-auth-authjs-v5.md) | Auth via Auth.js v5 (Drizzle adapter, database sessions) | Accepted |
| [0007](0007-billing-model.md) | Billing: flat SKU-count tiers, webhook-driven entitlements | Accepted |
| [0008](0008-self-hosted-postgres.md) | Self-hosted Postgres on the VPS instead of Neon | Accepted |
| [0009](0009-canonical-product-model.md) | Canonical product model (ACP superset, zod, issue-shaped validation) | Accepted |
