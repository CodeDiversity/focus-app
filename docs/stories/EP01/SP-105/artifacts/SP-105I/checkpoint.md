# SP-105I checkpoint

Updated: 2026-10-16 (M1–M3 complete)
Status: implementation complete — awaiting parent review
Story: docs/stories/EP01/SP-105/SP-105I-credential-race-tests.md
Review unit: SP-105 parent (`docs/stories/EP01/SP-105/artifacts/SP-105/` implementation index) — child I
Role / scope: implementer; integration tests only. Outcome: one real-PostgreSQL Jest suite (`apps/api/src/modules/auth/password-reset.integration.spec.ts`) proving single-use redemption, cross-operation ordering, expiry-after-wait, rollback and post-reset session outcomes, using H's fixtures/barriers. Excludes: limiter tests (J), harness changes (H), HTTP/cookie wiring (B), browser/SMTP/sign-off and parent index (D), any production code.

## Repository state
- Workspace / branch: focus-app, `main`
- HEAD at last update: efc6cbb (test(auth): add guarded PostgreSQL recovery harness)
- Saved work: committed as `94ec3f0` (spec + I artifacts + queue/story updates); H's durable docs saved as `db5360f`; no production files touched
- Other work to preserve (pre-existing, not mine): H's uncommitted docs — `docs/stories/EP01/SP-105/SP-105H-postgres-test-harness.md`, `artifacts/SP-105H/checkpoint.md`, untracked `artifacts/SP-105H/implementation.md` — committed separately as H's durable record.

## Progress
- [x] Reconciliation: ticket refined/implementation-ready (sizing + decisions I1–I5); README row was stale. Queue now points at I; after I, J is next.
- [x] Checkpoint 1 — foundation + redemption races (AC1): service/stub/seed/barrier helpers, same-token and distinct-token one-winner cases, cross-owner isolation. Green.
- [x] Checkpoint 2 — ordering (AC2): sequenced issuance/redemption both ways, reset-first login, login-first family revocation, concurrent issuance/redemption, concurrent login/reset, concurrent eligible issuance/issuance and refresh/reset. Green.
- [x] Checkpoint 3 — expiry/rollback/post-reset (AC3): expiry-across-lock-wait, throwing-decorator rollback, new-password login + old-password/prior-family rejection, SD7 access-JWT window. Green.
- [x] Full `test:integration` (2 suites / 18 tests, zero skips), ordinary `test` (20 suites / 237 passed), `typecheck`, focused read-only ESLint, `git diff --check`. All green.
- **Complete.** Child is `implementation complete — awaiting parent review`; no child-level reviewer (cadence: one combined SP-105 parent review).

## Decisions and dependencies
- I1–I5 honored (one cohesive suite; service-level; throwing-decorator rollback; owner-lock barriers with no sleeps; SD7 `exp - iat`).
- Contender barrier: `pg_blocking_pids` reports the lock-group leader for queued waiters, so the helper counts the **transitive** set blocked by the held owner pid (recursive CTE). This replaces H's `waitUntilBlocked` for service-call contenders (a service call exposes no pid); H's harness is unchanged.
- Two AC2 categories named in the ticket prose ("eligible issuance/issuance", "refresh/reset") were not separate rows in the Tests table; added as `eligible concurrent issuance issues a single live token` and `refresh before reset has its successor family revoked` so AC2 is fully covered.
- `forgotPassword` retires prior unused tokens, so the distinct-token race seeds a second valid token directly as a `passwordResetToken` row.

## Verification
- Disposable PostgreSQL 15.19 container (`sp105i_pg`, ephemeral `--rm`); `prisma migrate deploy` applied all six migrations to `study_test`.
- `pnpm --filter @studypilot/api run test:integration --runInBand` → **2 suites / 18 tests passed, 0 skipped** (H 3 + I 15).
- `pnpm --filter @studypilot/api run test --runInBand` → 20 suites / 237 passed, 2 suites / 18 already skipped (baseline unchanged; new file excluded from ordinary discovery).
- `pnpm --filter @studypilot/api typecheck` → clean.
- `pnpm --filter @studypilot/api exec eslint src/modules/auth/password-reset.integration.spec.ts --max-warnings=0` → clean.
- `jest --listTests` → new file absent from ordinary discovery, present under the `test:integration` regex.

## Resume next
- **Nothing — the child is complete.** Full outcome and DoD 9 documentation are in `implementation.md`; queue holds I as `Implemented — awaiting parent review`.
- Next queue task: SP-105J → refine (grounded against the H helper contract and the I suite's barrier approach), then implement.
- If a parent review finding requires a fix, resume here in the same implementation ownership; parent artifacts live at `artifacts/SP-105/`.
