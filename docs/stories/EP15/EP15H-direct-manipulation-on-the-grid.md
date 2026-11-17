# EP15H — Direct Manipulation on the Grid: Select to Create, Drag to Move, Resize

**Story ID:** EP15H
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend (pointer enhancement)
**Status:** Needs refinement — refiner pass for drag affordances, snapping feedback, live announcements and the resize handle treatment (D15-16), bound by D15-14
**Dependencies:** EP15G implemented (the sheet this pre-fills; the two-choice prompt it reuses). Epic decisions D15-10, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** on a pointer device the student drags across free space to create (the sheet opens pre-filled), drags an event or study block to move it, and drags its edge to resize it; weekly items ask the same two-choice question before anything changes; times snap to 15 minutes.
- **Why it improves it:** blocking out a week becomes a few gestures (product, AC-E15-10); nothing new is persisted by a gesture that the form path cannot also do, so keyboard users lose nothing (code, AC-E15-10 "identical results").
- **Decisions needing you:** none ▲ — D-H1…D-H3 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The pointer layer over EP15E's grid and EP15G's sheet. It introduces no new
API call and no new question — it only pre-fills and submits what the sheet
already does.

## Scope

**In:** drag-select on free/shaded grid cells, move and resize of `EVENT`/`STUDY_BLOCK` chips, 15-minute snapping, Escape cancel, live-region feedback, reduced motion, tests (pointer events in jsdom; one Playwright drag journey is EP15J's).
**Out:** touch gestures (the agenda's form path serves touch), dragging classes, deadlines, planned or study sessions (they belong to their owners), any API change.

## Source requirement references

AC-E15-10 (pointer half); TR-E15-08, TR-E15-11; DoD-5, DoD-6, DoD-8.

## Acceptance criteria

1. Dragging across a day column's free or shaded cells shows a live selection snapped to 15 minutes and, on release, opens EP15G's sheet pre-filled with that date, start and end; Escape during the drag cancels with nothing persisted; a click without drag does nothing.
2. Dragging an `EVENT` or `STUDY_BLOCK` chip moves it and dragging its bottom edge resizes it, both snapped to 15 minutes and clamped to the grid's visible range; a one-off item is saved on release via `PATCH` (same day or another day). For a weekly item: a **same-day** move or resize first shows EP15G's two-choice prompt and then follows exactly EP15G's wiring; a **cross-day** drag always behaves as "Just this day" without the prompt — `POST` a one-off on the new date, then cancel the source occurrence (EP15G's order) — and announces "Moved this day's <title> to <Day HH:mm–HH:mm>; other weeks unchanged"; changing a series' weekdays is done in the sheet's chips (R-EP15-03). Other item kinds are not draggable and show no handles.
3. Every move or resize announces its result in the status region ("Moved to Tue 14:00–15:00") and re-reads the week; animations respect `prefers-reduced-motion`; every pointer action has the sheet as its keyboard equivalent and nothing is reachable only by pointer.

## Tests (TR-E15-08)

- Select-to-create: pointer sequence → sheet opened with snapped values; Escape cancels; click-only does nothing.
- Move/resize: one-off → one `PATCH` with snapped values; weekly same-day → prompt first, then the EP15G wiring; weekly cross-day → no prompt, `POST` then occurrence cancel, announcement text, series `weekdays` unchanged (Mon/Wed/Fri series, Wed dragged to Thu); non-draggable kinds have no handles/handlers; clamp at the grid edges.
- Announcements and refetch; reduced-motion class; a grep-style assertion that no handler exists on the grid that lacks a sheet equivalent (list of actions ↔ sheet capabilities).

## Technical notes

- **Inspected:** `WeekGrid` as specified by EP15E (15-minute CSS grid rows → pixel↔minute mapping is a pure function); `shared/ui/Dialog` return-focus behaviour; EP13K reduced-motion handling (summary level).
- **Proposed:** `features/schedule-blocks/lib/dragModel.ts` (pure: pointer y → minute, snapping, clamping) with unit tests; pointer-event handlers on `WeekGrid` behind an `editable` prop; `setPointerCapture` for drags.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-H1 | Snap: (a) 15 minutes; (b) 5; (c) 30 | **(a)** — matches the grid rows and the engine's typical block sizes; fewer fiddly targets (D15-14) | Proposed |
| D-H2 | Weekly same-day drag: (a) always ask the two-choice question before saving; (b) default to "this and following" silently | **(a)** — a silent series move is the kind of surprise that erodes trust | Proposed |
| D-H4 | Weekly cross-day drag: (a) always "Just this day" (one-off on the new date + cancel the source occurrence), announced, no prompt — a series' weekdays change only in the sheet; (b) ask the two-choice question and define "this and following" as a weekday swap in the successor | **(a)** — "this and following" has no defined meaning for a multi-weekday series (Mon/Wed/Fri, Wed → Thu); one gesture, one outcome, said out loud (D15-14) | Proposed |
| D-H3 | Touch: (a) no touch gestures in v1 — below `sm` the agenda's form path is the editor; (b) long-press drag | **(a)** — scroll vs drag conflicts on phones; the form is two taps | Proposed |

## Definition of Done

1, 5 (selection/drag states), 6 (nothing pointer-only), 8 (TR-E15-08), TR-E15-11 manual pass recorded. 2/3/4 N/A (no new inputs or API). 7 N/A by design (pointer ≥ `sm`). 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** blocking out a week takes a few drags, and nothing is lost for keyboard users.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/features/calendar/ui/WeekGrid.tsx` (pointer handlers), `apps/web/src/features/schedule-blocks/lib/dragModel.ts` (new) + tests, `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (wiring).
- **Start context:** this story (incl. the refiner's rows); EP15E's grid geometry; EP15G's sheet props and prompt.
- **Verification:** `pnpm --filter @studypilot/web test -- calendar schedule-blocks` green; manual: drag-create, move a weekly item (prompt appears), resize a one-off.
- **Dependencies / exclusions:** EP15G. Playwright drag journey → EP15J.
