# ADR-0001: Discovery-first — no checkout/settlement in the MVP

Status: Accepted · 2026-07-17

## Context

Agentic-commerce rails standardized through 2026: OpenAI+Stripe shipped ACP (Apache-2.0, API version `2025-09-12`), Google announced the Universal Commerce Protocol (NRF, 2026-01-11), Perplexity made Buy-with-Pro free for US users (Feb 2026). But on **2026-03-24 OpenAI publicly pulled back from native in-ChatGPT Instant Checkout** — Walmart measured ~3× worse conversion in-chat than click-through to their own site, and only ~30 merchants were live — and re-prioritized **product discovery**: surface in the AI, buy on the merchant's own site.

Checkout hosting means ACP checkout endpoints, Shared Payment Token settlement, and merchant-of-record exposure: tax, fraud, refunds, chargebacks. That is heavy liability for a solo-built SaaS, and the platform that defined the rail has itself deprioritized it.

Meanwhile Shopify auto-enrolled its merchants into agentic storefronts (Spring 2026); the long tail (WooCommerce, BigCommerce, Magento, custom carts) has no path to compliant feeds, structured data, or freshness guarantees.

## Decision

The MVP is **discovery-only**: spec-compliant multi-surface feeds + agent-readiness audit + Claude enrichment + freshness monitoring. In ACP feeds we set `is_eligible_checkout: false` and omit checkout-only fields (`seller_privacy_policy`, `seller_tos`).

The checkout-endpoint + Shared-Payment-Token settlement module is **out of scope** until (a) post-launch, (b) demand is proven, and (c) Kalin gives an explicit go. No settlement code is written, scaffolded, or wired before that.

## Consequences

- We avoid all money-movement liability and the compliance surface that comes with it; the whole MVP is buildable and operable solo.
- Our value does not depend on OpenAI's gated merchant-approval funnel — feeds, audit, JSON-LD, and GMC compliance are useful regardless of any single platform's gate. Marketing must promise "compliant, discoverable, fresh", never "we get you into ChatGPT".
- If the market swings back to native checkout, we start behind; mitigated by keeping the canonical model a superset that already carries checkout-adjacent fields, so the module is an add-on, not a rewrite.
- Revisit if: OpenAI re-launches Instant Checkout with materially better conversion, or paying merchants ask for hosted checkout and accept the terms.
