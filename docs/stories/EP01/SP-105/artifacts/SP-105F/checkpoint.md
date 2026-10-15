# SP-105F checkpoint
Updated: 2026-10-15 (after queue reconciliation; before M1)
Status: in progress
Story: docs/stories/EP01/SP-105/SP-105F-password-reset-ip-limits.md
Review unit: SP-105 parent (docs/stories/EP01/SP-105/artifacts/SP-105/ implementation index) — child F
Role / scope: implementer; backend only. Shared PostgreSQL per-IP rolling-window admission for `POST /auth/forgot-password` (10/60s) and `POST /auth/reset-password` (30/60s): new `RecoveryRateLimitBucket` model + migration, `recovery-rate-limit.store.ts`, `recovery-rate-limit.guard.ts`, auth module/controller wiring, shared CORS options in `main.ts`. Exclude: A/B/E behavior, per-account cooldown (A), frontend (C/G), suites (H/I/J), sign-off (D).

## Repository state
- Workspace / branch: focus-app / `main` (ahead of origin by 17+; do not push without request)
- HEAD at last update: `80d97e3` (SP-105E queue advance) + this session's docs commit (F refinement + queue)
- Saved work: `docs/stories/EP01/SP-105/SP-105F-password-reset-ip-limits.md` (sized), `docs/stories/EP01/SP-105/README.md` (queue: Active F / Next G)
- Other work to preserve: A/B/E artifacts and code; planner commit `1461e65` conventions

## Progress
- [x] Refinement pass (refiner role, story file only): added sizing block (M1–M4, ~3–3.5h cohesive multi-window), Decisions F-D1–F-D5, out-of-scope list, deployment-topology grounding. No material user ambiguity — SD8 (2026-10-14 approval), PR-001 (retry contract, plan review pass 2 closed), and the mechanism were already settled.
- [x] Queue reconciled: F → In progress (Active), Next → G (refine/size).
- [x] Grounded mechanism facts: `DateTime[]` verified on the Prisma 7 `prisma-client` generator (scratch generate + tsc); canonical migration SQL from `prisma migrate diff --from-schema --to-schema`; `all-exceptions.filter.ts` never clears headers (Retry-After survives); guards run before `ValidationPipe`; `public-routes.ts` + `APP_GUARD` pass the two routes; `describeIntegration` self-skip pattern in `test-http.ts`; CI provides Postgres + `migrate deploy`; generated client is gitignored.
- [ ] M1: `RecoveryRateLimitBucket` in `prisma/schema.prisma` + `prisma/migrations/20261015060000_recovery_rate_limit_buckets/migration.sql` + `db:generate` + typecheck.
- [ ] M2: `recovery-rate-limit.store.ts` (admission: upsert → FOR UPDATE → `clock_timestamp()` → prune ≤ checkedAt−60s → admit/deny, delete-on-stale, bounded retry, fail-closed 503) + `recovery-rate-limit.store.spec.ts`.
- [ ] M3: `recovery-rate-limit.guard.ts` (endpoint from method+path, `req.ip` normalization, XFF inert, Retry-After before 429, sanitized 503) + spec + `@UseGuards` wiring in `auth.controller.ts` + providers in `auth.module.ts` + `src/common/cors.ts` + `main.ts` + `test-http.ts` CORS parity line.
- [ ] M4: `recovery-rate-limit.http.spec.ts` (describeIntegration; 429 envelope + Retry-After 1–60 + CORS exposedHeaders + seeded-window admission + endpoint independence + no email/token stored); local real-DB run via `docker compose up db` if available.
- [ ] Final: typecheck + lint + full test; `implementation.md`; queue F → Implemented — awaiting parent review; checkpoint complete.
- Current step: M1 (schema + migration).

## Decisions and dependencies
- Story Decisions F-D1–F-D5 (storage shape, admission protocol, IP resolution, 429/503 wire, migration/rollback) are the contract for this task.
- A/B implemented and unchanged; the limiter runs before their DTO/service logic and admitted requests keep their exact contracts (generic 200 / uniform 400).
- SP-103 (STUDY-12) integrated DoD 1/7/10 remains a feature/release gate only — it does not block F (F depends on A/B contracts + SP-102 wiring, all implemented).
- `apps/api/.env.local` is never read (secret file). Local real-DB runs use the compose dev DB (`docker compose up db`) with an explicit non-secret `DATABASE_URL` for the dev container.

## Verification
- Scratch `prisma generate` (v7.10.0) + `tsc --noEmit` on a `DateTime[]` model: accepted (`Date[]` output, `Date[] | string[]` input).
- Scratch `prisma migrate diff --from-schema --to-schema`: canonical SQL for the bucket table (`TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[]`, unique `(endpoint, normalizedIp)`).
- Baseline (E session): API typecheck clean; full suite 202 passed / 13 DB skips; lint 0 errors — re-verify after F.
- Not yet run: F's own suites (M2–M4).

## Resume next
1. Continue M1: edit `apps/api/prisma/schema.prisma` (add `RecoveryRateLimitBucket` after `PasswordResetToken`), write the migration file, `pnpm --filter @studypilot/api db:generate`, typecheck.
2. `pnpm --filter @studypilot/api typecheck && pnpm --filter @studypilot/api test recovery-rate-limit` (focused) and `pnpm --filter @studypilot/api test` (full).
- Read next: `prisma/schema.prisma`, `prisma/migrations/20261015000000_password_reset_tokens/migration.sql` (format precedent), `owner-lock.ts`, `password-reset.service.spec.ts` (fake-tx pattern), `test-http.ts`, `all-exceptions.filter.ts`.
