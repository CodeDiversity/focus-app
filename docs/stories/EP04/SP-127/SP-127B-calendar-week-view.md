# SP-127B: Weekly Calendar View (UI)

**Story ID:** SP-127B
**Title:** Frontend — the `/calendar` week view: events, details, and states
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-127](./SP-127-calendar-read-model-and-week-view.md)
**Milestone:** M2
**Layer:** Frontend
**Status:** Needs refinement — `ui-refiner` pass required before implementation (D404-9). Not ready to code.
**Dependencies:** SP-127A implemented (the read model it renders).
**Jira key:** Pending creation

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

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

- Week-view layout: a time grid (hours down the side, days across) vs. day columns with stacked events; the visible hour range and the density of overlapping chips.
- The week start (Sunday vs. Monday) and the day-column header format.
- Chip anatomy: what is shown at a glance (time + title only vs. course code), how a completed deadline is marked in text, and how the type label is rendered (icon + word vs. word only).
- The details dialog's presentation and whether it is a modal dialog or a side panel.
- The empty, loading, and error illustrations and copy; the exact wording of the header, the week label, and the "Manage availability" link.
- The time-zone label's placement and phrasing.

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
