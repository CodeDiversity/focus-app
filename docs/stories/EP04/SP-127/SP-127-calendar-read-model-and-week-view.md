# SP-127: Weekly Academic Calendar

**Story ID:** SP-127
**Title:** Academic calendar: one event read model plus the weekly calendar page
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Milestone:** M2
**Layer:** Backend + Frontend (two children)
**Status:** Draft — SP-127A `Ready`, SP-127B `Needs refinement`.
**Dependencies:** EP02 + EP03 (both complete). No EP04 predecessor.
**Jira key:** Pending creation

## Summary

A student opens a calendar and sees their week: recurring class meetings, assignment and exam deadlines, and study sessions, each on its correct local date, each openable for details, each identifiable by type without relying on color. One read model (`GET /calendar/events`) returns every event type for a date range as a single normalized payload; the week view renders it. The calendar respects the time zone the student selected in their profile, and recurring weekly meetings stay at their local wall-clock time across daylight-saving changes.

## Description & bounded scope

### In scope

1. **`SP-127A` (backend):** the calendar event read model — `GET /calendar/events?from&to` over a new `calendar` module. It resolves the student's stored `User.timeZone`, expands recurring weekly `ClassMeeting`s onto the calendar dates in the range, converts assignment/exam deadlines and study sessions from instants into that zone, buckets recurring `AvailabilitySlot`s into available-window and blocked-time events, and returns one sorted, normalized event list.
2. **`SP-127B` (frontend):** the `/calendar` page — the week view, week navigation, the event details dialog, and the loading/empty/error states, in the StudyPilot visual system (the redesigned Assignments and Courses pages).

### Out of scope

- Creating study sessions (EP06/EP07 own creation — D404-6).
- Availability management — SP-128 (its own parent and page).
- The mobile agenda presentation — SP-129.
- The dashboard's "today" widgets — EP05.
- Any new UI library, any backend change outside the new `calendar` module, any migration.

## Source requirement references

