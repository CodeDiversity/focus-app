# SP-112A: Class Meetings API + Course Detail Projections

**Story ID:** SP-112A
**Parent:** [SP-112](./SP-112-class-meetings-and-course-detail.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Backend
**Status:** Implemented 2026-10-23 — awaiting the combined SP-112 parent
review (implementation record: `artifacts/SP-112A/implementation.md`)
**Dependencies:** SP-111A implemented (extends the `courses` module + `GET /courses/:id`), SP-104 (implemented + reviewed)
**Jira key:** Pending creation

## Summary

Create the missing `ClassMeeting` model (the epic's technical notes name it;
it does not exist yet) and implement recurring-meeting management nested under
the course routes, then extend `GET /courses/:id` with read-only `meetings` +
`assignments` projections so the course detail view has its data.

## Description

As a student, I can give a course its recurring weekly schedule — e.g. "Mon
09:00–10:30, Wed 14:00–15:30" — and see those meetings (plus the course's
assignments) when I open the course.

## Acceptance criteria

1. **Schema (D112-1, one migration):** new `ClassMeeting` model —
   `id` uuid, `userId` (cascade from `User`), `courseId` (cascade from
   `Course`, D112-4), `dayOfWeek Int` (0–6, Sunday=0), `startTime`/`endTime`
   `String` (`HH:mm`), `createdAt`/`updatedAt`; `@@unique([courseId,
   dayOfWeek, startTime])`; `@@map("class_meetings")`; plus the
   `meetings ClassMeeting[]` relation on `Course`. `prisma db:migrate` +
   client regenerate, documented in the implementation record (DoD 9).
   *(D112-1/4)*
2. `GET /courses/:id/meetings` returns the student's meetings for the student's
   own course, ordered `dayOfWeek` asc then `startTime` asc; a missing or
   foreign course id → uniform `404 "Resource not found"` (no existence
   oracle). Unauthenticated → 401. *(AC-E02-04, DoD 3/8)*
3. `POST /courses/:id/meetings` accepts
   `{ dayOfWeek, startTime, endTime }`. Validation (DTO + service re-checks):
   `dayOfWeek` integer 0–6; `startTime`/`endTime` match `^\d{2}:\d{2}$` with
   hour 00–23, minute 00–59; `endTime` **strictly after** `startTime` (same
   day — a midnight wrap → 400). Violations → 400 field-level `errors` map;
   foreign/missing course → uniform 404; an existing same `dayOfWeek` +
   `startTime` slot for the course → 409 "A meeting already exists at this
   time." (P2002). 201 → the created `ClassMeeting`. *(AC-E02-04, DoD 2/4/8)*
4. `PATCH /courses/:id/meetings/:meetingId` accepts a partial
   `{ dayOfWeek?, startTime?, endTime? }` (at least one field; unknown fields
   → 400). The meeting must belong to **both** the `:id` course and the
   requesting student — a missing meeting, another student's meeting, or a
   meeting of a different course → uniform 404, no write. Merged-value
   validation as AC 3; the same-slot P2002 → 409. 200 → the updated
   `ClassMeeting`. *(AC-E02-04, DoD 2/3/4)*
5. `DELETE /courses/:id/meetings/:meetingId` → 204 with the same
   dual-ownership condition (uniform 404 otherwise); 401 unauthenticated on
   all four routes. *(AC-E02-04, DoD 3)*
