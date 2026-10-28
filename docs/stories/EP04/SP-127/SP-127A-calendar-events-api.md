# SP-127A: Calendar Event Read Model (API)

**Story ID:** SP-127A
**Title:** Backend — `GET /calendar/events` returns one normalized event list for a date range
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-127](./SP-127-calendar-read-model-and-week-view.md)
**Milestone:** M2
**Layer:** Backend
**Status:** Ready.
**Dependencies:** EP02 + EP03 (both complete). No EP04 predecessor.
**Jira key:** Pending creation

## Summary

A new `calendar` module exposes `GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD`: the student's recurring class meetings, assignment and exam deadlines, study sessions, and recurring availability windows — each on its correct local date, in the time zone the student selected in their profile, as one sorted, ownership-scoped list the calendar page can render directly.

## Description & bounded scope

### In scope

- A new `apps/api/src/modules/calendar/` module (`CalendarModule`, `CalendarController`, `CalendarService`, `ListCalendarEventsQueryDto`), registered in `apps/api/src/app.module.ts` and in the integration harness `apps/api/src/test/test-http.ts`.
- `GET /calendar/events` returning `{ timeZone, today, from, to, events }` — the exact shape is in the [EP04 README](../README.md#shared-api-contract).
- Recurring `ClassMeeting` expansion onto the calendar dates in the range (a meeting occurs on every matching weekday at its stored local wall-clock time).
- `Assignment` deadlines in the range converted from instants into the student's zone; `type = EXAM` → `EXAM_DEADLINE`, otherwise `ASSIGNMENT_DEADLINE`; `COMPLETED`/`GRADED` → `completed: true`.
- `StudySession` rows overlapping the range, with `focus` from `StudySession.isFocusMode`.
- `AvailabilitySlot` bucketing into `AVAILABILITY` (`isAvailable: true`) and `BLOCKED_TIME` (`isAvailable: false`) events.
- The zone resolved from the stored `User.timeZone` (schema default `"UTC"`); the endpoint accepts no zone parameter.
- Archived courses' meetings excluded; their assignment deadlines included (D404-7).

### Out of scope

- Creating or mutating any event — the calendar is read-only (D404-6).
- The availability CRUD API — SP-128A.
- Any Prisma migration; any new npm dependency.
- Any endpoint other than `GET /calendar/events`.

## Source requirement references

- **Epic AC-E04-01, -02, -03, -07** (and the type/completion semantics that feed AC-E04-08) — ownership table in the [SP-127 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1–4 and 8–9 apply here; items 5–7 are SP-127B's; items 10–11 belong to the combined parent review.
- **Decisions:** D404-1, D404-2, D404-3, D404-4, D404-6, D404-7, D404-8, D404-13 in the [EP04 README](../README.md#decision-register).

## Acceptance criteria

1. `GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD` returns `200` with `{ timeZone, today, from, to, events }`; `events` is sorted by date ascending, then `startTime` ascending, then type, then id.
2. `from`/`to` are inclusive calendar dates in the student's zone; `from` must not be after `to`; the inclusive span may not exceed 31 days; a malformed or impossible date, an inverted range, an over-long span, or any unknown query parameter (`tz`, `courseId`, `userId`, `includeArchived`) returns `400` with a field-level `errors` map and writes nothing.
3. Every meeting of the student's **active** courses appears once per matching weekday in the range, at the meeting's stored `startTime`/`endTime`; a meeting's local time is identical on dates either side of a daylight-saving transition.
4. Every assignment with a `dueDate` inside the range appears at that instant's local date and time in the student's zone; `EXAM`-typed assignments are typed `EXAM_DEADLINE` and all others `ASSIGNMENT_DEADLINE`; an assignment in `COMPLETED` or `GRADED` is present with `completed: true`.
5. Every `StudySession` overlapping the range appears with its local start/end and `focus` reflecting `isFocusMode`.
6. Recurring availability windows and blocked times appear as `AVAILABILITY` / `BLOCKED_TIME` events on the matching weekdays of the range.
7. A meeting of an archived course never appears; an assignment deadline from an archived course does.
8. `timeZone` is the student's stored `User.timeZone` and `today` is the current date in that zone — not the server's zone.
9. The payload contains only the authenticated student's rows; no parameter can widen the read (no id parameters exist), and an unauthenticated request returns `401`.
10. No response field exposes `userId`, `courseId` of another student, or any internal id of a row the student does not own.

## Tests to add / update

- `apps/api/src/modules/calendar/calendar.service.spec.ts` (new)
  - Recurrence expansion: a `dayOfWeek = 1` meeting appears on every Monday in a 7-day range and nowhere else; a two-meeting course yields two events per day.
  - Daylight saving: a meeting at `09:00` keeps `09:00` local on dates before and after a DST transition in the student's zone.
  - Zone conversion: a deadline at `2026-10-28T23:30:00Z` lands on the local date `2026-10-28` in `America/New_York` and on `2026-10-29` in `Asia/Tokyo`; `today` follows the zone.
  - Deadline typing and completion flag: `EXAM` → `EXAM_DEADLINE`; `COMPLETED` → `completed: true`; a null `dueDate` produces no event.
  - Session and availability bucketing: an `isFocusMode: true` session → `focus: true`; `isAvailable: false` → `BLOCKED_TIME`.
  - Archived-course rule: an archived course's meeting is absent; its assignment deadline is present.
  - Ordering, empty range, and the 31-day span cap.
- `apps/api/src/modules/calendar/calendar-data-scoping.spec.ts` (new) — student B's payload contains none of student A's meetings, assignments, sessions, or availability slots; a cross-student course id is never reachable (the endpoint takes no ids).
- `apps/api/src/modules/calendar/calendar-e2e.spec.ts` (new, integration) — the `200` shape; `400` for a malformed `from`, `from > to`, an over-long span, and unknown query parameters; `401` unauthenticated; a seeded `StudySession` appears in the payload (the AC-E04-03 read-path proof).
- `apps/api/src/test/test-http.ts` — register `CalendarModule` in the integration app's module graph (the harness wires modules explicitly).

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- `apps/api/src/modules/` contains no calendar module: assignments, auth, courses, email, onboarding, prisma, semesters, users. `apps/api/src/app.module.ts` imports each feature module explicitly — the new `CalendarModule` is added there and in `apps/api/src/test/test-http.ts` (which mirrors the same graph).
- Models (`apps/api/prisma/schema.prisma`): `ClassMeeting` (userId, courseId, dayOfWeek 0–6, startTime/endTime `HH:mm`, `@@unique([courseId, dayOfWeek, startTime])`); `Course.isActive`; `Assignment` (userId, courseId?, `dueDate DateTime?`, `status AssignmentStatus`, `type AssignmentType?`); `StudySession` (userId, startTime/endTime instants, `isFocusMode @default(true)`); `AvailabilitySlot` (userId, dayOfWeek, startTime, endTime, `isAvailable @default(true)`); `User.timeZone String @default("UTC")`.
- Conventions to copy:
  - `apps/api/src/common/ownership/ownership.ts` — `ownedWhere(userId, id)`; every query carries the principal's `userId`; a missing or foreign row is the same uniform 404 `Resource not found` (`RESOURCE_NOT_FOUND`), never 403.
  - `apps/api/src/common/pipes/validation.pipe.ts` — the global pipe applies whitelist + `forbidNonWhitelisted` to `@Query()` metatypes, so unknown query parameters 400 automatically.
  - `apps/api/src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` only; the principal carries id/email/name, **not** the time zone, so the service reads `User.timeZone` from the database (D404-3).
  - `apps/api/src/common/lib/calendar-date.ts` — `parseCalendarDate` / `formatCalendarDate`: a calendar date is a `yyyy-MM-dd` string, never an instant. The `from`/`to` parameters follow this rule.
  - `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` + `apps/api/src/modules/assignments/assignments.service.ts` — the DTO-decorator + service `validateSync` re-check pattern, and the strict `HH:mm` / `dayOfWeek 0–6` rules this endpoint reuses for validation consistency.
- **No date library on the API side** (`apps/api/package.json` declares neither `date-fns` nor `luxon`; `date-fns` is a web-app dependency that no `apps/web/src` file imports today). Instant → local conversion therefore uses `Intl.DateTimeFormat(..., { timeZone }).formatToParts`, the same technique `apps/web/src/shared/lib/datetime.ts` already uses (`utcOffsetMinutes`). **No new dependency.**
- **Ordering and shape**: the payload is sorted in the service so the contract is deterministic and directly assertable (no client re-sort).

### Proposed files

`apps/api/src/modules/calendar/` — `calendar.module.ts`, `calendar.controller.ts`, `calendar.service.ts`, `dto/list-calendar-events-query.dto.ts`, `calendar.service.spec.ts`, `calendar-data-scoping.spec.ts`, `calendar-e2e.spec.ts`; plus `apps/api/src/app.module.ts` and `apps/api/src/test/test-http.ts`.

### Open questions

None blocking. The event payload shape is fixed by the shared contract; the frontend's presentation of it is SP-127B's business.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is rejected with field-level 400s (date shape, range order, span cap, unknown parameters).
3. Every read is scoped to the authenticated student; the data-scoping spec proves no cross-student row is reachable.
4. API errors are actionable: 400 field map, 401 unauthenticated, uniform 404 where a record is addressed.
5. Not applicable — no UI in this child.
6. Not applicable — no UI in this child.
7. Not applicable — no UI in this child.
8. Business rules have automated tests: unit (recurrence, DST, zone, typing, ordering), data-scoping, and integration specs.
9. The endpoint is documented in the [EP04 README](../README.md#shared-api-contract). **No migration.**
10. Integrated review — covered by the combined SP-127 review.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** `GET /calendar/events` returns the student's normalized, correctly-dated, ownership-scoped event list for a date range.
- **Request/token estimate:** ~2–2.5 requests/tokens — one new module (controller + service + DTO), the recurrence/zone/order logic, module registration in two places, and three spec files (unit, data-scoping, integration).
- **Model recommendation:** 4 — the correctness risk is concentrated here (DST boundaries, week-range limits, instant→local bucketing, and ownership), and a subtle error is invisible in the UI but wrong in the data. A frontier model is recommended.
- **Files:** `apps/api/src/modules/calendar/{calendar.module.ts,calendar.controller.ts,calendar.service.ts,dto/list-calendar-events-query.dto.ts,calendar.service.spec.ts,calendar-data-scoping.spec.ts,calendar-e2e.spec.ts}` (all new), `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`.
- **Start context:** this story file; the [EP04 README](../README.md#shared-api-contract) (exact request/response shape); `apps/api/prisma/schema.prisma` (the five models involved); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/common/lib/calendar-date.ts`; `apps/api/src/common/pipes/validation.pipe.ts`; `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts`; `apps/api/src/modules/assignments/assignments.service.ts` (the validateSync re-check pattern); `apps/api/src/test/test-http.ts`.
- **Verification:** `pnpm --filter api test -- calendar` (unit + data-scoping + integration specs; the integration spec self-skips without `DATABASE_URL`), `pnpm --filter api typecheck`, `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP02 + EP03 (complete). Excludes any write path, the availability CRUD (SP-128A), new dependencies, and migrations.
