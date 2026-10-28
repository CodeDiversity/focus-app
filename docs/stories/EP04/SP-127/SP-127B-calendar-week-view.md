# SP-127B: Weekly Calendar View (UI)

**Story ID:** SP-127B
**Title:** Frontend — the `/calendar` week view: events, details, and states
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-127](./SP-127-calendar-read-model-and-week-view.md)
**Milestone:** M2
**Layer:** Frontend
**Status:** Ready — ui-refiner pass complete (D404-9).
**Dependencies:** SP-127A implemented (the read model it renders).
**Jira key:** Pending creation
**Refined:** 2026-10-28

## Summary

The `/calendar` page shows the student's week: recurring class meetings, assignment and exam deadlines, and study sessions on their correct local dates, each chip identifiable by type without relying on color, each openable in a details dialog. The page follows the StudyPilot visual system established by the redesigned Assignments and Courses pages, with clear loading, empty, and error states.

## Description & bounded scope

### In scope

1. **A new `/calendar` route** (`apps/web/src/pages/calendar/ui/CalendarPage.tsx`), registered in `apps/web/src/app/App.tsx` inside `ProtectedRoute`, and reachable from the authenticated header nav (`apps/web/src/widgets/header/ui/Header.tsx`).
2. **The week view** — a `features/calendar/ui/` surface that renders the events of one week from `GET /calendar/events`, with previous/next/today week navigation.
3. **Event chips** — one per event, showing its time, title, and a type icon plus a text label (AC-E04-08), with the course color as a secondary cue only.
4. **The details dialog** — opening an event shows its type, title, date and time, and course (and the completed state for a deadline), with a link to the owning course (AC-E04-06). Escape closes it and focus returns to the trigger (the `ArchiveCourseDialog` pattern).
5. **States** — loading, empty ("no events this week"), and error-with-retry, plus an always-present `role="status"` live region announcing the week and the event count.
6. **Time-zone label** — the payload's `timeZone` is displayed so the student can see which zone the week is rendered in (AC-E04-07).

### Out of scope

- Creating or editing events (the calendar is read-only — D404-6).
- The availability editor (SP-128B) — the calendar page links to it ("Manage availability"), it does not embed it.
- The mobile agenda presentation (SP-129) — this story builds the responsive week view; the agenda list is a separate child.
- The dashboard's today-widgets (EP05).
- Any new UI library or backend change.

## Source requirement references

