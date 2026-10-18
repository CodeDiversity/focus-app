# SP-107A: Onboarding State — Schema and Endpoints

**Story ID:** SP-107A
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready (planned 2026-10-18; not implemented)
**Dependencies:** SP-104 (implemented and reviewed — STUDY-10 review PASS: global guard, `@CurrentUser()`, ownership helpers, `test-http` harness)
**Jira key:** Pending creation

## Summary

Persist the onboarding wizard's progress on the `User` model (one additive
migration, existing users backfilled **completed** per D107-2) and expose it
through a student-scoped `GET /onboarding` / `PATCH /onboarding` pair with
monotonic step progression and terminal completion.

## Description

As a student, my onboarding progress (which step I'm on, whether I completed
or skipped, and the semester I created) is stored with my account, so the
wizard (SP-107C–E) can save after every step, resume after reloads and
sign-out/in, and never re-appear once finished.

## Acceptance Criteria

1. The `User` model gains `onboardingStep Int @default(1)`, `onboardingCompletedAt DateTime?`, and `onboardingSemesterId String?`; a new Prisma migration adds the three columns and sets `onboardingCompletedAt = now()` for all pre-existing rows (D107-2 — existing users skip the wizard; the wizard appears only for new registrations). `prisma migrate deploy` applies cleanly; the Prisma client regenerates. *(AC-107-02, D107-1, D107-2)*
2. `GET /onboarding` (authenticated, no id parameter) returns `{ step, completed, completedAt, semesterId }` where `completed` is derived from `onboardingCompletedAt` and `semesterId` is the stored id only if that semester still exists **and belongs to the requesting student** (otherwise `null`). A newly registered student receives `step: 1, completed: false, completedAt: null, semesterId: null`. *(AC-107-02, AC-107-03, AC-107-05)*
3. `PATCH /onboarding` accepts a partial body `{ step?, completed?, semesterId? }` and returns the updated state. `step` must be an integer 1–3 and may not move backward (regression → 400 field error); `completed: true` sets `onboardingCompletedAt = now()`; `completed: false` → 400; an empty body → 400. Unknown fields → 400 via the global `forbidNonWhitelisted` pipe. *(AC-107-02, AC-107-04)*
4. Any write to an already-completed onboarding state → `409` with an actionable message (completion is terminal — AC-107-05). The terminal check is race-safe: the step write uses a conditional update predicated on `onboardingCompletedAt: null`; a zero-row claim re-reads and returns 409 (completed) or 400 (regression). *(AC-107-04, AC-107-05)*
5. A provided `semesterId` must be a UUID that exists and belongs to the requesting student; missing or another student's id → uniform `404 "Resource not found"` (repo ownership convention — no existence oracle). *(AC-E01-04, D107-8)*
6. Unauthenticated requests to either route → 401 (global default-deny guard regression). The route never accepts or echoes another student's id. *(AC-E01-03, AC-E01-04)*

## Tests

Unit — `apps/api/src/modules/onboarding/onboarding.service.spec.ts` (**new**; mocked `PrismaService`, no database):

- `getState` derives `completed` from `onboardingCompletedAt`; new student shape is `step 1 / false / null / null`
- `getState` returns `semesterId: null` when the stored id's semester is missing **or owned by another student** (ownership predicate in the query)
- `update` advances the step (2 after 1), tolerates an equal re-save, rejects a regression (400), rejects out-of-range step (400)
- `update` with `completed: true` sets `onboardingCompletedAt`; `completed: false` → 400; empty body → 400
- `update` on a completed state → 409, including the race path (conditional update claims 0 rows, re-read shows completed)
- `update` with a foreign/missing `semesterId` → 404 uniform, no row written

Integration — `apps/api/src/modules/onboarding/onboarding.integration.spec.ts` (**new**; real Postgres via the `test-http` harness, self-skips without `DATABASE_URL`):

