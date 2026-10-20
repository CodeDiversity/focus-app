# SP-110A: Semester Management API

**Story ID:** SP-110A
**Parent:** [SP-110](./SP-110-create-and-manage-standalone.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready (planned 2026-10-20; D110-1/D110-2 user-confirmed 2026-10-20; not implemented)
**Dependencies:** SP-107B (implemented — the `semesters` module exists), SP-104 (implemented + reviewed)
**Jira key:** Pending creation

## Summary

Extend the onboarding-minimal `semesters` module (SP-107B) with the full
management surface — list, get, patch (including single-active activation),
delete — all scoped to the authenticated student, so the API can serve the
semester management UI. **EP02 extends this module; no duplicate endpoints
(D107-9).** No schema change, no migration.

## Description

As a student, I can list my semesters, read one, rename or re-date it, set
which semester is my current one, and delete one — with my courses surviving
deletion.

## Acceptance criteria

1. `GET /semesters` returns the requesting student's semesters — never another
   student's — ordered by `startDate` desc, then `name` asc, each in the
   `SemesterWithCount` shape (contract). Unauthenticated → 401 (global guard).
   *(AC-E02-01, DoD 3)*
2. `GET /semesters/:id` returns the student's own semester; a missing id or
   another student's id → uniform `404 "Resource not found"` (no existence
   oracle), nothing else written or revealed. *(AC-E02-01, DoD 3/4)*
3. `PATCH /semesters/:id` accepts a partial
   `{ name?, startDate?, endDate?, isActive? }` (at least one field; unknown
   fields → 400 via the global pipe). Validation runs on the **merged**
   values: `name` non-empty after trim, ≤ 100 chars; `startDate`/`endDate`
   valid `yyyy-MM-dd`; `endDate` strictly after `startDate` — violations → 400
   with a field-level `errors` map. A name colliding with a **different**
   semester of the same student → 409 "A semester with this name already
   exists." (P2002 on `@@unique([userId, name])`). *(AC-E02-01, DoD 2/4)*
4. **Activation (D110-1):** `isActive: true` → one transaction deactivates all
   of the student's other semesters and activates the target (after every
   request, at most one active per student; concurrent activations are
   last-write-wins — the invariant always holds). `isActive: false` →
   deactivates only the target. The response is the updated
   `SemesterWithCount`. *(D110-1, DoD 8)*
5. `DELETE /semesters/:id` → 204. In the same transaction the semester's
   courses are explicitly set to `semesterId: null` (D110-2) — course rows
   survive, unaffiliated; nothing else is touched. Missing/foreign id →
   uniform 404, no writes. *(D110-2, AC-E02-05 boundary, DoD 3)*
6. All four routes: unauthenticated → 401 (global guard regression); `userId`
   is derived from the JWT principal only — no `userId` in the request body is
   ever honored (the global pipe forbids unknown fields). *(AC-E01-03)*

## Tests

Unit — `apps/api/src/modules/semesters/semesters.service.spec.ts` (**extend**
the existing SP-107B file; mocked `PrismaService`):

- list: returns only the principal's rows, ordered startDate desc / name asc,
  `courseCount` projected
- get: `findFirst({ where: { id, userId } })` hit → 200 shape; miss → uniform 404
- patch: merge matrix — each field alone; `end == start` / `end < start` on
  merged values → 400 with the field in `errors`; over-long/empty name → 400;
  409 on P2002 (different semester, same name); foreign id → 404;
  `isActive: true` issues deactivate-others + activate in one transaction;
  `isActive: false` deactivates only
- delete: issues setNull on the semester's courses + delete in one
  transaction; foreign/missing → 404, no writes

Integration — `apps/api/src/modules/semesters/semesters-data-scoping.spec.ts`
(**extend**; real Postgres via `test-http`, self-skips without `DATABASE_URL`):

- two-student matrix: B's GET/PATCH/DELETE on A's semester id → uniform 404;
  A's rows unchanged before/after (no existence oracle, no writes)
- single-active: A with three semesters; activate #2 → exactly one active;
  concurrent activation of #1 and #3 → exactly one active afterwards
- delete-orphan: A's semester with two courses deleted → 204; both course rows
  survive with `semesterId: null`
- 401 on all four routes without a token; 400 on unknown body fields

## Technical notes

