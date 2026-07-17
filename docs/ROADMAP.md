# ROADMAP.md — ShelfReady milestones

Discovery-first (ADR-0001): the MVP is feeds + audit + enrichment + freshness monitoring. Checkout/settlement is post-launch, optional, and gated on Kalin's explicit go.

M0 and M1 are fully detailed as issues with acceptance criteria; later milestones stay headline-level and get fleshed out as we reach them.

## M0 — Foundation

Repo + org, CI (build/lint/test on every push + PR), `CLAUDE.md`, `docs/WORKFLOW.md`, this roadmap, first ADRs, Next.js + Postgres + Drizzle skeleton, auth, DB schema (merchants/sources/products/variants/feed_runs/audit_findings), Stripe billing scaffold (test mode), deploy pipeline. **Exit: the app boots, CI is green, a release `v0.1.0` is tagged.**

## M1 — Ingest

CSV/XLSX upload + WooCommerce connector → canonical product model + validation. Multi-tenant isolation proven by tests (merchant A can never read/write merchant B's catalog). **Exit: a real WooCommerce store and a CSV both import into the canonical model.**

## M2 — Feed engine

Canonical model → hosted **OpenAI ACP feed** (CSV + JSON) + **Google Merchant Center** feed + **schema.org/Product JSON-LD** snippet generator. Public signed, CDN-cached feed URLs off Cloudflare R2 (ADR-0004). Feeds validated against spec required fields in tests.

## M3 — Audit

Rules engine → agent-readiness score (per-SKU + catalog) + prioritized findings dashboard. Checks: GTIN validity (checksum), attribute completeness, schema presence, freshness, policy fields.

## M4 — Claude enrichment

Description generation, attribute inference, title normalization, GTIN sanity — human-in-the-loop approve/apply, batched + cached. All calls OTel-instrumented → Otterscope.

## M5 — Freshness

Scheduled re-sync (Inngest cron) + price/inventory drift detection vs the live product page + email alerts.

## M6 — Monetize & launch

Stripe tiers by SKU count ($29–199/mo flat; agency/white-label $1k+), onboarding, the **free instant-audit acquisition hook** (paste store URL → score), marketing landing page on `useshelfready.com`, self-serve signup, deploy. **Launch and any live-payment switch are gated on Kalin's explicit go-ahead.**

## M7+ — Post-launch (each item gated on Kalin's go)

BigCommerce + Magento connectors; generic feed-URL importer; **optional ACP checkout-endpoint + Shared-Payment-Token settlement module** as a premium add-on (real money / tax / fraud / merchant-of-record liability — do NOT build without explicit go).

---

## §ACP — feed spec snapshot (verify against live docs before building on it)

Sources: developers.openai.com/commerce · docs.stripe.com/agentic-commerce/acp · github.com/agentic-commerce-protocol. API version header `2025-09-12`. Formats: CSV/TSV/XML/JSON.

**Required per SKU:** `is_eligible_search` (bool, gates discovery), `is_eligible_checkout` (bool), `item_id` (≤100 chars, stable), `title` (≤150), `description` (plain text ≤5,000), `url` (HTTPS, resolves 200), `brand` (≤70), `image_url` (HTTPS JPEG/PNG), `price` + ISO-4217 currency, `availability` ∈ `in_stock|out_of_stock|pre_order|backorder|unknown`, `seller_name`, `seller_url`, `target_countries`/`store_country` (ISO-3166 alpha-2).

**Strongly recommended:** `gtin` (8–14 digits, checksum-valid — ~60% of catalogs fail this; #1 audit finding), `mpn`, variant fields (`group_id`, `color`, `size`, `size_system`, `gender`).

**Checkout-only (deferred with ADR-0001):** `seller_privacy_policy`, `seller_tos`.

**Intraday deltas:** Feeds/Products/Promotions APIs — headers `Authorization`, `Idempotency-Key`, `API-Version: 2025-09-12`, `Timestamp` (RFC-3339).

**Google (durable requirement):** valid Merchant Center feed + on-page schema.org/Product JSON-LD + GTIN.
