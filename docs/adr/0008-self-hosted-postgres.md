# ADR-0008: Self-hosted Postgres on the VPS instead of Neon

Status: Accepted · 2026-07-17 · Supersedes the managed-DB portion of ADR-0002/ADR-0005

## Context

ADR-0002/0005 kept Postgres on Neon mainly for managed backups/PITR. Kalin's call (2026-07-17): the netcup VPS has the headroom, and the project should self-host what it reasonably can rather than accumulate managed-service spend. With the app already deployed as a compose stack on the box (ADR-0005), a colocated Postgres removes the last paid dependency (running costs become VPS + domain) and takes DB latency to ~zero.

## Decision

- **Postgres 17 runs as a container in the same compose stack** (`postgres:17-alpine`, named volume, healthcheck) — pinned, portable, and rolled back with the same mechanics as the app. Chosen over a bare `apt` install so the whole deployment remains one declarative stack.
- The DB is **never exposed publicly**: app and migrations reach it over the compose network only.
- **Migrations run on the box, not from CI**: the Docker build publishes a second `migrate` image (builder stage: full deps + drizzle files); deploy runs `docker compose --profile ops run --rm migrate` before `up -d`. CI holds no database credentials at all.
- **Backups are now our responsibility** (the real price of leaving Neon): a `backup` sidecar takes a daily `pg_dump -Fc` with 14-day retention on the box; **offsite copies to Cloudflare R2 are a tracked pre-launch requirement** (issue #37) — a box-local backup does not survive the box.
- Local development is unchanged (PGlite; no Docker needed).

## Consequences

- Zero managed-DB cost and no vendor coupling; one box, one stack, one `.env`.
- We lose PITR granularity (daily dumps, not WAL streaming) — acceptable pre-launch; revisit with `wal-g` to R2 if merchant data makes RPO hours matter.
- DB capacity is coupled to the app box; if it outgrows the VPS, the compose service moves to its own host by changing `DATABASE_URL`.
- Restores must actually be exercised — the offsite-backup issue includes a restore drill as acceptance criteria.
