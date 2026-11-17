# EP15G — Add, Edit and Delete Events and Study Blocks Through One Sheet

**Story ID:** EP15G
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend
**Status:** Needs refinement — refiner pass for the sheet's layout, the weekday chips, the "More" disclosure, the two-choice prompt copy and the in-place delete affordance (D15-16), bound by D15-14
**Dependencies:** EP15B (API) and EP15E (grid + details dialog) implemented. Epic decisions D15-5, D15-6, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** one "Add" action on the calendar opens one sheet — Busy or Study, date and times pre-filled, title optional, a "Repeats weekly" switch that reveals weekday chips, and a "More" disclosure for end date, course and energy; edit and delete live in the item's details; a weekly occurrence asks exactly one question with two answers ("Just this day" / "This and following"); the agenda gets the same Add and the same sheet.
- **Why it improves it:** every event and study block is created or changed in one place with defaults that are usually right (product, AC-E15-03/04/06/10/11, D15-14); the form and keyboard path exists before any drag gesture, so parity is the baseline (code).
- **Decisions needing you:** none ▲ — D-G1…D-G5 ratify by default (D15-17); the refiner records layout rows.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The editor. Kept deliberately small: two kinds, one switch, one disclosure,
one question with two answers. Nothing the student does not need is on the
screen until they ask for it.

## Scope

**In:** `features/schedule-blocks/ui/{BlockSheet, WeeklyChoicePrompt}.tsx`, `entities/schedule-block/api`, the "Add" button on the calendar (grid and agenda), Edit/Delete in `CalendarEventDetails` for `EVENT`/`STUDY_BLOCK`, the two-choice wiring to the API, refetch + announcements, client validation mirror, tests.
**Out:** pointer gestures (EP15H), bounds (EP15F), class meetings (course-owned, link only).

## Source requirement references

AC-E15-03, AC-E15-04, AC-E15-06 (UI), AC-E15-10 (form + keyboard half), AC-E15-11, AC-E15-12 (details actions); TR-E15-07, TR-E15-11; DoD-2, DoD-4, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. "Add" opens the block sheet with: a Busy / Study toggle (default Busy); date (the viewed week's today or the selected day); start and end (next whole hour, one hour long); optional title with the placeholder "Busy" or "Study"; a "Repeats weekly" switch that, when on, shows seven weekday chips with the date's weekday pre-selected; a "More" disclosure holding "Ends on" (weekly only) and, for Study only, Course and Energy (default Normal). Save creates via `POST /schedule/blocks`; a 400 maps to its field; a foreign-course 404 shows the uniform message.
2. From an `EVENT` or `STUDY_BLOCK` details dialog, Edit opens the same sheet pre-filled with the kind toggle hidden, and Delete is available in place (no second dialog). On a weekly item Save and Delete first ask one question — "Just this day" or "This and following" — and wire it as: just-this-day edit → cancel the occurrence then `POST` a one-off with the edited values (one action, one announcement); just-this-day delete → `DELETE …/occurrences/:date`; this-and-following edit → `PATCH` with `effectiveFrom` = the item's date; this-and-following delete → `DELETE ?from=` the item's date. A one-off item asks nothing.
3. Below `sm` the agenda has the same "Add" and opens the same sheet; its items open the same details with Edit and Delete; results are identical to the grid path.
4. The sheet is the shared `Dialog` (focus trap, Escape, focus returns to the trigger); the weekday chips are a labelled checkbox group operable by keyboard; every control is ≥ 44px on mobile; duplicate submission is prevented; after any change the week re-reads and the status region announces the change ("Busy added", "Study block updated for this and following weeks", "Removed for this day").

## Tests (TR-E15-07)

- Create: defaults (kind, date, hour, duration); weekly switch reveals chips with the pre-selected day; "More" hidden by default and Study-only fields absent for Busy; payload shape for one-off and weekly; 400 field mapping; 404 message.
- Edit/delete: kind toggle hidden; one-off → no prompt; weekly → prompt; each of the four wirings issues exactly the specified requests in order; cancellation of the prompt changes nothing.
- Agenda: Add present; sheet identical; details actions present.
- Keyboard: chips group semantics, tab order, Escape, focus return; 44px on narrow; duplicate-submit guard; announcements.

## Technical notes

- **Inspected:** `AvailabilitySlotForm.tsx` (dialog form pattern: zod mirror, `FIELD_ERROR_FIELDS`, 400/404/409 handling, `requestClose` frozen while submitting), `CalendarEventDetails.tsx` (dialog per event type), `shared/ui/Dialog.tsx` focus restore (EP14 note), `entities/course/api` (course list for the Course select).
- **Proposed:** `entities/schedule-block/api/scheduleBlockApi.ts` (list/create/patch/delete/cancelOccurrence); `features/schedule-blocks/ui/BlockSheet.tsx` and `WeeklyChoicePrompt.tsx` (a two-button inline prompt inside the same dialog, not a stacked dialog); the details dialog's Delete turns into an inline "Remove? Yes / No" pair (D-G5).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-G1 | "Just this day" edit: (a) cancel the occurrence + create a one-off, as one client action; (b) a server endpoint | **(a)** — D15-5 as ratified; no new API | Proposed |
| D-G2 | Default kind: (a) Busy; (b) last used | **(a)** — predictable; most additions are real-life commitments | Proposed |
| D-G3 | Sheet container: (a) the shared `Dialog` (the refiner may style it as a bottom sheet below `sm`); (b) a new drawer primitive | **(a)** — one primitive, focus handling solved | Proposed |
| D-G4 | Title: (a) optional with kind placeholder; (b) required | **(a)** — the kind is the title for most blocks (D15-14) | Proposed |
| D-G5 | Delete confirmation: (a) inline two-step inside the details dialog ("Remove? Yes / No"), never a stacked dialog; weekly items get the two-choice question instead; (b) the existing delete-confirmation dialog | **(a)** — one dialog on screen at a time; two taps either way | Proposed |

## Definition of Done

1, 2 (mirror), 4 (per-field API messages), 5 (sheet states), 6 (dialog, chips, keyboard), 7 (narrow sheet, 44px, agenda), 8 (TR-E15-07), TR-E15-11 manual pass recorded. 3/9 N/A. 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** everything on the calendar can be added, changed and removed from one small sheet, on any screen size.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/entities/schedule-block/{api,model}/*` (new), `apps/web/src/features/schedule-blocks/ui/{BlockSheet,WeeklyChoicePrompt}.tsx` (new) + tests, `apps/web/src/features/calendar/ui/CalendarEventDetails.tsx`, `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (Add button, sheet mount), `CalendarAgenda.tsx` (Add).
- **Start context:** this story (incl. the refiner's rows); contracts.md § API (blocks, PATCH semantics); `AvailabilitySlotForm.tsx`; EP15E's details dialog.
- **Verification:** `pnpm --filter @studypilot/web test -- schedule-blocks calendar` green; manual: add a weekly Busy, edit "this and following", cancel one day, confirm the grid.
- **Dependencies / exclusions:** EP15B, EP15E. Drag → EP15H; retirement of the old page → EP15I.
