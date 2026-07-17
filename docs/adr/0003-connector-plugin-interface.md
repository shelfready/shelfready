# ADR-0003: Source connectors behind one thin plugin interface

Status: Accepted · 2026-07-17

## Context

Merchants live on WooCommerce, BigCommerce, Magento, and countless custom carts. Each platform's API differs, but ShelfReady's value (feeds, audit, enrichment, monitoring) operates on one canonical product model. Connector connectivity itself is commoditizing — the moat is what we do after ingest.

## Decision

Every source implements one thin interface — approximately `fetchProducts(): AsyncIterable<CanonicalProduct>` and `watchInventory()` for delta detection — so each platform is a plugin behind a registry. Build order:

1. **CSV/XLSX upload** — universal fallback, works for any cart, ships first.
2. **WooCommerce** REST (`wc/v3`).
3. **BigCommerce** Catalog API (post-MVP).
4. **Magento/Adobe Commerce** REST (post-MVP).
5. **Generic feed-URL importer** — re-map an existing Google/XML/CSV feed (post-MVP, covers custom carts cheaply).

Connector credentials are stored **encrypted at rest**, never logged, never client-visible.

## Consequences

- Adding a platform never touches feed/audit/enrichment code; the canonical model is the only contract.
- The canonical model must be a superset of what all target surfaces need (ACP + GMC + JSON-LD), defined in M1 with its own ADR.
- CSV-first means we can onboard *any* merchant before a single API connector exists — the free-audit funnel doesn't wait on connector coverage.
