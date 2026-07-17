# ADR-0004: Feed artifacts rendered to R2, served as signed CDN URLs

Status: Accepted · 2026-07-17

## Context

Hosted feeds are the product's public surface: AI-surface crawlers and Merchant Center fetch them repeatedly, but content changes only when a sync/enrichment run completes. Rendering feeds per-request from Postgres would be slow, expensive, and would couple public availability to app/database uptime.

## Decision

Feeds are **rendered to Cloudflare R2 at sync time** (one artifact per merchant × surface × format, e.g. `acp.csv`, `acp.json`, `gmc.xml`, `jsonld.json`) and served as **signed, CDN-cached URLs** on the Cloudflare account that already holds `useshelfready.com` DNS. A `feed_runs` row records each render (source snapshot, artifact keys, validation result). Regeneration happens on sync, enrichment apply, or manual trigger — never on read.

## Consequences

- Feed reads scale with Cloudflare's CDN, cost ~nothing, and stay up even when the app or DB is down.
- Consumers see eventually-fresh feeds (as fresh as the last run) — acceptable because freshness is governed by our own sync cadence, which M5 monitors and alerts on.
- Signed URLs let us rotate/revoke a merchant's feed on churn without moving the artifact.
- Everything (DNS, CDN, storage) sits in one Cloudflare account — one bill, one console.