- **Inspected (2026-10-20):**
  `apps/api/src/modules/semesters/{semesters.controller.ts,semesters.service.ts,dto/create-semester.dto.ts}`
  + both spec files (SP-107B shape: `@CurrentUser()`, service-level re-checks,
  P2002 → specific 409, `toResponse` projection), `apps/api/prisma/schema.prisma`
  (`Semester` lines 114–133: `isActive` default `false`, `@db.Date` dates,
  `@@unique([userId, name])`; `Course.semesterId` nullable),
  `apps/api/src/common/lib/calendar-date.ts` (`parseCalendarDate` /
  `formatCalendarDate` — reuse), `apps/api/src/common/ownership/ownership.ts`
  (convention + helpers), `apps/api/src/common/filters/all-exceptions.filter.ts`
  (P2025 → 404 fallback).
- **No schema change** — every column needed already exists (SP-107B); no
  migration.
- **New:** `dto/update-semester.dto.ts` — all four fields optional, same
  validators as `CreateSemesterDto` (class-validator decorators; the service
  re-checks as defense in depth — backend authoritative).
- **Ownership:** every read/write uses `userId` from the principal in the
  `where` clause (repo ownership convention); a `findFirst` miss → uniform 404.
  For update/delete, use the `assertAffected` pattern on the scoped
  `updateMany`/`deleteMany` counts (0 affected → uniform 404).
- **Activation transaction:** `prisma.$transaction` —
  `semester.updateMany({ where: { userId, NOT: { id: targetId } }, data: { isActive: false } })`
  + `semester.update({ where: { id: targetId, userId }, data: { isActive: true } })`
  (the conditional `userId` in the update's where makes a foreign/stale target
  a no-op → 404).
- **Delete transaction:** `course.updateMany({ where: { semesterId: id, userId }, data: { semesterId: null } })`
  + scoped `semester.delete` — explicit orphaning (D110-2), not a reliance on
  the implicit SetNull default.
- **`courseCount`:** `semester.findMany({ where: { userId }, include: { _count: { select: { courses: true } } }, orderBy: [{ startDate: 'desc' }, { name: 'asc' }] })`
  (or a second count query — implementer's choice; the contract fixes the
  shape).
- **Module header:** update the EP02-handoff comment — the module is now the
  full semester management surface; the remaining EP02 extension is
  course-side only.

## Definition of Done

1. ACs 1–6 pass. 2. DTO + service validation on the patch path; global pipe.
3. Principal-scoped on every route; uniform 404; no existence oracle (AC 2/5/6).
4. Field-level 400, specific 409, uniform 404 all actionable. 5–7. N/A —
backend-only child. 8. Unit + data-scoping tests above (incl. the single-active
race). 9. Contract documented in the [breakdown README](./README.md#shared-api-contract);
no migration (no schema change — recorded in the implementation record). 10. Via
SP-110C sign-off + the combined parent review.

## Sizing

- **Outcome:** the semester management API is complete: a student can list,
  read, update (rename/re-date/activate), and delete their semesters through
  four principal-scoped routes, with the single-active invariant and
  course-survival on delete enforced transactionally.
- **Time estimate:** ~2.5 h — four thin routes on an existing module; the
  non-mechanical parts are the merged-value validation, the two transactions
  (activation, delete-orphan), and the two-student/race data-scoping cases. No
  migration. One cohesive child: the single-active invariant and the ownership
  scoping are one atomic core that must not be split.
- **Files:** `apps/api/src/modules/semesters/semesters.controller.ts` (change),
  `semesters.service.ts` (change), `dto/update-semester.dto.ts` (**new**),
  `semesters.service.spec.ts` (change), `semesters-data-scoping.spec.ts` (change).
- **Start context:** this ticket, decisions D110-1/2/3/5, the
  [shared API contract](./README.md#shared-api-contract), the existing module
  files (above), `calendar-date.ts`, `ownership.ts`, `all-exceptions.filter.ts`,
  `apps/api/src/test/test-http.ts`, `users-data-scoping.spec.ts` (two-student pattern).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  against a disposable migrated PostgreSQL (data-scoping self-skips locally
  without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck`
  clean; lint clean.
- **Dependencies / exclusions:** SP-107B (done), SP-104 (done). Excluded: all
  course-side behavior (EP02 proposed stories 2–6), the UI (B), integration
  sign-off (C), `POST /semesters` changes (EP01 contract, D110-5). Every
  excluded requirement has an owner in the
  [README traceability table](./README.md#source-requirements-and-test-traceability).