- registered student: `GET /onboarding` → 200 `{ step: 1, completed: false, ... }`; both seeded students see their own state
- `PATCH` step 1→2→3 round-trips; reload (`GET`) reflects each save; a completed state 409s on further writes
- two-student: student A's `PATCH` never changes student B's state (no id in the route; B's `GET` unchanged)
- A posts a course-semester id belonging to B in `semesterId` → 404 `Resource not found`; B's semester row untouched
- no token → 401 on both routes
- backfill check: rows created before the migration (seeded against the pre-migration schema in the harness where feasible, otherwise recorded manually against the dev DB) have `onboardingCompletedAt` set; the implementation record notes the `SELECT count(*) ... WHERE "onboardingCompletedAt" IS NULL` result after `migrate deploy`

## Technical Notes

- **Inspected (2026-10-18):** `apps/api/prisma/schema.prisma` (`User` lines 17–47 — no onboarding fields today; `Semester` model lines 109–125), `apps/api/src/modules/users/users.module.ts` (module pattern; `PrismaModule` is `@Global`), `apps/api/src/app.module.ts` (module registration), `apps/api/src/common/ownership/ownership.ts` (helpers + convention), `apps/api/src/common/pipes/validation.pipe.ts` (global pipe: `whitelist`, `forbidNonWhitelisted`, transform), `apps/api/src/common/filters/all-exceptions.filter.ts` (error envelope incl. SP-106B's additive `errors` map), `apps/api/src/test/test-http.ts` (harness), `apps/api/prisma/migrations/` (seven migrations through `20261017141608_user_time_zone_preferences`).
- **Schema:** add the three columns to `User` (D107-1); no new model, no index (single row per user). The `semesterId` liveness/ownership check is `semesters.findFirst({ where: { id: storedId, userId } })` — primary-key lookup filtered to the principal, at most one row; no new index needed.
- **Migration:** `pnpm --filter @studypilot/api prisma migrate dev --name user_onboarding_state` (generated timestamped dir). Additive columns with defaults; then a raw `UPDATE users SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL;` inside the same migration (D107-2). Regenerate the client.
- **Module:** new `apps/api/src/modules/onboarding/` — `onboarding.module.ts`, `onboarding.controller.ts` (`@Controller('onboarding')`, `@CurrentUser()` principal, no id parameter — same self-scoping pattern as `users.controller.ts`), `onboarding.service.ts`, `dto/update-onboarding.dto.ts`. Register in `app.module.ts`. The users module is untouched (D106-7 kept it `/users/me`-only).
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README is the fixed shape; this child implements both onboarding endpoints.
- **Ownership:** both routes are self-scoped via the JWT principal; the only cross-entity reference is `semesterId`, handled with the `common/ownership/` convention (uniform 404).

## Definition of Done

1. ACs pass. 2. DTO validation on `step`/`completed`/`semesterId` + global pipe. 3. Self-scoped principal; `semesterId` ownership-checked; cross-student impossible by construction (AC 5/6). 4. Field-level 400 + uniform 404 + 409 all actionable. 5–7. N/A — backend-only child. 8. Unit + integration tests above. 9. Migration documented in the implementation record. 10. Via SP-107F sign-off + the combined parent review.

## Sizing

- **Outcome:** the wizard's progress is durable and API-accessible: one scoped state endpoint pair with monotonic, terminal semantics.
- **Time estimate:** ~1.5–2 h (schema + one migration with a backfill statement + one new module with two thin routes + unit and integration specs; the terminal/race logic is the only non-mechanical part).
- **Files:** `apps/api/prisma/schema.prisma` (change), `apps/api/prisma/migrations/<ts>_user_onboarding_state/` (**new**), `apps/api/src/modules/onboarding/{onboarding.module.ts,onboarding.controller.ts,onboarding.service.ts,dto/update-onboarding.dto.ts,onboarding.service.spec.ts,onboarding.integration.spec.ts}` (**new**), `apps/api/src/app.module.ts` (change).
- **Start context:** this ticket, decisions D107-1/D107-2, the [shared API contract](./README.md#shared-api-contract), `schema.prisma` (User + Semester models), `users.controller.ts` (self-scoping pattern), `common/ownership/ownership.ts`, `common/pipes/validation.pipe.ts`, `test/test-http.ts`, `users-data-scoping.spec.ts` (two-student harness pattern).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against a disposable migrated PostgreSQL (integration self-skips locally without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck` clean; lint clean; `prisma migrate deploy` applies on the disposable DB and the backfill count is recorded.
- **Dependencies / exclusions:** SP-104 (done). Excluded outcomes owned elsewhere: semester/course endpoints (SP-107B), all wizard UI (SP-107C–E), end-to-end flow + manual sign-off (SP-107F). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
