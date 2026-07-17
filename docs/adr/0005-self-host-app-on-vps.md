# ADR-0005: Self-host the app on a VPS (netcup) instead of Vercel

Status: Accepted · 2026-07-17 · Supersedes the hosting portion of ADR-0002

## Context

ADR-0002 chose Vercel for app hosting. Kalin prefers hosting on a VPS he'll provision at netcup (decision 2026-07-17): fixed cost, full control, and consistent with how he already operates self-hosted services (Otterscope). Independently, ShelfReady's workloads favor a long-running process — feed rendering and large catalog syncs sit awkwardly inside serverless execution limits.

## Decision

- The app is a **standard self-hostable Next.js server** (`next start` / `output: "standalone"`): no Vercel-only APIs (no @vercel/blob, edge-runtime-specific features, etc.).
- **Deploy**: GitHub Actions builds a Docker image → GHCR → SSH deploy (`docker compose pull && docker compose up -d`) to the netcup VPS. TLS via Caddy (or a Cloudflare Tunnel); Cloudflare proxied DNS in front on `useshelfready.com`.
- **State stays managed**: Postgres on **Neon** (backups/PITR not hand-rolled), feed artifacts on **R2**, jobs on **Inngest Cloud** (it invokes the app's public `/api/inngest` endpoint — self-hosting the app doesn't change this).
- Staging = a second compose service (staging subdomain) on the same box. Per-PR preview deploys are dropped; CI remains the merge gate.
- The VPS is needed only when the deploy-pipeline issue is reached (end of M0); local dev + CI need nothing.

## Consequences

- Fixed monthly cost, no serverless timeout ceilings, one box to reason about; OS patching/uptime become our responsibility (small, and Kalin already carries this competency).
- Losing preview URLs slightly weakens PR review ergonomics; end-to-end verification before merge (WORKFLOW #5) compensates.
- If the box becomes a bottleneck or liability, the standalone Docker image redeploys anywhere (including back to Vercel) without code changes — that portability is the escape hatch.
