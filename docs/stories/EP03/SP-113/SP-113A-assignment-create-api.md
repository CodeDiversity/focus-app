# SP-113A: Assignment Create API

**Story ID:** SP-113A
**Parent:** [SP-113](./SP-113-quick-assignment-creation.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready — implementation not started
**Dependencies:** EP02 complete (satisfied 2026-10-23); no other EP03 work
**Jira key:** Pending creation

## Summary

Create the missing assignments API module: `POST /assignments` (the
quick-create endpoint) plus the one schema change the epic requires —
nullable `dueDate` (AC-2 makes the due date optional; the model currently
requires it).

## Description

As a student, I can create an assignment for a course (or without one) with a
title and any of the optional fields — due date, estimated duration, priority —
and the API validates, scopes, and persists it under my account.

## Acceptance criteria

1. **Schema (D113-1, one migration):** `Assignment.dueDate` → `DateTime?`
   (nullable). `prisma db migrate` + client regenerate, documented in the
   implementation record (DoD 9). No other schema change: the model already
   carries title, description?, estimatedHours?, status @default(PENDING),
   priority @default(MEDIUM), `courseId?`. *(AC-E03-02, DoD 9)*
2. `POST /assignments` accepts
   `{ title, courseId?, dueDate?, estimatedHours?, priority?, description? }`
   per the [shared contract](./README.md#shared-api-contract). `userId` is the
   JWT principal only. 201 → the 10-key read-only shape (the SP-112
   `toAssignmentResponse` shape — `dueDate` ISO or null; no `userId`/`courseId`
   /nested course). Unauthenticated → 401. *(AC-E03-01, DoD 2/3/4/8)*
3. Validation (DTO + service re-checks, backend authoritative — D113-5):
   `title` required, non-whitespace, ≤ 200; `dueDate` when present a valid
   ISO-8601 datetime (**past dates accepted**); `estimatedHours` when present
   `0 < h ≤ 1000`; `priority` when present one of LOW/MEDIUM/HIGH/URGENT
   (absent → schema default MEDIUM); `description` when present ≤ 2000.
   Violations → 400 field-level `errors` map. *(AC-E03-02, DoD 2/4/8)*
4. `courseId` is a plain string (D113-2): omitted/null → the assignment is
   course-less; present but the course is missing **or owned by another
   student** → uniform `404 "Resource not found"` (no existence oracle),
   nothing written. *(AC-E03-01, DoD 3/8)*
5. Unknown body fields (`status`, `type`, `userId`, …) → 400 via the global
   `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`); `status` is
   **never** settable at create — the schema default PENDING applies (D113-3).
   *(DoD 2/8)*
6. Every query carries the principal's `userId` in the `where` clause (repo
   ownership convention — `Assignment` is in the scoped-models list).
   *(DoD 3)*

## Tests

Unit — `apps/api/src/modules/assignments/assignments.service.spec.ts`
(**new**; mocked `PrismaService`):

- create: valid (all fields) → 201 shape with defaults applied (PENDING/MEDIUM
  when omitted; `dueDate` null when omitted)
- create: each invalid combination (whitespace-only title, 201-char title,
  malformed `dueDate`, `estimatedHours` 0 / −3 / 100000 / non-numeric, bad
  priority enum, 2001-char description) → 400 with the field in `errors`
- create: foreign course → uniform 404, `create` never called; missing course
  → uniform 404; `courseId` omitted/null → no course gate
- create: `status`/`type`/`userId` in the body → 400 (pipe level)
- 401 unauthenticated (controller guard level)

Integration — `apps/api/src/modules/assignments/assignments-data-scoping.spec.ts`
(**new**; real Postgres via `test-http`, self-skips without `DATABASE_URL`):

- two-student matrix: B POSTs with A's course id → uniform 404, A's data
  unchanged; B's course-detail projection never contains A's new assignment
- A creates with own course / without course / with a foreign course (404) on
  real HTTP
- the 400/404/401 cases of AC 2–5 over real HTTP

## Technical notes

- **Inspected (2026-10-24):** `apps/api/prisma/schema.prisma` (`Assignment`
  184–207, enums 209–222, `Task` 224+ — the `dueDate?` nullable precedent),
  `apps/api/src/modules/` (no assignments module), `apps/api/src/app.module.ts`
  (module registration), `apps/api/src/common/ownership/ownership.ts` +
  `validation.pipe.ts` + `filters/all-exceptions.filter.ts`, the courses DTOs
  (`create-course.dto.ts` — the plain-string-id + re-check pattern;
  `create-class-meeting.dto.ts` — the decorator style), `apps/api/src/test/test-http.ts`,
  `users-data-scoping.spec.ts` (two-student pattern).
- **New module** `apps/api/src/modules/assignments/`:
  `assignments.module.ts` (standalone resource — exports nothing),
  `assignments.controller.ts` (`@Controller('assignments')`, `@Post()`,
  `@CurrentUser()`), `assignments.service.ts`, `dto/create-assignment.dto.ts`,
  `assignments.service.spec.ts`, `assignments-data-scoping.spec.ts`.
  Registered in `app.module.ts`.
- **Course gate:** `course.findFirst({ where: { id: courseId, userId } })` →
  miss → uniform 404 (the `CreateCourseDto.semesterId` precedent: a malformed
  id is "missing" and 404s, never 400).
- **Response:** a local `toAssignmentResponse` in the service — the same 10
  keys as the course-detail assignments projection (SP-112A AC 6), so the
  created row matches what `getCourse` returns after the UI refetch.
- **Module header comment:** record the EP03 handoff — this module is the
  assignment surface; stories 2/3/5/6/7 extend it (edit/delete, `type`,
  status, list/filter, overdue).

## Definition of Done

1. ACs 1–6 pass. 2. DTO + service validation; global pipe. 3.
Principal-scoped; course ownership gate; uniform 404; no existence oracle.
4. Field-level 400 + uniform 404 actionable. 5–7. N/A — backend-only child.
8. Unit + data-scoping tests above. 9. Contract documented in the
[breakdown README](./README.md#shared-api-contract); `dueDate`-nullable
migration created and documented. 10. Via SP-113C sign-off + the combined
parent review.

## Sizing

- **Outcome:** assignments are creatable through the API with the epic's
  optional fields, scoped and validated; the schema matches the epic
  (nullable due date).
- **Time estimate:** ~2 h — one small module (single route), one one-line
  migration; the non-mechanical parts are the validation core, the course
  gate, and the two-student data-scoping cases. One cohesive child: the
  create validation + ownership core must not be split.
- **Files:** `apps/api/prisma/schema.prisma` (change) + one new migration,
  `apps/api/src/modules/assignments/*` (**new**: module, controller, service,
  dto, spec, data-scoping spec), `apps/api/src/app.module.ts` (change).
- **Start context:** this ticket, decisions D113-1…6, the
  [shared API contract](./README.md#shared-api-contract), the files above,
  `ownership.ts`, `validation.pipe.ts`, `all-exceptions.filter.ts`,
  `test-http.ts`, `users-data-scoping.spec.ts`, the courses module (the
  pattern donor).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  against a disposable migrated PostgreSQL (data-scoping self-skips locally
  without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck`
  clean; lint clean.
- **Dependencies / exclusions:** EP02 (done). Excluded: all UI (B),
  integration sign-off (C), `type` (story 3), edit/delete (story 2),
  list/detail routes (stories 6/7), status updates (story 5), subtasks
  (story 4). Every excluded requirement has an owner in the
  [EP03 README traceability](../README.md).
