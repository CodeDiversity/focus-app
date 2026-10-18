# SP-107A implementation record — Onboarding State: Schema and Endpoints

**Story:** [SP-107A](../../SP-107A-onboarding-state-backend.md) (parent [SP-107](../../README.md))
**Completed:** 2026-10-18 (resume dispatch `SP107-implementer-A2`; the stalled dispatch A left code complete but red — see Findings)
**Status:** Implementation complete — awaiting parent review (combined SP-107 review)
**Baseline:** `8abb20f` (before the first included change; all scoped paths were uncommitted working-tree state from dispatch A, finished and fixed by this dispatch)

## Outcome

The onboarding wizard's progress is durable and API-accessible: three additive
`User` columns (D107-1) with a one-shot backfill of pre-migration users to
completed (D107-2), exposed through a student-scoped
`GET /onboarding` / `PATCH /onboarding` pair with monotonic step progression,
terminal completion, and race-safe writes. The users module is untouched;
consumers are SP-107C–E (wizard) per the [shared API contract](../../README.md#shared-api-contract).

## Changed paths

| Path | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | 3 additive `User` columns: `onboardingStep Int @default(1)`, `onboardingCompletedAt DateTime?`, `onboardingSemesterId String?` |
| `apps/api/prisma/migrations/20261018215837_user_onboarding_state/` (new) | Migration: `ALTER TABLE users ADD COLUMN` ×3 + backfill `UPDATE "users" SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL` (D107-2) |
| `apps/api/src/modules/onboarding/onboarding.module.ts` (new) | Module: controller + service |
| `apps/api/src/modules/onboarding/onboarding.controller.ts` (new) | `GET` + `PATCH /onboarding`; `@CurrentUser()` principal, no id parameter; `@Body() UpdateOnboardingDto` metatype so the global `FieldValidationPipe` applies (F-107A-3) |
| `apps/api/src/modules/onboarding/onboarding.service.ts` (new) | `getState` + `update` (claim pattern — see F-107A-1); uniform 404 via `RESOURCE_NOT_FOUND` |
| `apps/api/src/modules/onboarding/dto/update-onboarding.dto.ts` (new) | Partial body DTO: `step` `@IsInt @Min(1) @Max(3)`, `completed` `@IsBoolean`, `semesterId` `@IsString @IsUUID` (F-107A-6) |
| `apps/api/src/modules/onboarding/onboarding.service.spec.ts` (new) | 19 unit tests (mocked PrismaService) |
| `apps/api/src/modules/onboarding/onboarding.integration.spec.ts` (new) | 16 integration tests (real Postgres via `test-http` harness; self-skips without `DATABASE_URL`) |
| `apps/api/src/app.module.ts` | Register `OnboardingModule` |
| `apps/api/src/test/test-http.ts` | Integration app imports `OnboardingModule` |
| `docs/stories/EP01/SP-107/artifacts/SP-107A/checkpoint.md` (new) | Checkpoint (this record's companion) |
| `docs/stories/EP01/SP-107/README.md` | Execution fields only: queue row A, Active/Next substory, queue note |

The generated Prisma client (`apps/api/src/generated/`) is gitignored and was
regenerated locally (`pnpm --filter @studypilot/api db:generate` equivalent —
`prisma generate`); it carries the three fields (`Date | null` typing verified
in `models/User.ts`).

## Migration (DoD 9)

- **Command:** `prisma migrate dev --name user_onboarding_state` (dispatch A;
  `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx prisma migrate deploy`
  re-verified 2026-10-18: `8 migrations found … No pending migrations to apply`).
- **SQL:** additive `ALTER TABLE "users" ADD COLUMN` for the three columns
  (all nullable or defaulted — no lock risk), then the D107-2 backfill
  `UPDATE "users" SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL`
  in the same migration file.
- **Backfill result on the local dev DB** (post-`migrate deploy`, via
  `dotenv -e .env.local` + `pg`): `total_users = 3, completed_users = 3,
  null_completed = 0` — every pre-migration user is marked completed; the
  wizard appears only for brand-new registrations.
- **Semantics:** the backfill runs once, at migration time, over rows that
  exist *then*. Users registered afterwards get `onboardingCompletedAt = null`
  (schema: no default) → `completed: false`, `step: 1` — exactly who the
  wizard is for. (The stalled dispatch's integration draft misread this as
  "all users, including new ones, are completed" — F-107A-4.)

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1. Three `User` columns + migration + backfill; `migrate deploy` clean; client regenerated | **Pass** | schema diff; migration SQL above; `migrate deploy` no-pending; generated client; backfill count 3/3/0 |
| 2. `GET /onboarding` → `{ step, completed, completedAt, semesterId }`; `completed` derived from `onboardingCompletedAt`; `semesterId` only if the stored semester still exists **and** belongs to the student; new student → `1/false/null/null` | **Pass** | unit: 6 `getState` tests (incl. foreign/missing semester → null); integration: fresh student → exact `FRESH_STATE` + exact key set; self-scoped read for both students |
| 3. `PATCH` partial body: step 1–3 monotonic (regression → 400), `completed: true` sets `onboardingCompletedAt`, `completed: false` → 400, empty body → 400, unknown fields → 400 | **Pass** | unit: 8 `update` validation tests; integration: round-trip 1→2→3 + reloads, completion 200, empty-body 400, `step: 5` / `step: 'abc'` / `completed: false` / malformed `semesterId` / unknown field → 400 with field-level `errors` map |
| 4. Any write to a completed state → 409; race-safe conditional update (zero-row claim → re-read → 409) | **Pass** (after F-107A-1 fix) | unit: completed-state 409 + both race paths (zero-count claim → completed re-read → 409; defensive not-completed re-read → current state); integration: three write shapes 409 on the completed student with `statusCode` + message |
| 5. `semesterId` must exist and belong to the student; missing/foreign → uniform 404 `Resource not found`; no row written | **Pass** | unit: 3 tests (foreign/missing → 404, claim not called; valid → stored; explicit null → cleared); integration: B posts A's semester → 404 `Resource not found`, A's row and B's onboarding row untouched; B posts own semester → 200 + stored + reload |
| 6. Unauthenticated → 401 on both routes; never accepts/echoes another student's id | **Pass** | integration: both routes 401 without token; route has no id parameter (controller derives from `@CurrentUser()`) |

DoD 1–8: pass as above (DoD 2 now enforced at the DTO layer as well —
F-107A-6). DoD 5–7: N/A (backend-only child). DoD 9: migration documented
above. DoD 10: via SP-107F sign-off + the combined parent review (pending).

## Verification

All commands run 2026-10-18; working tree at the pre-commit state of this
record (all scoped paths present, uncommitted).

| Check | Command (cwd) | Result |
|---|---|---|
| Full API suite, integration executing | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest --runInBand` (repo root) | **28/28 suites, 327/327 tests passed, 0 skipped** (baseline before this dispatch: 26/28 suites, 309/311) |
| Unit spec | `npx jest onboarding.service.spec --runInBand` (`apps/api`) | 19/19 passed |
| Integration spec | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx jest onboarding.integration.spec --runInBand` (repo root) | 16/16 passed (real Postgres, port 5432) |
| Typecheck | `pnpm --filter @studypilot/api typecheck` (`tsc --noEmit`) | clean |
| Lint (changed files) | `npx eslint "src/modules/onboarding/**/*.ts" --max-warnings 0` (`apps/api`) | clean (after `--fix` of prettier formatting) |
| Migration deploy | `pnpm --filter @studypilot/api exec dotenv -e .env.local -- npx prisma migrate deploy` | 8 migrations, no pending |
| Backfill count | `dotenv -e .env.local` + `pg` query on dev DB | 3 total / 3 completed / 0 null |

Tested state: local dev PostgreSQL (port 5432, migrated); no secrets in this
record (env var names only).

## Findings / Deviations

All findings were discovered during this dispatch (the stalled dispatch A's
work, verified against the contract) and are **fixed** in the committed code:

| ID | Description | Disposition |
|---|---|---|
| F-107A-1 | **Service race-branch defect.** `update` used `prisma.user.update({ where: { id, onboardingCompletedAt: null } })` and treated `result.onboardingCompletedAt !== null` as "a race". In reality: (a) the normal `completed: true` path sets the field via our own write → the service re-read, saw completed, and would 409 a legitimate completion; (b) a true race makes `update` match 0 rows → Prisma P2025 → the filter maps that to 404, not 409. Fixed with the repo's race-safe pattern (`assertAffected` convention, `common/ownership/ownership.ts`): claim via `updateMany({ where: { id, onboardingCompletedAt: null } })`, `count === 0` → re-read → 409 (completed) or, defensively, return the current state. **Deviation note:** ticket AC-4's "zero-row claim … 409 (completed) or 400 (regression)" is realized with the 400 regression in the *pre-write* check (the claim predicate is `onboardingCompletedAt: null` only, so a zero-row claim means concurrent completion, not regression); the unit spec's race tests pin the defensive branch to return the current state. | Fixed — unit 19/19 (incl. both race paths + normal completion 200); integration round-trip + terminal 409 green. |
| F-107A-2 | **Integration spec TS errors.** TS2352 at the `set-cookie` cast (`as unknown[] \| undefined` — direct cast invalid); TS2339 `.expect` on an awaited Promise (the async helper returned `Promise<Test>`). Fixed per the `users-profile-integration.spec.ts` convention: cast via `unknown as string[] \| undefined`; helpers return the supertest chain so `.expect(status)` chains before `await`. | Fixed — spec compiles; 16/16 green. |
| F-107A-3 | **Controller bypassed the validation pipe.** `@Body() body: Record<string, unknown>` + `as any` — with no DTO metatype the global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) is a no-op, so unknown fields would not 400 (contract: unknown fields → 400). Fixed: `@Body() body: UpdateOnboardingDto`; service input type matches. | Fixed — integration "unknown field → 400" (field-level `errors.bogus`) green. |
| F-107A-4 | **Integration spec misread D107-2.** It expected `completed: true` for *newly registered* students, but the backfill covers only pre-migration rows; new registrations start `1/false/null/null` (the ticket's own integration list says `completed: false`). The derived `not.toEqual` / 409-first expectations would have failed at runtime. Spec rewritten to the correct semantics (fresh-state GET, round-trip + completion 200, terminal 409, isolation, foreign-semester 404 on the not-completed student); coverage preserved and expanded (12 → 16 tests). | Fixed — 16/16 green against real Postgres. |
| F-107A-5 | **Integration spec assertion bug.** `expect(response.body.errors).toHaveProperty('statusCode')` on a 409 — `errors` exists only on validation 400s (`AllExceptionsFilter` preserves the pipe's map) → would fail at runtime. Replaced with `statusCode`/`message` assertions on the body. | Fixed. |
| F-107A-6 | **DTO lacked value validation.** `step` had only `@IsOptional` (a non-numeric `step` would pass the pipe and reach Prisma → 500) and `semesterId` had no format check (contract: "malformed semesterId → 400"; DoD 2: DTO validation on all three fields). Added `@IsInt @Min(1) @Max(3)` on `step`, `@IsUUID()` on `semesterId` (ids are `@default(uuid())`); the service keeps its own checks as defense in depth (unit tests call the service directly, so `'foreign-uuid'` still 404s there). | Fixed — integration 400s for `step: 5`, `step: 'abc'`, `completed: false`, `semesterId: 'not-a-uuid'` green. |

No other deviations. The shared API contract, decisions D107-1/2, and the
ticket's ACs were not changed.

## Commit scope

One scoped commit on `main` (baseline `8abb20f`; the unrelated
`docs/jira-sync/ledger.json` was committed separately by its owner as
`032b66d` and is **not** part of this commit): schema, migration, onboarding
module (6 files), `app.module.ts`, `test-http.ts`, `docs/stories/EP01/SP-107/README.md`
(execution fields — the queue row A, Active/Next substory, and queue note only),
`docs/stories/EP01/SP-107/artifacts/SP-107A/`
(checkpoint + this record).

The README's `## Autopilot` run-record section (dispatch/stage/handoff
bookkeeping) is the coordinator/autopilot role's own record per delivery-state
and is **not** part of this commit; it is preserved in the working tree for the
coordinator to commit separately.

## Remaining work (outside this child)

- SP-107B (next eligible child per the queue) — minimal `POST /semesters` +
  `POST /courses`.
- Combined SP-107 parent review after all children (A–F) are implemented;
  DoD 10 via SP-107F + that review.
