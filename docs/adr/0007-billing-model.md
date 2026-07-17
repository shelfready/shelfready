# ADR-0007: Billing — flat SKU-count tiers, webhook-driven entitlements

Status: Accepted · 2026-07-17

## Context

Feedonomics-style quote-based pricing is exactly what the target segment (SMB long tail) hates; per-usage metering (per-SKU, per-render) is unpredictable for merchants and complex to build. Catalog size is the honest cost driver (ingest, rendering, enrichment tokens, monitoring fetches) and merchants know their own SKU count.

## Decision

- **Flat monthly tiers by SKU cap**: Free (25), Starter $29 (500), Growth $79 (5,000), Scale $199 (50,000) — placeholder prices, finalized in M6; agency/white-label ($1k+) added later.
- Stripe Checkout + Customer Portal; subscription state flows **only** through verified webhooks into `merchants.plan` + a denormalized `entitlements` JSONB (maxSkus + feature flags) — app code reads entitlements, never Stripe, at request time.
- Idempotency via a `stripe_events` processed-ids table; replayed deliveries are no-ops.
- Tier→feature mapping lives in `src/billing/plans.ts` (`entitlementsFor`), one place to change.
- **Test mode enforced in code**: `getStripe()` refuses non-test keys until launch is explicitly approved (WORKFLOW guardrail).

## Consequences

- Predictable pricing merchants can self-select into; no metering infrastructure.
- Entitlement reads are local and fast; the cost is eventual consistency with Stripe (bounded by webhook delivery, acceptable).
- Oversized catalogs are gated by `maxSkus` at ingest time (enforced when M1 lands ingest).
- If real costs later diverge from SKU count (e.g. enrichment token burn), add usage-based add-ons in a new ADR rather than abandoning flat tiers.
