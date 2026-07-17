# ADR-0006: Auth via Auth.js v5 (Drizzle adapter, database sessions)

Status: Accepted · 2026-07-17

## Context

Self-serve merchant signup needs auth. Candidates: Clerk (fastest, but a paid vendor holding our user table), Lucia-style hand-rolled sessions (max control, most code to own), Auth.js v5 (free, self-hosted, first-party Drizzle adapter, providers for both OAuth and magic links).

## Decision

**Auth.js v5** with the Drizzle adapter and **database sessions** in our own Postgres:

- Providers: **email magic link** (merchant-friendly; dev transport logs the URL, real transport is recorded debt #30) and **GitHub OAuth** (registered only when env credentials exist).
- First sign-in provisions a personal merchant + `owner` membership (`provisionNewUser`), so every session has a tenant from the first moment — no "orgless" state.
- Session callback exposes `activeMerchant` (id, role, name, slug); pages/handlers guard with `requireMerchant()` server-side. No edge middleware — database sessions are checked where the data lives (fits the single-VPS deploy, ADR-0005).

## Consequences

- Zero vendor cost/lock-in; users, accounts, sessions live in our schema and migrations.
- We own security-sensitive surface (session handling) — mitigated by using the maintained library defaults, not custom crypto.
- Database sessions cost a DB read per request; irrelevant at our scale, revisit with a cache if it ever shows up.
- Multi-org membership and an org switcher are schema-ready (`memberships` is many-to-many); UI comes later.
