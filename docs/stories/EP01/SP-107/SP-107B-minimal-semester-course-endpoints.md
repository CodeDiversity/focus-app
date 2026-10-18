# SP-107B: Minimal Semester and Course Creation Endpoints

**Story ID:** SP-107B
**Parent:** [SP-107](./SP-107-onboarding-wizard.md) (Jira STUDY-8)
**Epic:** [EP01: Authentication & Onboarding](../../../epics/EP01-authentication-and-onboarding.md)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready (planned 2026-10-18; not implemented)
**Dependencies:** SP-104 (implemented — global guard, `@CurrentUser()`, ownership helpers, `test-http` harness)
**Jira key:** Pending creation

## Summary

Create the two write paths the wizard's steps 2 and 3 need — minimal,
student-scoped `POST /semesters` and `POST /courses` — and switch the
`Semester` date columns to `@db.Date` so calendar dates carry no instant or
time-zone ambiguity (D107-7). **EP02 extends these modules; it must not
create duplicate endpoints (D107-9).**

## Description

As a student completing onboarding, I can create my first semester (name +
start/end dates) and attach an optional first course to it, with validation
and ownership enforced by the API.

## Acceptance Criteria

1. `POST /semesters` (authenticated) accepts `{ name, startDate, endDate }` and creates a semester owned by the requesting student (`userId` from the JWT principal; no id in the request). Returns `201` with `{ id, name, startDate, endDate, isActive, createdAt, updatedAt }`, dates serialized as `yyyy-MM-dd`. *(AC-107-06, D107-5)*
2. Semester validation (both layers, backend authoritative): `name` non-empty after trim, ≤ 100 chars; `startDate`/`endDate` valid `yyyy-MM-dd` calendar dates; `endDate` strictly after `startDate` — violations → 400 with a field-level `errors` map. Duplicate name for the same student → 409 with an actionable message ("A semester with this name already exists."). *(AC-107-06, TR-107-04)*
3. `Semester.startDate`/`endDate` become `DateTime @db.Date` (follows the existing `StudyPlan.date @db.Date` precedent); the migration casts existing values (none in practice — no semesters module exists yet; record the row count if any). `isActive` keeps its schema default `false` and is not settable in this endpoint (EP02 owns activation, D107-5). *(D107-7)*
4. `POST /courses` (authenticated) accepts `{ code, name, semesterId?, description?, credits?, color? }` and creates a course owned by the requesting student. Returns `201` with the created course matching the existing frontend `Course` type shape. *(AC-107-07)*
5. Course validation: `code` non-empty, ≤ 20 chars; `name` non-empty, ≤ 100 chars; `credits` when present `0 < c ≤ 30`; `color` when present `#rrggbb`; `description` ≤ 2000 chars. Violations → 400 field-level. Duplicate `code` for the same student → 409 ("A course with this code already exists."). *(AC-107-07)*
6. `semesterId` ownership: when provided, it must reference a semester that exists **and belongs to the requesting student**; missing or another student's id → uniform `404 "Resource not found"` (repo ownership convention — no existence oracle), no course row written. Omitted → course created with `semesterId: null`. *(AC-E01-04, D107-6, D107-8)*
7. Unauthenticated requests → 401 (global guard regression). Unknown body fields → 400 via the global pipe. No list/get/update/delete routes exist in this child (EP02 scope). *(AC-E01-03, D107-5, D107-6)*

## Tests

Unit — `apps/api/src/modules/semesters/semesters.service.spec.ts` and `apps/api/src/modules/courses/courses.service.spec.ts` (**new**; mocked `PrismaService`):

- semester: creates with the principal's `userId`; date serialization is `yyyy-MM-dd`; `isActive` left to the schema default
- semester: 400 cases — empty/over-long name, malformed date strings, `end == start`, `end < start`; 409 on a P2002 from the create (mapped to the specific message)
- course: creates with the principal's `userId`; optional fields pass through with defaults applied by the schema
- course: 400 cases — empty/over-long code or name, out-of-range credits, malformed color; 409 on duplicate code (P2002)
- course: `semesterId` ownership — a `findFirst({ where: { id, userId } })` miss → 404 uniform; a hit → the id is passed through; omitted → `null`

Integration — `apps/api/src/modules/semesters/semesters-data-scoping.spec.ts` and `apps/api/src/modules/courses/courses-data-scoping.spec.ts` (**new**; real Postgres via `test-http`, self-skips without `DATABASE_URL`):

- two-student: A creates a semester; B's `POST /courses` with A's semester id → 404 `Resource not found`, no course row, A's semester untouched; B with their own semester id → 201
- duplicate name/code → 409; invalid dates (`end < start`) → 400 with the field in `errors`; no token → 401 on both routes
- created semester persists (re-read via a direct `PrismaService` query in the spec — no GET route exists yet) with `startDate`/`endDate` stored as dates

