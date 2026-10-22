# SP-111A: Course Management API

**Story ID:** SP-111A
**Parent:** [SP-111](./SP-111-course-management.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Backend
**Status:** Reviewed 2026-10-22 — final combined parent review **PASS** (F-111R-1 closed by user waiver; F-111R-2/3 accepted as-is). Implemented 2026-10-21 (record in `./artifacts/SP-111A/implementation.md`, checkpoint `./artifacts/SP-111A/checkpoint.md`).
**Dependencies:** SP-107B (implemented — the `courses` module exists), SP-104 (implemented + reviewed), D111-1 user-confirmed 2026-10-21
**Jira key:** Pending creation

## Summary

Extend the onboarding-minimal `courses` module (SP-107B) with the full
management surface — list (semester + archive filters), get, patch (partial
merge including archive/restore) — all scoped to the authenticated student, and
add the missing `instructor` column (D111-1, one migration). **EP02 extends
this module; no duplicate endpoints (D107-9).**

## Description

As a student, I can list my courses (optionally by semester, optionally
including archived ones), read any of them, edit their information (including
instructor and semester), and archive or restore them — without any course
being hard-deleted.

## Acceptance criteria

1. `GET /courses` returns the requesting student's courses — never another
   student's — ordered by `name` asc, then `code` asc, each in the
   `CourseWithSemester` shape (contract). `?semesterId=` filters to one
   semester; a `semesterId` that is missing or owned by another student →
   uniform `404 "Resource not found"`. `?includeArchived=true` includes
   `isActive = false` rows; the default is active-only (D111-3).
   Unauthenticated → 401 (global guard). *(AC-E02-02/03/05, DoD 3)*
2. `GET /courses/:id` returns the student's own course **regardless of archive
   state** (archived courses remain accessible — AC-E02-05); a missing id or
   another student's id → uniform 404 (no existence oracle). *(AC-E02-05, DoD 3/4)*
3. `PATCH /courses/:id` accepts a partial
   `{ code?, name?, description?, credits?, color?, semesterId?, instructor?, isActive? }`
   (at least one field; unknown fields → 400 via the global pipe). Validation
   runs on the **merged** values: `code` non-empty after trim, ≤ 20 chars;
   `name` non-empty after trim, ≤ 100 chars; `credits` `0 < c ≤ 30`; `color`
   `#rrggbb`; `description` ≤ 2000 chars; `instructor` ≤ 100 chars —
   violations → 400 with a field-level `errors` map. A `semesterId` that is
   missing or owned by another student → uniform 404, **no write** (AC-E02-02).
   A `code` colliding with a **different** course of the same student → 409
   "A course with this code already exists." (P2002 on
   `@@unique([userId, code])`). *(AC-E02-02/03, DoD 2/4)*
4. **Archive/restore (D111-2):** `isActive: false` archives, `isActive: true`
   restores — via the same `PATCH`, no dedicated endpoint, **no hard-delete
   route exists**. An archived course row survives and is returned by AC 2 and
   by the `includeArchived` list. *(AC-E02-05, DoD 8)*
5. `POST /courses` accepts the new optional `instructor` field (non-empty
   after trim when present, ≤ 100 chars — whitespace-only → 400) and returns
   the extended `CourseWithSemester` shape (D111-4; backward-compatible — the
   onboarding wizard omits the field and ignores the extra response keys). All
   other `POST /courses` behavior is unchanged (SP-107B contract).
   *(AC-E02-03, D111-1)*
6. All routes: unauthenticated → 401 (global guard regression); `userId` is
   derived from the JWT principal only — no `userId` in a request body is ever
   honored (the global pipe forbids unknown fields). *(AC-E01-03)*

## Tests

Unit — `apps/api/src/modules/courses/courses.service.spec.ts` (**extend** the
existing SP-107B file; mocked `PrismaService`):

- list: returns only the principal's rows, ordered name asc / code asc,
  `semester` projected as `{ id, name } | null`; `includeArchived` toggles the
  `isActive` filter; foreign/missing `semesterId` filter → uniform 404
- get: `findFirst({ where: { id, userId } })` hit (active **and** archived) →
  200 shape; miss → uniform 404
- patch: merge matrix — each field alone; merged-value violations (empty/over
  long code/name, credits bounds, color format, instructor over-long) → 400
  with the field in `errors`; foreign `semesterId` → 404 with no write;
  code-collision P2002 → 409; `isActive` flip returns the updated shape
- create: `instructor` accepted, trimmed, validated (whitespace-only → 400);
  omitted → `null`
- response: `toResponse` emits the `CourseWithSemester` keys exactly

Integration — `apps/api/src/modules/courses/courses-data-scoping.spec.ts`
(**extend**; real Postgres via `test-http`, self-skips without `DATABASE_URL`):

- two-student matrix: B's GET/PATCH on A's course id → uniform 404; A's rows
  unchanged before/after (no existence oracle, no writes); B's list never
  contains A's courses
- semesterId ownership: create/patch with another student's semester id →
  uniform 404, no course row written/changed
- archive: PATCH `isActive: false` → row survives; detail returns it;
  `includeArchived` list includes it, default list does not; restore flips back
- code uniqueness: same code across two students succeeds; duplicate within one
  student → 409
- 401 on all routes without a token; 400 on unknown body fields

## Technical notes

- **Inspected (2026-10-21):**
  `apps/api/src/modules/courses/{courses.controller.ts,courses.service.ts,dto/create-course.dto.ts}`
  + both spec files (SP-107B shape: `@CurrentUser()`, service-level re-checks,
  P2002 → specific 409, `toResponse` 8-key projection),
  `apps/api/prisma/schema.prisma` (`Course` lines 135–155: `isActive` default
  `true`, nullable `semesterId`, `@@unique([userId, code])`),
  `apps/api/src/common/ownership/ownership.ts` (convention + helpers),
  `apps/api/src/common/filters/all-exceptions.filter.ts` (P2025 → 404 fallback),
  `apps/api/src/test/test-http.ts`, `users-data-scoping.spec.ts` (two-student
  pattern), the SP-110A module (route/transaction/spec patterns to mirror).
- **Schema change (D111-1, the only migration in this parent):**
  `Course.instructor String?` — nullable, no default. Prisma migration
  `ALTER TABLE courses ADD COLUMN instructor TEXT`; `prisma db:migrate` +
  client regenerate. Document in the implementation record (DoD 9).
- **New:** `dto/update-course.dto.ts` — all seven fields optional, same
  validators as `CreateCourseDto` (class-validator decorators; the service
  re-checks as defense in depth — backend authoritative). `CreateCourseDto`
  gains the optional `instructor` (`@IsOptional() @IsString() @Matches(/\S/…)`
  semantics: present must be non-empty after trim, `@MaxLength(100)`).
- **Ownership:** every read/write uses `userId` from the principal in the
  `where` clause (repo ownership convention); a `findFirst` miss → uniform 404.
  For patch, use the `assertAffected` pattern on the scoped `updateMany`
  count (0 affected → uniform 404).
- **`toResponse` extension (D111-4):** add `instructor`, `semesterId`, and
  `semester: { id, name } | null` (via `include: { semester: { select: … } }`)
  to the projection; the list route uses the same projection.
- **List query:** `course.findMany({ where: { userId, ...(semesterId ? { semesterId } : {}), ...(includeArchived ? {} : { isActive: true }) }, include: { semester: { select: { id: true, name: true } } }, orderBy: [{ name: 'asc' }, { code: 'asc' }] })`.
- **Module header:** update the EP02-handoff comment — the module is now the
  full course-management surface; the remaining EP02 extension is meetings +
  detail projections (SP-112).

## Definition of Done

1. ACs 1–6 pass. 2. DTO + service validation on both create and patch paths;
global pipe. 3. Principal-scoped on every route; uniform 404; no existence
oracle (AC 1/2/3/6). 4. Field-level 400, specific 409, uniform 404 all
actionable. 5–7. N/A — backend-only child. 8. Unit + data-scoping tests above.
9. Contract documented in the [breakdown README](./README.md#shared-api-contract);
`instructor` migration created and documented (DoD 9). 10. Via SP-111C
sign-off + the combined parent review.

## Sizing

- **Outcome:** the course-management API is complete: a student can list,
  read, update (incl. instructor, semester, archive/restore) their courses
  through principal-scoped routes, with one new nullable column.
- **Time estimate:** ~2.5 h — three thin routes on an existing module plus one
  nullable column; the non-mechanical parts are the merged-value validation on
  the patch path, the `semesterId` ownership check, the archive semantics, and
  the two-student data-scoping cases. One migration. One cohesive child: the
  ownership scoping and archive semantics are one atomic core that must not be
  split.
- **Files:** `apps/api/prisma/schema.prisma` (change) + one new migration,
  `apps/api/src/modules/courses/courses.controller.ts` (change),
  `courses.service.ts` (change), `dto/create-course.dto.ts` (change),
  `dto/update-course.dto.ts` (**new**), `courses.service.spec.ts` (change),
  `courses-data-scoping.spec.ts` (change).
- **Start context:** this ticket, decisions D111-1…5, the
  [shared API contract](./README.md#shared-api-contract), the existing module
  files (above), `ownership.ts`, `all-exceptions.filter.ts`,
  `apps/api/src/test/test-http.ts`, `users-data-scoping.spec.ts` (two-student
  pattern), the SP-110A module (patterns).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  against a disposable migrated PostgreSQL (data-scoping self-skips locally
  without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck`
  clean; lint clean.
- **Dependencies / exclusions:** SP-107B (done), SP-104 (done). Excluded:
  meetings + detail projections (SP-112A), all UI (B), integration sign-off
  (C), course hard-delete (not in MVP — D111-2). Every excluded requirement
  has an owner in the
  [README traceability table](./README.md#source-requirements-and-test-traceability).
