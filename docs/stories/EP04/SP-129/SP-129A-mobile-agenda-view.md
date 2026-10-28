# SP-129A: Mobile Agenda Presentation

**Story ID:** SP-129A
**Title:** Frontend — the calendar's narrow-screen agenda: the week as a day-grouped list
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-129](./SP-129-mobile-agenda-view.md)
**Milestone:** M2
**Layer:** Frontend
**Status:** Needs refinement — `ui-refiner` pass required before implementation (D404-9). Not ready to code.
**Dependencies:** SP-127B implemented.
**Jira key:** Pending creation

## Summary

A `CalendarAgenda` component renders the calendar's week as a vertical, day-grouped list for narrow screens: the same events, in start-time order within each day, each entry keeping its type label and opening the shared details dialog. One thumb scrolls it; nothing pans sideways.

## Description & bounded scope

### In scope

1. **A new `CalendarAgenda` component** (`apps/web/src/features/calendar/ui/CalendarAgenda.tsx`) that takes the same normalized event list the week view renders and lays it out as day groups.
2. **A viewport switch on the calendar page** — the agenda replaces the grid at narrow widths, using the repo's existing `sm:` breakpoint conventions (the Assignments page's `flex-col`/`sm:flex-row` and the Courses page's `grid-cols-1 sm:grid-cols-2` pattern).
3. **Reuse of SP-127B's pieces** — the entity client, the event types, the type label, and the details dialog are shared, not re-implemented.
4. **Narrow-screen behavior** — no horizontal scrolling at 375px, comfortable tap targets, readable type labels.

### Out of scope

- Filters, per-day jump indexes, or any behavior the calendar payload does not already provide.
- A separate mobile route, a native app, or an offline mode.
- Any new UI library or backend change.

## Source requirement references

- **Epic AC-E04-01, AC-E04-08** — ownership table in the [SP-129 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1, 5, 6, 7, 8 apply; items 10–11 belong to the combined parent review.
- **Decisions:** D404-2 (no zone arithmetic in the client), D404-9 (the presentation is deliberately undecided), D404-10.

## Acceptance criteria

1. `CalendarAgenda` groups the payload's events by `date`, preserving the payload's order within a day (the payload is already sorted by date then `startTime`, so the grouping preserves it).
2. Every event in the payload renders exactly once — none dropped, none duplicated.
3. Each entry shows its time, its title, and its type label; the type is identifiable without color.
4. Activating an entry opens SP-127B's details dialog; Escape closes it and focus returns to the entry.
5. Days with no events are omitted rather than rendered as empty groups.
6. At 375px the agenda produces no horizontal scrolling; tap targets meet the repo's `max-sm:min-h-[44px]` convention for interactive controls.
7. The calendar page's loading, empty, and error states render in the agenda form as well.
8. The agenda is keyboard-operable with visible focus; each day group is a labelled group for assistive technology.

## Tests to add / update

- `apps/web/src/features/calendar/ui/CalendarAgenda.test.tsx` (new)
  - Groups events by day in payload order; renders each event exactly once.
  - Omits days with no events.
  - Each entry carries its type label (text, not only color).
  - Activating an entry opens the details dialog; Escape returns focus to the entry.
  - The empty state renders when the payload has no events.
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` (extended) — the agenda is used at the narrow viewport and the week view at the wide viewport.
- `apps/web/e2e/calendar.spec.ts` (extended) — a phone-sized viewport shows the agenda with the day's events in order, and the details dialog opens from an entry.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- The calendar page and its components are new in SP-127B; this child adds one component and edits the page's viewport switch.
- Responsive conventions in the codebase: `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (toolbar `flex-col sm:flex-row sm:flex-wrap`, controls `h-[42px] max-sm:min-h-[44px]`, `max-w-5xl` shell with `px-4 sm:px-6 lg:px-8 py-12`); `apps/web/src/pages/courses/ui/CoursesPage.tsx` (SP-126 — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`). The agenda reuses the `sm:` breakpoint rather than introducing a new one.
- Styling: Tailwind only (`apps/web/tailwind.config.js`, `apps/web/src/index.css`); `clsx` and `tailwind-merge` are available. No new UI library.
- Accessibility conventions: `jsx-a11y` is enforced in `apps/web/.eslintrc.cjs`; the shared `Button`/`Input` components carry the focus-ring tokens; the existing pages use `role="status"` live regions and `aria-label`s on icon-only controls.

### Proposed files

`apps/web/src/features/calendar/ui/CalendarAgenda.tsx` (new) + `CalendarAgenda.test.tsx` (new); `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (the viewport switch — SP-127B's file); `apps/web/e2e/calendar.spec.ts` (extended).

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

The day-group header (date vs. weekday + date), the per-entry layout (time beside the title vs. above it), where the type label sits, the treatment of a completed deadline, the empty-state copy, and the exact breakpoint at which the agenda replaces the grid.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no new read; the same principal-scoped payload.
4. Not applicable — no new request; the calendar page's error state is reused.
5. Loading, empty, and error states render in the agenda form.
6. Keyboard operability, visible focus, and labelled day groups.
7. Responsive layout verified at 375px, tablet, and desktop.
8. Component tests for the agenda, plus the e2e journey at a phone viewport.
9. Not applicable — no API change.
10. Integrated review in a development environment — the combined SP-129 review covers the browser pass.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** the calendar renders a scannable, day-grouped agenda on narrow screens, reusing SP-127B's data and interactions.
- **Request/token estimate:** ~1–2 requests/tokens — one presentational component, its component test, a viewport switch in the page, and the e2e extension.
- **Model recommendation:** 2 — a presentational component over an existing contract with no new logic; a value model suffices once the presentation is settled.
- **Files:** `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` (new), `apps/web/src/features/calendar/ui/CalendarAgenda.test.tsx` (new), `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (edit), `apps/web/e2e/calendar.spec.ts` (edit).
- **Start context:** this story file; SP-127B's story file and implementation (`apps/web/src/features/calendar/ui/`, `apps/web/src/pages/calendar/ui/CalendarPage.tsx`); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (responsive and state conventions).
- **Verification:** `pnpm --filter web test -- src/features/calendar src/pages/calendar`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec at a phone viewport.
- **Dependencies / exclusions:** SP-127B implemented. Excludes filters, per-day indexes, a separate route, native apps, and new UI libraries.