- **Epic AC-E04-01, -02, -03, -06, -07, -08** — ownership table in the [SP-127 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1, 5, 6, 7, 8 apply here; item 10/11 belong to the combined parent review.
- **Decisions:** D404-2 (the server pre-buckets — the page does no zone arithmetic), D404-8 (completed deadlines stay and are labelled), D404-9 (this story's presentation is deliberately undecided), D404-10 (plain-axios entity client).

## Acceptance criteria

1. `/calendar` renders the selected week from `GET /calendar/events?from&to`; the previous, next, and "today" controls move the week and the results follow.
2. Every event in the payload renders as one chip on the correct local day, showing its time and title.
3. Each event type is identifiable without color — every chip carries a type icon and a text label, and the details dialog repeats the type as text.
4. Activating a chip opens a details dialog with the event's type, title, date, time, and course; a deadline shows its completed state; a course-linked event links to `/courses/:id`.
5. The details dialog closes on Escape and returns focus to the chip that opened it.
6. The page shows the payload's time zone, and the header states which week is displayed.
7. The page renders a loading state while the request is in flight, an empty state ("no events this week") when the payload has no events, and an error state with a working retry when the request fails.
8. An always-present `role="status"` live region announces the displayed week and the number of events.
9. The page is fully keyboard-operable: week navigation, chips, and the dialog are reachable and activatable by keyboard, with visible focus indicators and accessible names on icon-only controls.
10. The layout works from 375px to desktop; the mobile agenda presentation is SP-129's responsibility.

## Tests to add / update

- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` (new)
  - Renders the week header, the time-zone label, and one chip per event with its type label.
  - Previous/next/today re-query with the new `from`/`to` and re-render.
  - Opens the details dialog from a chip; Escape closes it and focus returns to the chip.
  - Loading state, empty state, and error-with-retry (a rejected request then a successful one).
  - The `role="status"` region announces the week and the event count.
- `apps/web/src/features/calendar/ui/CalendarEventChip.test.tsx` (new)
  - The chip renders its icon and text label per type (no color-only distinction); a completed deadline renders its "Completed" text label.
  - The chip's course link points at `/courses/:id`.
- `apps/web/src/features/calendar/ui/CalendarEventDetails.test.tsx` (new) — the dialog's fields, its completed state, its link, and its focus restoration.
- `apps/web/src/entities/calendar/api/calendarApi.test.ts` (new) — the client sends only `from`/`to` and maps the response payload to the entity types.
- `apps/web/e2e/calendar.spec.ts` (new) — the real-stack journey: a course with a meeting and an assignment with a deadline appear on the right days of the week, and the details dialog opens.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- **No calendar code exists in the web app** — no `pages/calendar`, `features/calendar`, or `entities/calendar`; `apps/web/src/app/App.tsx` has no `/calendar` route and `apps/web/src/widgets/header/ui/Header.tsx` has no Calendar nav entry (Home / Dashboard / Semesters / Courses / Assignments / Profile).
- **Design references** (both read): `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — `max-w-5xl` shell, header with the action upper-right, a toolbar outside the results card, a `role="status"` count header, distinct empty/no-match/error states, `h-[42px]` controls with `max-sm:min-h-[44px]`; and `apps/web/src/pages/courses/ui/CoursesPage.tsx` + `apps/web/src/features/courses/ui/CourseCard.tsx` + `CourseActionsMenu.tsx` (SP-126) — the card grid, the three-dot menu's keyboard model, and the "Courses"/"My Courses" header treatment. The calendar page follows the same system.
- **Dialog pattern** to copy: `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` — `role="dialog"`, Escape cancels, focus returns to the trigger. No shared dialog component exists in `apps/web/src/shared/ui/` (only `Button`, `Input`, `Select`), so the calendar dialog is a `features/calendar/ui/` component.
- **Entity client pattern** to copy: `apps/web/src/entities/course/api/courseApi.ts` — plain axios over `@/shared/api/httpClient`, types in `entities/<entity>/model/types.ts` (the `entities/user/model/types.ts` shape) or `shared/types/academic.ts`. RTK Query exists only in `features/session/api/sessionApi.ts` (D404-10).
- **Live-region pattern** to copy: `apps/web/src/pages/courses/ui/CoursesPage.tsx` — an always-present `role="status"` region that is empty at rest so changes are announced.
- **FSD placement** (enforced by `import/no-restricted-paths` in `apps/web/.eslintrc.cjs`): the page in `pages/calendar/ui/`, the calendar components in `features/calendar/ui/`, the client and types in `entities/calendar/`. The page may import features/entities/shared; features may import entities/shared; entities may import shared only.

### Proposed files

`apps/web/src/entities/calendar/api/calendarApi.ts` (+ `model/types.ts`, + test), `apps/web/src/features/calendar/ui/{WeekView,CalendarEventChip,CalendarEventDetails}.tsx` (+ tests), `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (+ test), `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts`.

### Decisions (ui-refiner, 2026-10-28)

- **D127B-1 — Layout:** desktop week view uses seven day columns; each day is a vertical stack of event chips sorted by `startTime` ascending. No hour grid and no overlap columns — the server already sorts events, and a stacked list is simpler and ADHD-friendly. Week navigation (previous / next / today) sits in a toolbar above the grid.
- **D127B-2 — Week start:** Monday. The week range sent to the API is Monday 00:00 through Sunday 23:59 in the payload's zone; "today" selects the week containing the current date.
- **D127B-3 — Day-column header:** short weekday + date, e.g. "Mon 26" (weekday abbreviated, day number) on desktop; on narrow screens the weekday is the full three-letter name and the date stays. The current day's column header is bolded and gets a subtle `bg-primary-50` tint on the column.
- **D127B-4 — Chip anatomy:** each chip shows the start time (`HH:mm`), the event title, and a type icon + text label (e.g. "Class", "Deadline", "Exam", "Study session", "Available", "Blocked"). The course color is a 3px left border only (secondary cue). A completed deadline chip shows an additional "Completed" text badge with a check icon. The chip's accessible name is "{type label}: {title}, {time}".
- **D127B-5 — Type labels and icons (lucide-react):** CLASS → `GraduationCap` "Class"; ASSIGNMENT_DEADLINE → `ClipboardList` "Assignment"; EXAM_DEADLINE → `FileText` "Exam"; STUDY_SESSION → `Brain` "Study session" (focus variant adds " (focus)" to the label); AVAILABILITY → `CheckCircle2` "Available"; BLOCKED_TIME → `Ban` "Blocked". Icons are `aria-hidden`.
- **D127B-6 — Details view:** modal dialog (copying `ArchiveCourseDialog`): `role="dialog"`, `aria-modal="true"`, Escape closes, focus trapped, focus returns to the opening chip. Fields: type label (with icon), title, date (formatted via `shared/lib/datetime`), time range (or "All day"/point time for deadlines), course name (colored dot + name) linking to `/courses/:id`, completed state for deadlines ("Completed" / "Not completed"), focus flag for study sessions. A "Close" button plus the course link button.
- **D127B-7 — Loading state:** skeleton grid — seven day columns each with 2–3 pulsing placeholder chips (Tailwind `animate-pulse`), matching the real chip height, so layout does not shift. A visually-hidden "Loading calendar…" text.
- **D127B-8 — Empty state:** when the payload has zero events, render an in-grid empty panel spanning all columns: `CalendarDays` icon, "No events this week", and a hint "Try another week, or add a course meeting or assignment." plus a "Manage availability" link to `/availability`.
- **D127B-9 — Error state:** a `role="alert"` card with "We could not load your calendar. Try again." and a "Try again" `Button` (retry re-issues the same range). Mirrors the Assignments error card.
- **D127B-10 — Live region:** an always-present `role="status"` region (empty at rest) announcing "{week label} · {n} event(s)" after each successful load, plus a spinner while fetching.
- **D127B-11 — Time-zone label:** placed in the page header next to the week label as "{from} – {to} · {timeZone}" (e.g. "Oct 26 – Nov 1, 2026 · America/New_York"). The week label uses the payload's `from`/`to` dates formatted via `shared/lib/datetime` `formatDate`.
- **D127B-12 — Header wording:** page title "Calendar"; subtitle "Your week at a glance."; primary actions in the header's upper right: "Today" (secondary), "Previous week" / "Next week" (ghost icon buttons with accessible names), and a "Manage availability" link button to `/availability`.
- **D127B-13 — Navigation controls:** icon-only previous/next buttons use `ChevronLeft`/`ChevronRight` with `aria-label="Previous week"` / "Next week"; the "Today" button is a text button. All have visible focus rings (`focus:ring-2 focus:ring-primary-500`) and `min-h-[44px]` on mobile.
- **D127B-14 — Responsive:** desktop shows the 7-column grid. At `< 768px` the grid becomes a horizontally scrollable row of day columns (each column min-width 140px, snap scrolling) so all seven days stay reachable without collapsing to the agenda (SP-129 owns the agenda). Chip text truncates with `truncate`; tap targets are `min-h-[44px]` on mobile.
- **D127B-15 — Copy:** empty "No events this week"; loading "Loading your calendar…"; error "We could not load your calendar. Try again."; status "Showing {n} event(s) for {week label}." (singular/plural). Manage-availability link text "Manage availability".
- **D127B-16 — Client date arithmetic:** the page computes the Monday of the selected week and the Sunday, formats both as `YYYY-MM-DD`, and sends them as `from`/`to`. No time-zone arithmetic beyond deriving the civil Monday from the selected date (the server owns zone conversion, D404-2). The selected date is held as a `Date` in local civil time.

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

All gaps listed in the original story are now settled by decisions D127B-1…D127B-16 above.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input beyond the week range the client sends; the client's date arithmetic mirrors the API contract.
3. Not applicable — no new read or write; the client calls the principal-scoped read model.
4. Applicable — API error messages surface as the actionable error state with a retry.
5. Loading, empty, and error states render.
6. Keyboard operability, visible focus, and accessible names on icon-only controls.
7. Responsive layout verified on desktop and mobile (the agenda presentation is SP-129).
8. Component tests in `pages/calendar` and `features/calendar`, plus an e2e journey.
9. Not applicable — no API change.
10. Integrated review in a development environment — the combined SP-127 review covers the browser pass.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** the `/calendar` page renders a week of normalized events with details, states, and full keyboard/responsive behavior.
- **Request/token estimate:** ~2–3 requests/tokens — the entity client and types, the week view + chip + details dialog, the page with its route and nav entry, the component tests, and the e2e journey. The `ui-refiner` pass settles the layout first, which is what keeps this bounded.
- **Model recommendation:** 3 — ordinary composition over a settled contract with an established visual system, but the chip density and grid layout carry real presentation risk; a strong mid-tier model is right.
- **Files:** `apps/web/src/entities/calendar/api/calendarApi.ts` (new), `apps/web/src/entities/calendar/model/types.ts` (new), `apps/web/src/features/calendar/ui/` (new: week view, event chip, details dialog + tests), `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (new) + test, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts` (new).
- **Start context:** this story file; the [EP04 README](../README.md#shared-api-contract) (the payload the page renders); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` (design references); `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` (dialog pattern); `apps/web/src/entities/course/api/courseApi.ts` (client pattern); `apps/web/src/app/App.tsx` and `apps/web/src/widgets/header/ui/Header.tsx` (route and nav registration).
- **Verification:** `pnpm --filter web test -- src/pages/calendar src/features/calendar src/entities/calendar`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec against the self-contained test stack.
- **Dependencies / exclusions:** SP-127A implemented. Excludes any write path, the availability editor (SP-128B), the mobile agenda (SP-129), and new UI libraries.