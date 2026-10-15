# SP-105F checkpoint
Updated: 2026-10-15 (implementation complete)
Status: implementation complete — awaiting parent review
Story: docs/stories/EP01/SP-105/SP-105F-password-reset-ip-limits.md
Review unit: SP-105 parent (docs/stories/EP01/SP-105/artifacts/SP-105/ implementation index) — child F
Role / scope: implementer; backend only. Shared PostgreSQL per-IP rolling-window admission for `POST /auth/forgot-password` (10/60s) and `POST /auth/reset-password` (30/60s): new `RecoveryRateLimitBucket` model + migration, `recovery-rate-limit.store.ts`, `recovery-rate-limit.guard.ts`, auth module/controller wiring, shared CORS options in `main.ts`. Exclude: A/B/E behavior, per-account cooldown (A), frontend (C/G), suites (H/I/J), sign-off (D).

## Repository state
- Workspace / branch: focus-app / `main` (ahead of origin; do not push without request)
- HEAD at last update: `b3777e8` (M4: real-DB HTTP spec + controller-spec guard provider + store-spec helper), on top of `64d7b76` (docs/queue), `2e8b85d` (M1), `c5fe2d4` (M2), `f671b85` (M3)
- Saved work: `docs/stories/EP01/SP-105/artifacts/SP-105F/implementation.md` (new), this checkpoint, README queue update, SP-105F story status line
- Other work to preserve: A/B/E artifacts and code; all F production code is committed

## Progress
- [x] Refinement pass (story file): sizing block M1–M4, Decisions F-D1–F-D5, out-of-scope list, deployment-topology grounding.
- [x] M1: `RecoveryRateLimitBucket` in `prisma/schema.prisma` + `prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql` (verbatim `prisma migrate diff --from-schema --to-schema`) + client generate + typecheck. (`2e8b85d`)
- [x] M2: `recovery-rate-limit.store.ts` (upsert → `FOR UPDATE` → `clock_timestamp()` → prune ≤ checkedAt−60s → admit/deny, delete-on-stale, bounded retry, fail-closed 503) + `recovery-rate-limit.store.spec.ts` (18 tests). (`c5fe2d4`)
- [x] M3: `recovery-rate-limit.guard.ts` (endpoint from method+path, `req.ip` normalization, XFF inert, `Retry-After` before 429, sanitized 503) + spec (17 tests) + `@UseGuards` in `auth.controller.ts` + providers in `auth.module.ts` + `src/common/cors.ts` + `main.ts` + `test-http.ts` CORS parity. (`f671b85`)
- [x] M4: `recovery-rate-limit.http.spec.ts` (5 real-DB tests; `describeIntegration` self-skip) + full verification. (`b3777e8`)
- [x] Final: typecheck + lint + full suite (with and without `DATABASE_URL`); `implementation.md` written; queue F → Implemented — awaiting parent review; Active cleared.
- Current step: done.

Note: the one failing HTTP assertion (`access-control-credentials` undefined on the 429) was root-caused as a **test-key typo** — the header is `access-control-allow-credentials` (the production CORS behavior was verified correct by direct wire probe first). Corrected in `b3777e8`; see implementation.md "Review corrections". Also fixed the `auth.controller.spec.ts` manual module (now supplies the guard's store) and a false cors comment.

## Decisions and dependencies
- Story Decisions F-D1–F-D5 were the contract; all shipped. One documented refinement: Nest 10.4 has no `TooManyRequestsException`, so the 429 is an explicit `HttpException` payload (same standard wire shape).
- A/B implemented and unchanged; the limiter runs before their DTO/service logic and admitted requests keep their exact contracts (generic 200 / uniform 400).
- SP-103 (STUDY-12) integrated DoD 1/7/10 remains a feature/release gate only — does not block F or G.

## Verification
- `pnpm --filter @studypilot/api typecheck` → clean.
- `pnpm --filter @studypilot/api test` with `DATABASE_URL` (ephemeral Postgres 15 container on 127.0.0.1:5433; user's brew DB on 5432 untouched; 6 migrations applied) → **22 suites, 255 passed, 0 failed, 0 skipped** (E baseline: 202 passed + 13 skips; F adds 40).
- `pnpm --filter @studypilot/api test` without `DATABASE_URL` → 20 of 22 suites, 237 passed, 18 skipped (two integration suites self-skip — local dev contract intact).
- `pnpm --filter @studypilot/api lint` → 0 errors (1 pre-existing `no-console` warning in `main.ts`, out of scope).
- `prisma migrate deploy` on the fresh container → clean.
- Real 429 wire probe: `Retry-After: 60` + `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true` + `Access-Control-Expose-Headers: Retry-After` all present on the filtered 429.

## Resume next
- F is implemented and committed; hold for the combined SP-105 parent review (DoD 10). Real multi-instance race proof is SP-105J (needs H); browser/SMTP sign-off is SP-105D.
- Next actionable row: **G** (Needs refinement — refine/size the shared recovery-session client against the settled A/B/F contracts before C). Do not start G without the single-story authorization.