6. **Detail projections (D112-3):** `GET /courses/:id` (SP-111A's route)
   returns `CourseWithSemester` **plus** `meetings: ClassMeeting[]` (AC 2
   ordering) and `assignments: Assignment[]` — read-only projection of the
   existing `Assignment` model (id, title, description, dueDate ISO,
   estimatedHours, actualHours, status, priority, timestamps; no nested
   course), ordered `dueDate` asc (nulls last) then `title` asc. The
   **list** route (`GET /courses`) is unchanged. *(AC-E02-06, DoD 3)*
7. All routes: `userId` derived from the JWT principal only; every meeting
   query carries `userId` in the `where` clause (repo ownership convention).
   *(AC-E01-03)*

## Tests

Unit — `apps/api/src/modules/courses/courses-meetings.service.spec.ts`
(**new**; mocked `PrismaService`):

- list: scoped to course + principal, ordered dayOfWeek/startTime
- create: valid → 201 shape; each invalid combination (weekday −1/7, `25:00`,
  `12:60`, `end == start`, `end < start`, midnight wrap) → 400 with the field
  in `errors`; foreign course → 404; duplicate slot P2002 → 409
- patch: merge matrix per field; dual-ownership misses (foreign meeting,
  meeting of another own course, missing) → uniform 404 with no write;
  merged-value violations → 400; slot collision → 409
- delete: dual-ownership → 204 / uniform 404
- detail: `GET /courses/:id` projects `meetings` + `assignments` (empty arrays
  when none; assignments ordered dueDate asc nulls-last)

Integration — `apps/api/src/modules/courses/courses-meetings-data-scoping.spec.ts`
(**new**; real Postgres via `test-http`, self-skips without `DATABASE_URL`):

- two-student matrix: B's GET/POST/PATCH/DELETE under A's course id → uniform
  404; A's meetings unchanged before/after; B's detail projection never
  contains A's meetings/assignments
- dual-ownership: A PATCHes/DELETEs a meeting of A's *other* course via the
  first course's id → uniform 404, no write
- validation on real HTTP: the 400/409/404 cases of AC 3–5
- 401 on all four routes without a token; 400 on unknown body fields

## Technical notes

- **Inspected (2026-10-21):** `apps/api/prisma/schema.prisma`
  (`Course` 135–155, `Assignment` 161–181, `AvailabilitySlot` 253–266 — the
  `dayOfWeek` + `HH:mm` precedent), `apps/api/src/modules/courses/*` (SP-107B
  shape: `@CurrentUser()`, service re-checks, P2002 → specific 409,
  `toResponse`), `apps/api/src/common/ownership/ownership.ts` (convention +
  helpers), `apps/api/src/common/filters/all-exceptions.filter.ts`,
  `apps/api/src/test/test-http.ts`, `users-data-scoping.spec.ts` (two-student
  pattern), the SP-110A/SP-111A modules (route/transaction/spec patterns).
- **New:** `dto/create-class-meeting.dto.ts` + `dto/update-class-meeting.dto.ts`
  (class-validator; the service re-checks as defense in depth — backend
  authoritative). `HH:mm` helper: a small local validator in the service
  (regex + hour/minute bounds + `end > start` string comparison is safe for
  zero-padded `HH:mm` — lexicographic order equals chronological order).
- **New service file** `courses-meetings.service.ts` (or an extension of
  `courses.service.ts` — implementer's choice; the controller gains the four
  nested routes). Meeting queries:
  `classMeeting.findMany({ where: { courseId, userId }, orderBy: [...] })`.
- **Ownership:** course lookup first (`course.findFirst({ where: { id, userId } })`
  → uniform 404); meeting lookups carry **both** `courseId` and `userId` in
  the where; `assertAffected` on scoped `updateMany`/`deleteMany` (0 →
  uniform 404).
- **Detail projection (D112-3):** extend the SP-111A get route with
  `include: { semester: {...}, meetings: { orderBy: [...] },
  assignments: { orderBy: [{ dueDate: 'asc' }, { title: 'asc' }] } }` and
  project `assignments` to the read-only shape (no `userId`/`courseId`/nested
  course in the response).
- **Module header:** update the EP02-handoff comment — the module is now the
  full course surface (management + meetings + detail projections); EP02's
  remaining extension is only EP03's assignment management (out of scope).

## Definition of Done

1. ACs 1–7 pass. 2. DTO + service validation on create/patch; global pipe.
3. Principal-scoped + dual-ownership on every route; uniform 404; no
existence oracle. 4. Field-level 400, specific 409, uniform 404 all
actionable. 5–7. N/A — backend-only child. 8. Unit + data-scoping tests above.
9. Contract documented in the [breakdown README](./README.md#shared-api-contract);
`class_meetings` migration created and documented. 10. Via SP-112C sign-off +
the combined parent review.

## Sizing

- **Outcome:** recurring class meetings are fully manageable through the API,
and the course detail route carries everything the detail view displays.
- **Time estimate:** ~2.5 h — one new model + migration, four thin nested
  routes, one projection extension; the non-mechanical parts are the `HH:mm`
  validation core, the dual-ownership conditions, and the two-student
  data-scoping cases. One cohesive child: the meeting ownership + validation
  core must not be split.
- **Files:** `apps/api/prisma/schema.prisma` (change) + one new migration,
  `apps/api/src/modules/courses/courses.controller.ts` (change),
  `courses-meetings.service.ts` (**new**, or `courses.service.ts` change),
  `dto/create-class-meeting.dto.ts` + `dto/update-class-meeting.dto.ts`
  (**new**), `courses-meetings.service.spec.ts` (**new**),
  `courses-meetings-data-scoping.spec.ts` (**new**).
- **Start context:** this ticket, decisions D112-1…4, the
  [shared API contract](./README.md#shared-api-contract), the files above,
  `ownership.ts`, `all-exceptions.filter.ts`, `test-http.ts`,
  `users-data-scoping.spec.ts`, the SP-111A module (the route being extended).
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand`
  against a disposable migrated PostgreSQL (data-scoping self-skips locally
  without `DATABASE_URL`) — all green; `pnpm --filter @studypilot/api typecheck`
  clean; lint clean.
- **Dependencies / exclusions:** SP-111A (done at implementation time),
  SP-104 (done). Excluded: all UI (B), integration sign-off (C), assignment
  management (EP03), calendar projection of meetings (EP04). Every excluded
  requirement has an owner in the
  [README traceability table](./README.md#source-requirements-and-test-traceability).
