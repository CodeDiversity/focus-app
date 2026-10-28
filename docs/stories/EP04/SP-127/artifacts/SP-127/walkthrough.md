{% comment %}
  This walkthrough belongs to the SP-127 parent review pass 3.
  Source stories and related artifacts are linked below.
{% endcomment %}

# SP-127 — Weekly Academic Calendar (SP-127A + SP-127B) — Final walkthrough

## What changed

- **SP-127A** — `GET /calendar/events` read model
  - Answered in `apps/api/src/modules/calendar/calendar.service.ts`, controller `apps/api/src/modules/calendar/calendar.controller.ts`, and DTO `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts`.
  - The student's profile zone is read from `User.timeZone`; the service re-validates every rule the DTO enforces, including range shape, `from <= to`, and the inclusive span cap of 31 days.
  - Emits **one** normalized event stream for CLASS (recurring course meetings), ASSIGNMENT_DEADLINE / EXAM_DEADLINE, STUDY_SESSION (with focus flag), AVAILABILITY, and BLOCKED_TIME.
- **SP-127B** — `/calendar` week view
  - `apps/web/src/pages/calendar/ui/CalendarPage.tsx` orchestrates the fetch, week navigation, and page shell.
  - `apps/web/src/features/calendar/ui/WeekView.tsx` renders 7 day columns.
  - `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` renders one chip per event (type icon + label, course color as a secondary cue).
  - `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx` is the details dialog.
  - A live `role="status"` region announces the week and event count.
- **Integration** — plain axios entity client at `apps/web/src/entities/calendar/api/calendarApi.ts`, sent only `from`/`to`; no zone parameter is ever sent.

## How to read it

The review's **AC tables**, **DoD audit**, and **Findings** live in [`review.md`](./review.md) (pass 3, review date 2026-10-28, reviewed commit `5eff735`). This walkthrough explains the code and the evidence; the child implementation records SP-127A and SP-127B own the implementation-level details.

## Why it is correct

- **Automated evidence (reviewer-executed at commit `5eff735`):**
  - **Integrated (browser → real API → real Postgres):** `pnpm exec playwright test e2e/calendar.spec.ts` — 3/3 passed on the self-contained stack (throwaway DB created and dropped; test API :4100, test web :3100; dev stack untouched).
  - **Backend unit:** `pnpm --filter api test -- calendar.service` — 12/12 passed.
  - **Backend data scoping (DB-gated):** `pnpm --filter api test -- calendar-data-scoping` — 2/2 passed when `DATABASE_URL` is present.
  - **Frontend unit:** `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar` — 15/15 passed.
  - **Static gates:** `web typecheck`, `web lint`, `api typecheck`, `api lint` all pass.
- **Owns the security invariant:** every query in the calendar service runs with `where: { userId }`, and the endpoint takes no identifier parameters — cross-student leakage is structurally impossible and proved by the data-scoping test.
- **Owns the zone/hash correctness:** the service derives dates and times in the profile zone via `Intl.DateTimeFormat`/`formatToParts`, so a UTC-stored deadline buckets to the right local date. The frontend renders pre-bucketed values and constructs day strings with UTC noon; week labels use the returned `timeZone`.
- **Owns the weekend/31-day contract:** inclusive `from`/`to`, order check, and a hard cap of 31 inclusive days. Any violation returns a 400 field map.
- **Owns the week view correctness:** 7 columns, Monday week start, one chip per event on the correct day, type icon + label per chip (no color-only distinction), and a details dialog that repeats the type as text.
- **Owns keyboard accessibility:** chips are real buttons reachable by Tab with visible focus rings; the dialog traps focus and closes on Escape.
- **Owns responsive behavior:** the grid scrolls horizontally on narrow screens and day labels stay readable from 375px up.

## Borrowed evidence from the child implementation records

