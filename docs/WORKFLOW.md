# WORKFLOW.md — how work happens here

Work is **issue-driven and continuous**. "go" means: pull `main`, read `CLAUDE.md` + this file, find the earliest open milestone, pick the lowest-numbered unblocked issue, execute it end-to-end to a merged CI-green PR, then continue to the next — until genuinely blocked on something only Kalin can do, or the milestone is empty. Don't stop at natural checkpoints to ask permission.

## Per-issue loop (every issue, no exceptions)

1. **Work only from a GitHub issue.** Unplanned work → file an issue first (problem, acceptance criteria, milestone), then work it.
2. **Post a short plan as an issue comment before coding**: approach, files touched, how it will be verified. If the plan includes a hack, say so and file the follow-up `debt` issue *before* merging.
3. **Branch per issue**: `feat/<n>-slug` or `fix/<n>-slug` off `main`. `main` stays green and releasable, always.
4. **Tests are part of the change**, not a follow-up:
   - New behavior → test proving it.
   - Bug fix → regression test that fails without the fix.
   - Multi-tenant code → test that tenant A can never read/write tenant B's data.
   - Feed engine → generated feeds validated against the spec's required fields and rules.
5. **Verify end-to-end before merging** — build and actually exercise the change (generate a real feed and validate it, run the audit on a sample catalog, drive the UI). Record it in the PR body ("Verified: …"). Never merge on tests alone.
6. **Quality gate**: build + eslint + tsc + tests pass locally **and** in CI.
7. **Paper trail in the same PR**: ADR for any architectural decision; `docs/ROADMAP.md` on scope shifts; `CLAUDE.md` when the architecture map changes; README on user-facing changes.
8. **PR → wait for CI green → squash-merge** (`Closes #N`), delete the branch. Never merge on a red or pending check. When gating on `gh pr checks --watch`, use `set -o pipefail` so a piped exit code can't be masked. Re-run a failed job before assuming a code bug (CI flakes happen) — but never merge red.
9. **Keep `main` green.** A post-merge CI failure preempts all other work.
10. **Recorded-debt policy**: debt is allowed only when recorded — a `debt` issue linked from a `// TODO(#issue):` comment at the site. Bare TODOs fail review.
11. **Cut a release** (`vX.Y.Z` tag + GitHub release) at milestone boundaries.

## Conventions

- Match surrounding code style. Minimal dependencies — justify each new one in the commit message.
- Commit messages end with `Co-Authored-By: Claude <noreply@anthropic.com>`; PR bodies end with the standard Claude Code attribution.
- Labels: `feature` / `bug` / `debt` + area labels (`feed`, `audit`, `connector`, `enrichment`, `billing`, `monitoring`, `infra`, `docs`).
- Temp files go to the session scratchpad, never the repo.

## Guardrails that override everything

- No checkout/payment-settlement code without Kalin's explicit go (ADR-0001).
- Stripe test mode only until Kalin's explicit go.
- Production deploys, live payments, public announcements: explicit go each time.
- Connector credentials encrypted at rest; secrets never in repo/client.