- **Epic AC-E04-01, -02, -03, -06, -07, -08** — ownership table in the [SP-127 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1–8 apply; item 9 is satisfied by the shared contract (no migration); items 10–11 belong to the combined parent review.
- **Decisions:** D404-1…D404-8, D404-10, D404-13 in the [EP04 README](../README.md#decision-register).

## Acceptance criteria

1. **Weekly read model:** `GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD` returns `timeZone`, `today`, `from`, `to`, and a sorted `events` array; `from`/`to` are inclusive calendar dates in the student's zone, `from` must not be after `to`, and the span may not exceed 31 days.
2. **Recurring class meetings:** every meeting of the student's active courses appears on each calendar date in the range whose weekday matches the meeting's `dayOfWeek`, at the meeting's stored local `startTime`/`endTime`, unchanged across daylight-saving transitions.
3. **Deadlines:** every assignment with a `dueDate` inside the range appears on the local date and time of that instant in the student's zone; assignments typed `EXAM` are typed `EXAM_DEADLINE`, all others `ASSIGNMENT_DEADLINE`; a completed or graded assignment keeps its deadline and is flagged `completed`.
4. **Study sessions:** every `StudySession` overlapping the range appears with its local start/end and a `focus` flag; EP04 creates none (D404-6).
5. **Availability:** recurring available windows and recurring blocked times appear as `AVAILABILITY` / `BLOCKED_TIME` events on the matching weekdays of the range.
6. **Archived courses:** a meeting of an archived course never appears; an assignment deadline from an archived course does (D404-7).
7. **Details:** the week view opens an event's details (dialog) with its type, title, time, and course (and an assignment's completed state) — AC-E04-06.
8. **Type distinction:** every event type is identifiable without color — an icon and a text label, in the details dialog and in the event chip (AC-E04-08).
9. **Time zone:** the payload's `timeZone` is the student's stored profile zone and the page labels it; the API accepts no zone parameter (D404-3).
10. **States and accessibility:** loading, empty ("no events this week"), and error-with-retry states exist; the week view is keyboard-operable with visible focus; it is usable on desktop, tablet, and mobile (the mobile presentation itself is SP-129).

## Tests to add / update

### Backend (SP-127A)

- `apps/api/src/modules/calendar/calendar.service.spec.ts` — recurrence expansion onto the range's weekdays; a meeting's local time is identical before and after a DST transition date; deadline and session instants convert into the student's zone; `today` reflects the zone, not the server's; ordering (date → startTime → type → id); the 31-day span cap and `from`/`to` validation; empty range → empty `events`, not an error.
- `apps/api/src/modules/calendar/calendar-data-scoping.spec.ts` — student B's calendar contains none of student A's meetings, assignments, sessions, or availability slots.
- `apps/api/src/modules/calendar/calendar-e2e.spec.ts` (integration, `apps/api/src/test/test-http.ts`) — 200 shape; 400 on a malformed `from`, `from > to`, an over-long span, and an unknown query parameter (`tz`, `courseId`, `userId`); 401 unauthenticated; a seeded study session appears in the payload (the AC-E04-03 read-path proof).
- `apps/api/src/test/test-http.ts` — register the new `CalendarModule` (the harness builds the module graph explicitly).

### Frontend (SP-127B)

- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` — renders the week header and the event chips; navigates weeks (previous/next/today); opens and closes the details dialog (Escape closes, focus returns); renders the loading, empty, and error-with-retry states; announces the result count through the `role="status"` live region; labels the time zone.
- `apps/web/src/features/calendar/ui/CalendarEventChip.test.tsx` — one chip per event with its type icon and text label; the completed-deadline label; the link to the owning course.
- `apps/web/src/entities/calendar/api/calendarApi.test.ts` — the client sends only `from`/`to` and maps the response.

### End-to-end

- `apps/web/e2e/calendar.spec.ts` (new) — the real-stack journey: a course with a meeting, an assignment with a deadline, and a calendar page that shows both on the right days and opens the details dialog.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- **No calendar module exists.** `apps/api/src/modules/` = assignments, auth, courses, email, onboarding, prisma, semesters, users. `apps/api/src/app.module.ts` registers each feature module explicitly — EP04 adds `CalendarModule` there and in `apps/api/src/test/test-http.ts`.
- **Models** (`apps/api/prisma/schema.prisma`): `ClassMeeting` (userId, courseId, dayOfWeek 0–6, startTime/endTime `HH:mm`, `@@unique([courseId, dayOfWeek, startTime])`); `Assignment` (userId, courseId?, dueDate `DateTime?` nullable, status `AssignmentStatus`, type `AssignmentType?`); `StudySession` (userId, startTime/endTime instants, `isFocusMode @default(true)`, notes); `AvailabilitySlot` (userId, dayOfWeek, startTime, endTime, `isAvailable @default(true)`); `User.timeZone String @default("UTC")`.
- **Conventions to copy:** `apps/api/src/common/ownership/ownership.ts` (`ownedWhere(userId, id)`; uniform 404 `Resource not found`); `apps/api/src/common/pipes/validation.pipe.ts` (global whitelist + `forbidNonWhitelisted` → 400 on unknown body/query fields); `apps/api/src/common/decorators/current-user.decorator.ts` (`@CurrentUser()` — the principal has id/email/name only, **not** the time zone: the service reads `User.timeZone` from the database); `apps/api/src/common/lib/calendar-date.ts` (the `yyyy-MM-dd` parse/format precedent — a calendar date is a plain date, never an instant); the courses/assignments DTO + service re-check pattern (`validateSync` in the service as defense in depth).
- **No date library on the API side.** `apps/api/package.json` declares neither `date-fns` nor `luxon` (`date-fns` is a web-app dependency that no `apps/web/src` file imports today). The zone conversion therefore uses `Intl.DateTimeFormat(..., { timeZone })` with `formatToParts` — the same technique `apps/web/src/shared/lib/datetime.ts` already uses (`utcOffsetMinutes`), so **no new dependency** is introduced.
- **Frontend conventions:** entity API modules are plain axios over `@/shared/api/httpClient` (`entities/course/api/courseApi.ts`, `entities/assignment/api/assignmentApi.ts`); types live in `entities/<entity>/model/types.ts` (the `entities/user/model/types.ts` pattern) or `shared/types/academic.ts`; routes register in `apps/web/src/app/App.tsx`; the authenticated nav is `apps/web/src/widgets/header/ui/Header.tsx`; FSD layer order is enforced by `import/no-restricted-paths` in `apps/web/.eslintrc.cjs` (a page may import features/entities/shared but not upward).
- **Design reference:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` (SP-126) — header + upper-right action, `max-w-5xl` shell, a `role="status"` count header, distinct empty/no-match/error states.

### Proposed placement (new paths, FSD)

- Backend: `apps/api/src/modules/calendar/` — `calendar.module.ts`, `calendar.controller.ts`, `calendar.service.ts`, `dto/list-calendar-events-query.dto.ts`, plus the specs listed above.
- Frontend: `apps/web/src/entities/calendar/api/calendarApi.ts` (+ `model/types.ts`), `apps/web/src/features/calendar/ui/` (chips, week view, details dialog), `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (+ test).

### Open items for the ui-refiner (SP-127B, D404-9)

Week-view layout (time grid vs. day columns), event-chip density, week start (Sunday vs. Monday), the visible hour range, the day-column header format, the details-dialog presentation, the empty/error illustrations, and the exact copy. These are deliberately undecided; `ui-refiner` records them in SP-127B before implementation.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is validated — range shape, order, span cap, and unknown query parameters all produce field-level 400s (SP-127A).
3. Every read is scoped to the authenticated student; a foreign row is never reachable (SP-127A).
4. API errors produce actionable messages (400 field map / 401 / uniform 404).
5. Loading, empty, and error states render (SP-127B).
6. Keyboard operability and visible focus across the week view, chips, and details dialog (SP-127B).
7. Responsive layouts work on desktop and mobile (SP-127B; the mobile agenda presentation is SP-129).
8. Business rules (recurrence expansion, zone conversion, ordering, ownership) have automated tests (SP-127A) and the UI has component tests (SP-127B).
9. The API contract is documented in the [EP04 README](../README.md#shared-api-contract). No migration.
10. Integrated review in a development environment — the combined SP-127 review covers the browser pass.
11. The reviewer saves the final walkthrough for this parent.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** `GET /calendar/events` returns one normalized, correctly-dated, ownership-scoped event list for a date range (SP-127A), and the `/calendar` page renders that week with details, states, and accessibility (SP-127B).
- **Request/token estimate:** ~2–3 requests/tokens total across two children: SP-127A (new module + DTO + expansion/zone logic + unit/data-scoping/integration specs) ≈ 2–2.5; SP-127B (entity client + week view + chips + details dialog + component tests) ≈ 2–3.
- **Model recommendation:** 4 — the backend child's correctness hinges on time-zone and recurrence edge cases (DST boundaries, week-range limits, instant→local conversion) where a subtle error is invisible in the UI but wrong in the data; the frontend child is routine composition, but it shares the boundary. A frontier model is recommended for SP-127A; SP-127B is a 2–3.
- **Files:**
  - `apps/api/src/modules/calendar/calendar.module.ts` (new)
  - `apps/api/src/modules/calendar/calendar.controller.ts` (new)
  - `apps/api/src/modules/calendar/calendar.service.ts` (new)
  - `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts` (new)
  - `apps/api/src/modules/calendar/calendar.service.spec.ts` (new)
  - `apps/api/src/modules/calendar/calendar-data-scoping.spec.ts` (new)
  - `apps/api/src/modules/calendar/calendar-e2e.spec.ts` (new)
  - `apps/api/src/app.module.ts`
  - `apps/api/src/test/test-http.ts`
  - `apps/web/src/entities/calendar/api/calendarApi.ts` (new) + `model/types.ts` (new) + test
  - `apps/web/src/features/calendar/ui/` (new: week view, event chip, details dialog + tests)
  - `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (new) + test
  - `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`
  - `apps/web/e2e/calendar.spec.ts` (new)
- **Start context:** this story file; the [SP-127 README](./README.md) (contract, decisions, dependencies); the [EP04 README](../README.md#shared-api-contract) (the exact request/response shape); `apps/api/prisma/schema.prisma` (the five models involved); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/common/lib/calendar-date.ts`; `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` (the `HH:mm` + `dayOfWeek` validation precedent); `apps/api/src/test/test-http.ts`; `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` (design references); `apps/web/src/entities/course/api/courseApi.ts` (entity-client pattern).
- **Verification:** `pnpm --filter api test -- calendar`, `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec against the self-contained test stack.
- **Dependencies / exclusions:** depends on EP02 and EP03 (both complete). Excludes study-session creation (EP06/EP07), availability management (SP-128), the mobile agenda (SP-129), dashboard widgets (EP05), any new dependency, and any migration.
