# SP-106A: Profile Preferences Schema and GET /users/me

**Story ID:** SP-106A
**Parent:** [SP-106](./SP-106-profile-and-preferences.md) (Jira STUDY-11)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Backend
**Status:** In progress (implementation started 2026-10-17; checkpoint in [artifacts/SP-106A/checkpoint.md](./artifacts/SP-106A/checkpoint.md))
**Dependencies:** SP-104 (implemented and reviewed — STUDY-10 review PASS: global guard, `@CurrentUser()`, ownership helper, `test-http` harness)
**Jira key:** Pending creation

## Summary

Add `timeZone` and `preferences` to the `User` model (one additive migration) and make `GET /users/me` return them, with credential fields still excluded from the response.

## Description

As a student, my stored profile carries my time zone and preferences, and the profile endpoint returns them, so the frontend (SP-106C) can display and edit them and later epics can read the stored zone.

## Acceptance Criteria

1. The `User` model gains `timeZone String @default("UTC")` and `preferences Json?`; a new Prisma migration adds both columns; `prisma migrate deploy` applies cleanly. *(AC-106-01, AC-106-05, D106-1)*
2. `GET /users/me` returns `{ id, email, name, emailVerifiedAt, timeZone, preferences, createdAt, updatedAt }`; a newly registered student receives `timeZone: "UTC"` and `preferences: null`. *(AC-106-01)*
3. The response never includes `passwordHash` or the `emailVerificationTokens` / `passwordResetTokens` / `refreshTokens` relations (explicit `select`). *(AC-106-01)*
4. A student's `GET /users/me` returns only their own profile — the target id is derived from the JWT principal; unauthenticated requests 401 (global guard regression). *(AC-106-01, AC-E01-03, AC-E01-04)*

## Tests

Unit — `apps/api/src/modules/users/users.service.spec.ts` (**new**; mocked `PrismaService`, no database):

- `findById` selects `timeZone` + `preferences` and excludes `passwordHash` and token relations
- `create` leaves `timeZone`/`preferences` unset so the database defaults apply (`"UTC"` / `null`)

Integration — extend `apps/api/src/modules/users/users-data-scoping.spec.ts` (real Postgres via the `test-http` harness; self-skips when `DATABASE_URL` is unset):

- a registered student's `GET /users/me` returns 200 with `timeZone: "UTC"`, `preferences: null`, and no `passwordHash` / token keys in the body
- both seeded students receive their own profile including the new fields (extends the existing own-record cases)
- `GET /users/me` without a token returns 401 (guard regression, existing pattern)

## Technical Notes

- **Inspected (2026-10-17):** `apps/api/prisma/schema.prisma` (`User` model, lines 17–41 — no `timeZone`/`preferences` today), `apps/api/src/modules/users/users.service.ts` (`create` select lines 29–36, `findById` select lines 54–64), `apps/api/src/modules/users/users.controller.ts` (GET handler lines 16–19, `@CurrentUser()`), `apps/api/prisma/migrations/` (six migrations through `20261015060000_recovery_rate_limit_buckets`), `apps/api/src/test/test-http.ts` (harness).
- **Schema:** add to `User`: `timeZone String @default("UTC")` and `preferences Json?`. No new model (D106-1, user-approved). No index changes needed (single row per user).
- **Migration:** `pnpm --filter @studypilot/api prisma migrate dev` with name `user_time_zone_preferences` (or the generated timestamped equivalent). Purely additive: existing rows backfill to `"UTC"` / `NULL`. Regenerate the Prisma client after.
- **Service:** `findById` and `create` selects gain the two fields. Do **not** touch `update`'s select here — SP-106B changes `update` (same file; B lands after A, one writer).
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README is the fixed shape; this child implements the read side.
- **Ownership:** the route is self-scoped via the JWT principal (SP-104); no `id` parameter exists, so the `common/ownership/` helpers do not apply to this route — the documented convention still governs any academic-data query.

## Definition of Done

1. ACs pass. 2. N/A — no new input validation in this child (SP-106B owns PATCH validation). 3. Self-scoped principal; no cross-student read (AC4). 4. N/A — no new error paths (SP-106B). 5–7. N/A — backend-only child. 8. Unit + integration tests above. 9. Migration documented in the implementation record. 10. Via the combined SP-106 parent review.

## Sizing

- **Outcome:** `GET /users/me` returns the student's stored time zone and preferences with credentials excluded.
- **Time estimate:** ~60–90 minutes (schema + generated migration + two service selects + one new unit spec + integration extension; migration generation is mechanical).
- **Files:** `apps/api/prisma/schema.prisma` (change), `apps/api/prisma/migrations/<ts>_user_time_zone_preferences/` (**new**), `apps/api/src/modules/users/users.service.ts` (change), `apps/api/src/modules/users/users.service.spec.ts` (**new**), `apps/api/src/modules/users/users-data-scoping.spec.ts` (extend).
- **Start context:** this ticket, decisions D106-1/D106-2, the [shared API contract](./README.md#shared-api-contract), `schema.prisma` (User model), `users.service.ts`, `users-data-scoping.spec.ts` (two-student harness pattern), `test/test-http.ts`.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against a disposable migrated PostgreSQL 15 (integration self-skips locally without `DATABASE_URL`; CI always provides it) — all green including the extended scoping spec; `pnpm --filter @studypilot/api typecheck` (or the repo typecheck script) clean; lint clean.
- **Dependencies / exclusions:** SP-104 (done). Excluded outcomes owned elsewhere: `PATCH` endpoint + validation + field-level errors (SP-106B), the form (SP-106C), cross-session round-trip proof + manual sign-off (SP-106D). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
