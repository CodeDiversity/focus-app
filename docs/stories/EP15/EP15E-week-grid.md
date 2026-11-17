# EP15E — The Week Grid: Hour Axis, Day Bounds, Free Time

**Story ID:** EP15E
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend
**Status:** Needs refinement — refiner pass for grid layout, hour range, free-time display threshold, item density and copy (D15-16), bound by D15-14
**Dependencies:** EP15D implemented (payload). Epic decisions D15-9, D15-10, D15-12, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** `/calendar` renders an hour-axis week grid: Monday–Sunday columns, timed items positioned by start/end, the hours outside wake–sleep shaded, free time drawn and labelled, deadlines and flex planned sessions in a day-level row; the current week and its headers come from the server's civil dates (FU-EP04-01); the narrow-screen agenda shows the same items.
- **Why it improves it:** a student sees their real week and where study fits, instead of a list of chips (product, AC-E15-08/12); the week range stops depending on the browser clock (AC-E15-09, the FU-EP04-01 defect).
- **Decisions needing you:** none ▲ — D-E1…D-E4 ratify by default (D15-17); the refiner records the layout rows.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Rebuild the read-only calendar on the new payload. No editing yet: EP15F
adds the bounds sheet, EP15G the block sheet, EP15H dragging. The grid is
the one surface everything else attaches to, so it is deliberately quiet:
few colours, text and icon markers, nothing interactive that does not open
details.

## Scope

**In:** `pages/calendar`, `features/calendar/ui/{WeekGrid (new), CalendarAgenda, CalendarEventChip, CalendarEventDetails}`, `entities/calendar` types/API, week derivation from server dates, states, keyboard order, reduced motion, component tests; the existing `calendar.spec.ts` kept green at the journey level (full rewrite is EP15J).
**Out:** any write (EP15F/G/H), the Plan page's own week grid (`features/study-plan/ui/WeekGrid.tsx`, unchanged).

## Source requirement references

AC-E15-08 (rendering), AC-E15-09 (client), AC-E15-12; carried-forward AC-E04-01/02/03/06/07/08; TR-E15-05, TR-E15-11; DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. Above the `sm` breakpoint the calendar is a seven-column week grid with an hour axis whose visible range covers at least the week's earliest wake to latest sleep (exact range: refiner); every timed item (`CLASS`, `EVENT`, `STUDY_BLOCK`, `STUDY_SESSION`, FIXED `PLANNED_SESSION`) is positioned by its start and end; deadlines and `FLEX_DAY` planned sessions sit in a day-level row above the hours. Each kind keeps a text label and icon (never colour alone), and activating any item opens its details.
2. Hours outside `[wakeTime, sleepTime)` are shaded per day with an accessible name ("Before your day starts" / "After your day ends"); each `free` interval is drawn and labelled ("Free · 14:00–16:00"); pieces shorter than the refiner's threshold are drawn but not labelled.
3. The visible week, its day headers and the "today" marker derive from the server's `today`/`from`/`to` by civil-date string arithmetic; "Today" returns to the server's `today`; previous/next step seven civil days. With a profile zone of `Pacific/Kiritimati` and a browser zone of `Etc/GMT+12` the headers are the profile zone's week, no event is dropped, and the marked column equals `today` (FU-EP04-01 evidence a–d).
4. Below `sm` the agenda lists the same days with bounds, items and free intervals in time order and opens the same details; the loading skeleton, the error state with retry, and the empty week ("Nothing on your calendar yet — it's all free time" with the bounds still drawn) are implemented; items are reachable by keyboard in time order within a day, with a visible focus ring; motion respects `prefers-reduced-motion`.

## Tests (TR-E15-05)

- Grid: positions from start/end (snapshot of computed styles or data attributes); all-day row contents; kind markers text+icon for every type; details open on click and Enter.
- Bounds/free: shading accessible names; free labels; threshold behaviour.
- Week derivation: the 26-hour-spread fixture (headers, no dropped events, today marker); Today/prev/next arithmetic; `new Date()` local getters absent from date derivation (grep test on the page module).
- Agenda parity; states; keyboard order; reduced motion class present.

## Technical notes

- **Inspected:** `CalendarPage.tsx` (`mondayOf`/`formatYMD` browser-local; `useNarrowViewport`; request sequencing; status region), `WeekView.tsx` (chip columns, `dayHeader` at civil noon), `CalendarEventChip.tsx` / `CalendarEventDetails.tsx` (kind vocabulary table), `entities/calendar/api/calendarApi.ts`, EP04 README FU-EP04-01 (required evidence a–d), `features/study-plan/ui/WeekGrid.tsx` (summary only — a positioned-grid precedent to borrow from, unverified).
- **Proposed:** `features/calendar/ui/WeekGrid.tsx` (new) with CSS grid rows per 15 minutes and `grid-row` spans from minutes; `pages/calendar/lib/week.ts` (pure civil-date helpers: `mondayOf(civil)`, `addDays`); `entities/calendar/model/types.ts` adds `days`, `EVENT`, `STUDY_BLOCK`, `blockId`, `recurring`, `energy` and removes the two old types.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-E1 | Hour range: (a) dynamic — the week's min wake to max sleep, padded to whole hours, never less than 08:00–22:00; (b) fixed 00:00–24:00 with scroll | **(a)** — shows the student's day, not a wall of empty night (D15-14); the refiner may adjust the padding | Proposed |
| D-E2 | Free-time pieces in this story: (a) non-interactive, labelled only; (b) clickable to add | **(a)** — EP15H makes them create targets; EP15G's "Add" button is the baseline path | Proposed |
| D-E3 | Details dialog: (a) extend `CalendarEventDetails` on the shared `Dialog` for `EVENT`/`STUDY_BLOCK` (EP15G adds its buttons); (b) a popover | **(a)** — one dialog pattern, focus handling already solved (EP12B) | Proposed |
| D-E4 | Agenda free time: (a) one "Free" line per interval between items; (b) a per-day total only | **(a)** — the same information as the grid, same labels | Proposed |

## Definition of Done

1, 5 (states), 6 (keyboard order, focus ring, dialog), 7 (grid ≥ `sm`, agenda below), 8 (TR-E15-05), TR-E15-11 manual pass recorded. 2/3/4/9 N/A (read-only client). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** the student's week, bounds and free time are visible at a glance, in the right zone.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (+ `lib/week.ts` new), `apps/web/src/features/calendar/ui/{WeekGrid.tsx (new), WeekView.tsx (removed), CalendarAgenda.tsx, CalendarEventChip.tsx, CalendarEventDetails.tsx}`, `apps/web/src/entities/calendar/model/types.ts`, tests beside each.
- **Start context:** this story (incl. the refiner's rows); contracts.md § Calendar read model; `CalendarPage.tsx`; FU-EP04-01 in the EP04 README.
- **Verification:** `pnpm --filter @studypilot/web test -- calendar` green; the 26-hour-spread test passes; `pnpm test:e2e -- calendar` journeys green at the smoke level.
- **Dependencies / exclusions:** EP15D payload. Writes → EP15F/G/H; full E2E rewrite → EP15J.