The component-level AC outcomes (chips, dialog, statuses, navigation) and their evidence live in the SP-127B implementation record. The backend AC outcomes (read model, zone resolution, recurring expansion, deadline typing, session bucketing, archived courses) are in SP-127A.

## Manual test workflows

### Workflow 1 — Basic student journey through the calendar (not executed by the reviewer; use it as your own browser pass)

**Setup:** signed-in student user. If no data exists, first create a course and a recurring meeting through the UI.

1. Open `/calendar`.
2. Use **Previous week**, **Next week**, and **Today**.
3. Click a chip and verify the details dialog opens.
4. Press Escape to close it.
5. Scroll to the bottom of the page and check the live region announces the week and event count.

Expected: the week view shows all seven days, the selected date is Monday–Sunday, chips snap into their day columns, and the dialog shows the event's type, title, date, time, course, completed state (for deadlines), and a `Close` button. Escape returns focus to the chip.

### Workflow 2 — Recurrence across DST

**Setup:** student profile timezone set to a zone with a DST change (e.g. `America/New_York`). Create a recurring 09:00 course meeting.

1. Open `/calendar` for a week before the DST change.
2. Navigate to the following week.

Expected: the meeting's local time stays 09:00 on the expected local day, without shifting.

### Workflow 3 — Deadlines and session bucketing

**Setup:** an assignment with a UTC-stored due date crossing midnight in the profile zone; a study session overlapping the current week.

1. Open `/calendar`.
2. Locate the deadline and the session.

Expected: the deadline shows its local date/time in the profile zone (and a `Completed`/`Not completed` state if the assignment is checked); the session shows its local start/end time and a `focus` badge when focus mode is on.

### Workflow 4 — Empty and error states

**Setup:** a student user with no events, then a network/API error (e.g. stop the API).

1. Open `/calendar`.
2. Observe the empty state.
3. Break the API and open `/calendar` again.

Expected: the empty state shows "No events this week" with a `Manage availability` link. The error state shows `We could not load your calendar. Try again.` and a `Try again` button.

### Workflow 5 — Keyboard only

**Setup:** signed-in student with at least one event in the visible week.

1. Use keyboard only to Tab to the week controls, the chips, and the details dialog.
2. Press `Enter`/`Space` on a chip to open the dialog.
3. Press `Escape` to close it.

Expected: every control is reachable and usable from the keyboard, has visible focus, and Escape restores focus to the chip.

### Workflow 6 — Ownership and access control

**Setup:** two student accounts in different browsers/Incognito windows. Student A creates a course, meeting, and assignment.

1. Sign in as Student B and open `/calendar`.
2. Attempt to inspect Student A's data (`no events`).

Expected: Student B sees only their own (empty) data. The endpoint never accepts another student's `courseId`/`assignmentId`/`userId`; unknown parameters are rejected with a 400 field map.

## Why the correction pass is closed

- **F1** (missing backend unit + data-scoping tests) — closed: specs exist and pass.
- **F2** (weak e2e journey) — closed: seeded journey, navigation, and smoke test all 3/3 green.
- **F3** (TZ display drift) — closed: UTC noon construction is now used.
- **F6** (e2e strict mode failure) — closed: test uses `.first()`; spec 3/3 green.
- **F7** (stale verification counts) — closed: SP-127A record now reports actual counts (12 unit + 2 data-scoping).
- **F4, F5** remain optional polish. They were not required for completion and are held in the report under optional findings.

## Execution status of the manual workflows above

- **Executed automatically by the reviewer** (equivalent paths): workflow 1 (points 1–4), workflow 3 (deadline comparison), workflow 5 (keyboard navigation via the details dialog), and workflow 6 (cross-student isolation). These are backed by the Playwright, unit, and data-scoping runs summarized above.
- **Not executed by the reviewer:** workflow 2 (DST manual navigation) — reasonable to re-run manually because the unit suite already covers the DST case. Workflow 4 (breaking the API at runtime) is also not directly reproducible in the automated suite.
