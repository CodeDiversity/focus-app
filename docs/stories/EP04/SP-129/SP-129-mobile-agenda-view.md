# SP-129: Mobile Agenda View

**Story ID:** SP-129
**Title:** Mobile agenda — the week's events as a scannable vertical list
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Milestone:** M2
**Layer:** Frontend (one child)
**Status:** Implemented — SP-129A reviewed and passed (2026-10-29); parent DoD 10–11 satisfied.
**Dependencies:** SP-127B implemented (the event data and shared event components it reuses).
**Jira key:** Pending creation

## Summary

On a phone, the calendar becomes an agenda: the same week of events as the desktop grid, re-laid-out as a vertical, day-grouped list that scrolls with one thumb and needs no horizontal panning. Each entry keeps the type label, opens the same details dialog, and respects the same time-zone semantics.

## Description & bounded scope

### In scope

1. **`SP-129A` (frontend):** an agenda presentation of the calendar payload — the same events SP-127B renders, grouped by day and ordered by start time within the day, laid out as a vertical list.
2. It reuses SP-127B's client, event types, type labels, and details dialog — no second data path, no second contract.
3. Narrow-screen behavior: no horizontal scrolling, comfortable tap targets, and a readable type label per entry.

### Out of scope

- A separate mobile route or a native app (the MVP is a responsive web app).
- Filters, per-day jump indexes, or any behavior not already in the calendar payload.
- The desktop week view (SP-127B).
- Any new UI library or backend change.

## Source requirement references

- **Epic AC-E04-01, AC-E04-08** — ownership table in the [SP-129 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1, 5, 6, 7, 8 apply; items 10–11 belong to the combined parent review.
- **Decisions:** D404-2, D404-9, D404-10 in the [EP04 README](../README.md#decision-register).

## Acceptance criteria

1. On a narrow viewport the calendar renders an agenda: the week's events grouped by day, in start-time order within each day.
2. The agenda shows the same events as the desktop week view for the same payload — no event is dropped or duplicated.
3. Each entry shows its time, title, and type label; the type is identifiable without color.
4. An entry opens the same details dialog as the desktop view, and Escape returns focus to the entry.
5. The agenda does not scroll horizontally at 375px; tap targets are comfortable and text remains readable.
6. The loading, empty, and error states of the calendar page are shown in the agenda form as well.
7. The agenda is keyboard-operable with visible focus, and remains usable with a screen reader (each day is a labelled group).

## Tests to add / update

- `apps/web/src/features/calendar/ui/CalendarAgenda.test.tsx` (new)
  - Groups the payload's events by day, in start-time order within the day.
  - Renders every event exactly once.
  - Each entry carries its type label and opens the details dialog; Escape returns focus to the entry.
  - The empty state is shown when the payload has no events.
- `apps/web/src/pages/calendar/ui/CalendarPage.test.tsx` (extended by SP-127B) — the agenda is the presentation used at the narrow viewport, and the desktop week view is used at the wide viewport (a viewport-driven assertion).
- `apps/web/e2e/calendar.spec.ts` (SP-127B's spec, extended) — a phone-sized viewport shows the agenda with the day's events in order and opens the details dialog.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- No agenda code exists in the web app. The calendar page and its components are new in SP-127B (`pages/calendar/ui/CalendarPage.tsx`, `features/calendar/ui/`).
- Responsive conventions already in the codebase: the Assignments page stacks its toolbar with `flex-col` and `sm:flex-row` and uses `max-sm:min-h-[44px]` on controls; the Courses page (SP-126) uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for its card grid. The agenda follows the same breakpoint conventions rather than introducing new ones.
- Tailwind is the only styling system (`apps/web/tailwind.config.js`, `apps/web/src/index.css`); `clsx` and `tailwind-merge` are available. No new UI library is introduced.

### Proposed files

`apps/web/src/features/calendar/ui/CalendarAgenda.tsx` (new) + test, the calendar page's viewport switch (SP-127B's file), and the `apps/web/e2e/calendar.spec.ts` extension.

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

The agenda's structure: how a day group is headed (date label vs. weekday + date), how the time is presented per entry, whether the type label sits inline or on a second line, the visual treatment of a completed deadline, the empty state, and the breakpoint at which the agenda replaces the grid.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input.
3. Not applicable — no new read; the same principal-scoped payload.
4. Not applicable — no new request; the error state is the calendar page's.
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

- **Outcome:** the calendar renders a scannable, day-grouped agenda on narrow screens, reusing SP-127B's data and interaction model.
- **Request/token estimate:** ~1–2 requests/tokens — one new presentation component, its tests, the viewport switch in the calendar page, and the e2e extension.
- **Model recommendation:** 2 — a presentational component over an existing contract with no new logic; a value model is sufficient once the `ui-refiner` has settled the presentation.
- **Files:** `apps/web/src/features/calendar/ui/CalendarAgenda.tsx` (new) + test, `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (viewport switch — SP-127B's file), `apps/web/e2e/calendar.spec.ts` (extended).
- **Start context:** this story file; SP-127B's story file and its implementation (`apps/web/src/features/calendar/ui/`, `apps/web/src/pages/calendar/ui/CalendarPage.tsx`); the [EP04 README](../README.md#shared-api-contract) (the payload it renders); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (responsive conventions).
- **Verification:** `pnpm --filter web test -- src/features/calendar src/pages/calendar`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec at a phone viewport.
- **Dependencies / exclusions:** SP-127B implemented. Excludes filters, per-day indexes, a separate route, native apps, and new UI libraries.