## Technical Notes

- **Inspected (2026-10-18):** `apps/api/prisma/schema.prisma` (`Semester` lines 109–125, `Course` lines 127–147, `StudyPlan.date DateTime @db.Date` line 264 as the date precedent), `apps/api/src/common/filters/all-exceptions.filter.ts` (P2002 → 409 generic, P2025 → 404 `RESOURCE_NOT_FOUND` — the service-level catches below produce the specific messages), `apps/api/src/common/ownership/ownership.ts` (convention + helpers), `apps/api/src/modules/users/users.controller.ts` (self-scoped controller pattern), `apps/web/src/shared/types/academic.ts` (existing `Semester`/`Course` types the responses must match), `apps/api/src/app.module.ts` (registration point).
- **Modules:** new `apps/api/src/modules/semesters/` and `apps/api/src/modules/courses/` (module + controller + service + DTOs + specs each), registered in `app.module.ts`. Both controllers use `@CurrentUser()` and derive `userId` from the principal — the same self-scoping pattern as the users module.
- **Date handling:** DTOs take `startDate`/`endDate` as strings; a small shared parse/validate helper (in each module or `common/lib`) enforces `yyyy-MM-dd` and converts to a UTC-midnight `Date` for the `@db.Date` column; the response serializes back to `yyyy-MM-dd` (date part only — never an instant). `end > start` compares the parsed dates.
- **409 specifics:** catch `Prisma.PrismaClientKnownRequestError` `P2002` in each service's create and rethrow as `ConflictException` with the resource-specific message (the global filter's generic P2002 message remains the fallback for any other unique path).
- **Ownership:** the `semesterId` check follows `common/ownership/` — `semesters.findFirst({ where: { id: dto.semesterId, userId } })`; a miss throws the uniform 404 (never a distinct "not yours" message).
- **EP02 handoff (D107-9):** module headers document that these are the onboarding-minimal create endpoints and that EP02 adds list/get/update/delete, activation, meetings, and views **in these modules**.
- **Contract:** the [shared API contract](./README.md#shared-api-contract) in the breakdown README is the fixed shape; this child implements both endpoints.

## Definition of Done

1. ACs pass. 2. DTO validation on both endpoints + global pipe. 3. Principal-scoped creates; `semesterId` ownership-checked (AC 6). 4. Field-level 400, specific 409, uniform 404 all actionable. 5–7. N/A — backend-only child. 8. Unit + integration tests above. 9. `@db.Date` migration + both API contracts documented in the implementation record and the README contract. 10. Via SP-107F sign-off + the combined parent review.

## Sizing

- **Outcome:** the wizard's step 2 and step 3 have their write paths: two student-scoped create endpoints with validation, duplicate handling, and ownership checks.
- **Time estimate:** ~2 h (one small schema migration + two thin modules, two of which are near-identical in shape; the date helper and the ownership/409 handling are the only non-mechanical parts). One cohesive child: the two endpoints share the pattern, the EP02-handoff concern, and the 1–3 h target — splitting them would produce two near-duplicate children without solving a complexity problem.
- **Files:** `apps/api/prisma/schema.prisma` (change), `apps/api/prisma/migrations/<ts>_semester_course_dates/` (**new**), `apps/api/src/modules/semesters/{semesters.module.ts,semesters.controller.ts,semesters.service.ts,dto/create-semester.dto.ts,semesters.service.spec.ts,semesters-data-scoping.spec.ts}` (**new**), `apps/api/src/modules/courses/{courses.module.ts,courses.controller.ts,courses.service.ts,dto/create-course.dto.ts,courses.service.spec.ts,courses-data-scoping.spec.ts}` (**new**), `apps/api/src/app.module.ts` (change).
- **Start context:** this ticket, decisions D107-5/D107-6/D107-7/D107-9, the [shared API contract](./README.md#shared-api-contract), `schema.prisma` (Semester/Course/StudyPlan), `all-exceptions.filter.ts`, `common/ownership/ownership.ts`, `users.controller.ts` (pattern), `apps/web/src/shared/types/academic.ts` (response shapes), `test/test-http.ts`, `users-data-scoping.spec.ts` (two-student pattern).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand` against a disposable migrated PostgreSQL (integration self-skips locally without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck` clean; lint clean; `prisma migrate deploy` applies on the disposable DB.
- **Dependencies / exclusions:** SP-104 (done). Excluded outcomes owned elsewhere: onboarding state (SP-107A), all wizard UI (SP-107C–E), end-to-end flow + manual sign-off (SP-107F); semester/course list/get/update/delete, activation, meetings, views (EP02). Every excluded requirement has an owner in the [README traceability table](./README.md#source-requirements-and-test-traceability).
