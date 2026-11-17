# EP14B implementation record

**Story:** [EP14B — API Contract Integrity](../../EP14B-api-contract-integrity.md)
**Status:** Implemented — awaiting parent review (one AC clause open: F-EP14B-02; R-EP14-06 fixed — awaiting re-review)
**Date:** 2026-11-16
**Commit scope:** `apps/api/src/{main.ts, test/test-http.ts}` (D-B1a), the two gated specs' seeders + bag-survival spec (D-B2/D-B3), new `src/modules/validation-strictness-e2e.spec.ts`, fix round: `src/common/pipes/validation-pipe-options{,.spec}.ts` + the spec-local pipe copies (see below), momentum `week.days` (API domain/types/specs; web types, `momentumCopy.ts`, `MomentumWeekStrip.tsx` + fixtures), `docs/stories/EP13/contracts.md` momentum row, `ProfilePage.test.tsx` (F-EP14B-01), this record, story/queue rows, `efficiency.md`.

Decisions applied: D-B1…D-B4 as ratified by the user (2026-11-16).

## AC-by-AC outcome

| AC | Outcome | Evidence |
|---|---|---|
| EP14B-AC1 — wrong-typed body → field-level 400; numeric query params still parse | **Done.** `enableImplicitConversion: false` in `main.ts` and its test mirror; the only numeric query fields (`limit`/`offset`) already carry explicit `@Transform(Number)` (plan-review verified), so no query DTO changed. | `validation-strictness-e2e.spec.ts` (gated, 3 tests: `locked: "yes"/1/"true"` → 400 with `errors.locked`, row unchanged; `plannedMinutes: "25"` → 400; `?limit=10` → 200, `?limit=abc` → 400) |
| EP14B-AC2 — gated run zero failures + first fully green CI run linked | **Partially met.** Zero failures locally: fresh DB, `prisma migrate deploy`, `npx jest --runInBand` (apps/api) → **1584 passed, 0 failed, 79 suites** (first zero-failure gated run in this chain). In CI, run [43910951890](https://github.com/CodeDiversity/focus-app/actions/runs/43910951890) (proof commit `c360e2d`, content-identical code): **Run backend tests ✔** (gated suites, single-worker), **Run frontend tests ✔**, lint/migrations/recovery ✔ — but the job is **not fully green**: the final **Secret scan** step fails (F-EP14B-02). The "fully green" clause is therefore open. | run link; local command above |
| EP14B-AC3 — `week.days` server-owned; client does no date math | **Done.** `computeMomentum` emits seven Monday-first civil dates; `MomentumWeekStrip` and `studiedOnSentence` map `week.days`; `weekDates` deleted (closes F-EP13K-01); `contracts.md` documents the field. | `momentum.spec.ts` (month-boundary case), `study-sessions-momentum.service.spec.ts` (payload pin), `momentumCopy.test.ts` guard (module exports no date helper); all seven E2E journeys green on the new payload (16.9s, local) |

## Verification (2026-11-16)

- API: `npx jest` → 1105 passed / 0 failed (479 gated skipped); gated run above 1584/0; lint, `tsc --noEmit` clean.
- Web: `pnpm test` → 1264/0 (local zone) **and** `TZ=UTC pnpm test` → 1264/0; ProfilePage suite green under UTC, America/New_York, Pacific/Auckland, Asia/Kolkata; lint, typecheck clean.
- E2E: `npx playwright test e2e/adaptive-scheduling.spec.ts` → 7/7.
- CI proof runs (scratch branches, deleted after): `beb7ba8` run 43909524524 — backend ✔, frontend ✘ (revealed F-EP14B-01); `c360e2d` run 43910951890 — backend ✔, frontend ✔, Secret scan ✘.

## Findings

| ID | Source / paths | Issue | Disposition | Owner |
|---|---|---|---|---|
| F-EP14B-01 | `apps/web/src/pages/profile/ui/ProfilePage.test.tsx` (SP-106C) | The zone-ordering test depended on the machine's time zone: on a UTC machine (CI) the browser zone `UTC` is absent from the runtime list, so the page correctly prepends it as an alias (IR-106-15c) and `values[0]` was `UTC`. Latent for weeks because `main`'s CI died at the backend step before ever reaching frontend tests. | **Fixed** — the test seeds a canonical stored zone; verified under four TZs and in CI. | — |
| F-EP14B-02 | CI step "Secret scan" (`gitleaks detect --redact`) | Fails at `c360e2d`. Also latent: on `main` the job never reached this step. Anonymous log access is 403 and running gitleaks locally was not permitted in-session, so the flagged item is **unconfirmed**. Location-only candidates from a keyword/entropy grep: `.env.example:9`, `apps/api/.env.example:5` — tracked templates unchanged since 2026-10-13 (pre-EP13), deliberately **not opened** (security rule: never read `.env.*`). Weakening or allowlisting the scan was not considered. | **Open — needs the user**: read the run log (signed in) or authorize a local gitleaks run; then fix the real item or add a reviewed, narrowly-scoped allowlist for a known placeholder. | user |

## Deviations

1. **F-EP14B-01 fixed inside EP14B** — outside the story's named scope, but EP14B-AC2's CI clause could not be met without it; test-only, one fixture line.
2. **Proof commits via a temporary index** (the delivery branch was never moved); scratch branches deleted after the runs.

## Fix round (R-EP14-06) — 2026-11-16

**Finding:** [review.md](../EP14/review.md) R-EP14-06 (should-fix) — EP14B-AC1's named unit test ("the pipe options pinned in `test-http.ts` equal `main.ts`") did not exist, and spec-local pipe copies still carried `enableImplicitConversion: true`. **Disposition: fixed — awaiting re-review.**

**What changed (preferred closure: one shared constant + a pinning spec):**

- New `apps/api/src/common/pipes/validation-pipe-options.ts` — `FIELD_VALIDATION_PIPE_OPTIONS` (frozen `ValidationPipeOptions`: `whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions.enableImplicitConversion: false`), carrying the D-B1a / R-EP13-03 rationale that was duplicated in two comment blocks.
- `apps/api/src/main.ts` and `apps/api/src/test/test-http.ts` now `new FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS)` — parity by construction; no inline literal remains in either file.
- New `apps/api/src/common/pipes/validation-pipe-options.spec.ts` (5 tests, no DB): deep-equals the constant to the strict policy; asserts it is frozen; asserts `FieldValidationPipe` adopts it unchanged (`validatorOptions`, `transformOptions`, `isTransformEnabled`); and reads `main.ts` + `test/test-http.ts` as source to assert each imports the constant, constructs the pipe from it, and contains no `enableImplicitConversion:` literal or `new …ValidationPipe({` — so re-inlining in either file fails the suite.
- Spec-local copies aligned to production (all import the constant; no "intentionally differs" comment was needed — none exercised coercion): `assignments.service.spec.ts` (4 × `new FieldValidationPipe(...)`), `auth.controller.spec.ts` (stock `ValidationPipe` → `FieldValidationPipe(FIELD_VALIDATION_PIPE_OPTIONS)`), `study-plans-recovery-catch-up.service.spec.ts` (6 × `plainToInstance(..., FIELD_VALIDATION_PIPE_OPTIONS.transformOptions)`; its "runs with `enableImplicitConversion`" comment corrected — nested descent comes from `@Type`). Also aligned, beyond the finding's named list because their comment claimed to "mirror main.ts" and would otherwise be false: the five `modules/auth/dto/*.dto.spec.ts` (string-only DTOs; same one-line change).

**Verification (cwd `apps/api`, tested state = this commit's content):**

- Touched suites: `npx jest src/common/pipes src/modules/assignments/assignments.service.spec.ts src/modules/auth/auth.controller.spec.ts src/modules/auth/dto src/modules/study-plans/study-plans-recovery-catch-up.service.spec.ts` → **10 suites, 381 passed, 0 failed**.
- Ungated: `npx jest` → **52 of 80 suites, 1146 passed, 0 failed** (484 gated skipped).
- Gated: `createdb postgres_fix_oak`; `DATABASE_URL=postgresql://<local user>@localhost:5432/postgres_fix_oak npx prisma migrate deploy` then `… npx jest --runInBand` → **80 suites, 1630 passed, 0 failed (1625 at EP14E + 5 new)**; `dropdb postgres_fix_oak` afterwards. (A first attempt with a user-less URL failed at `migrate deploy` with Prisma P1010 before any test ran — environment, not code.) `DATABASE_URL` shell-only; no `.env*` read or written.
- `npx prettier --check`, `npx eslint --max-warnings 0` on the 12 changed files, `npx tsc --noEmit -p tsconfig.json` → clean.

Findings/deviations: none new. Scope note: five `auth/dto` specs changed beyond the finding's named files (reason above; one line each).

