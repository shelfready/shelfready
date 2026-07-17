# ADR-0009: Canonical product model

Status: Accepted · 2026-07-17

## Context

Connectors (in) and feed renderers / audit / enrichment (out) need one contract so adding a platform never touches feed code and adding a surface never touches connector code (ADR-0003). The strictest surface is OpenAI ACP (ROADMAP §ACP: field lengths, availability enum, ISO-4217 currency, ISO-3166 countries, checksum-valid GTIN); Google Merchant Center and schema.org/Product are near-subsets of the same vocabulary.

## Decision

- **The canonical model is an ACP superset**, defined as zod schemas in `src/model/product.ts` (`CanonicalProduct` + nested `CanonicalVariant`), with per-field constraints taken from the spec snapshot: `externalId` ≤100 (becomes `item_id`), `title` ≤150, `description` plain text ≤5000, `brand` ≤70, HTTPS-only `url`/`imageUrl`, integer minor-unit price + ISO-4217 currency, the 5-value availability enum, GTIN 8/12/13/14 with GS1 checksum (`src/lib/gtin.ts`), `mpn`, and variant axes (`color`, `size`, `sizeSystem`, `gender`).
- **Validation returns data, not exceptions**: `validateProduct()` yields `{field, code, severity, message}` issues — the same shape as `audit_findings` rows, so M3's audit engine consumes connector validation output directly. Missing-but-recommended fields (gtin, brand, description quality) are `warning`s; spec violations are `error`s.
- **Vocabulary checks use the runtime's own tables, not hardcoded lists**: ISO-4217 via `Intl.supportedValuesOf("currency")`, ISO-3166 alpha-2 via `Intl.DisplayNames(..., {fallback: "none"})`.
- **Seller-level ACP fields (`seller_name`, `seller_url`, `target_countries`/`store_country`) live on the merchant, not the product** — they're constant per tenant and get attached at feed render time (M2). The per-product model stays source-shaped.
- **DB mapping is 1:1 with the existing `products`/`variants` tables** (no migration): the canonical model is the validated view of a row; unknown source attributes ride in the JSONB `attributes` escape hatch until a surface needs them.

## Consequences

- Connector authors target one zod schema and get spec-grade validation for free; feed renderers can assume validated input and only add surface-specific formatting.
- Audit (M3) starts from these issues instead of re-deriving field checks — one source of truth for what "compliant" means.
- Spec drift (ACP moves) is contained to `src/model/product.ts` + the ADR/ROADMAP snapshot; verify against live docs whenever feed code changes.
- Intl-based vocabularies depend on the Node ICU build (full-icu in Node 22 official builds and our Docker image) — a smaller ICU would weaken validation, so the Dockerfile must keep the stock `node:22` base.
