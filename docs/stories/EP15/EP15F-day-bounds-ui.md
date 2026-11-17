# EP15F — Day Bounds UI: "When Does Your Day Start and End?"

**Story ID:** EP15F
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Frontend
**Status:** Queued — small surface specified in-story (D15-16, EP13J precedent), bound by D15-14
**Dependencies:** EP15B (API) and EP15E (the grid the sheet is opened from) implemented. Epic decisions D15-13, D15-14 (ratified 2026-11-16).

## Plan at a glance

- **What this changes:** a dismissible banner on the calendar while bounds are unconfigured, and one small sheet — "Same every day" on by default with a single wake/sleep pair, or seven rows when switched off — that saves all seven bounds in one request; the grid's shaded regions re-render on save.
- **Why it improves it:** the student sets their day in two taps and is never blocked or nagged (product, AC-E15-01, D15-14); bounds are edited where they are seen, nothing new in Settings (D15-14 rule 7).
- **Decisions needing you:** none ▲ — D-F1…D-F3 ratify by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

The first thing a student can personalise, kept to the minimum: one
question, one default answer, one switch for people whose weekends differ.

## Scope

**In:** `features/day-bounds/ui/{DayBoundsBanner, DayBoundsSheet}.tsx`, `shared/ui/Switch.tsx` (new, `role="switch"`; owned here because EP15F lands first — EP15G D-G9 reuses it; R-EP15-14), `entities/day-bounds/api`, wiring into the calendar page (banner slot; shaded-region label as a second entry point), validation mirror, status announcements, tests.
**Out:** block editing (EP15G), onboarding wizard changes (none — the banner is the nudge).

## Source requirement references

AC-E15-01; TR-E15-06, TR-E15-11; DoD-2, DoD-4, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. While `GET /schedule/day-bounds` reports `configured: false`, the calendar shows a one-line banner ("Your days run 08:00–23:00 for now. When does your day usually start and end? **Set it**") with a dismiss control; dismissing hides it for the rest of the session; it is never a modal and nothing else is blocked; it disappears permanently once bounds are saved.
2. The sheet opens from the banner and from the shaded region's label on the grid; "Same every day" is on by default with one wake/sleep pair pre-filled from the current (or default) values; switching it off reveals seven rows (Monday first) pre-filled; Save sends exactly seven entries via `PUT /schedule/day-bounds`; client validation mirrors the API (`HH:mm`, sleep after wake); a native `type="time"` input cannot enter `24:00`, so a sleep value of `00:00` means midnight and is sent as `24:00` and displayed back as `00:00` with the helper text "00:00 means midnight" (the D-G6 mapping; R-EP15-11); a 400 maps to the matching field.
3. After a successful save the sheet closes, focus returns to its trigger, the week re-reads (shading and free time update), and the status region announces "Day start and end saved."; the sheet is the shared `Dialog` (focus trap, Escape, no stacked dialogs), every control is ≥ 44px on mobile, and the time inputs are native `type="time"`.

## Tests (TR-E15-06)

- Banner: shown only when `configured: false`; dismiss hides for the session (sessionStorage) and reappears in a new session; hidden after save.
- Sheet: default pair; switch reveals seven rows with values; "same every day" expansion sends seven identical entries; per-day save sends the seven rows; validation mirror cases; `00:00` sleep → `24:00` in the PUT body and `00:00` on re-open (R-EP15-11); 400 field mapping; success flow (close, focus return, announcement, refetch call).
- Keyboard: open from both entry points, tab order, Escape; 44px class assertions on the narrow viewport.

## Technical notes

- **Inspected:** `AvailabilitySlotForm.tsx` (shared `Dialog`, zod mirror, `getFieldError` mapping, `data-dialog-commit`), `AvailabilityPage.tsx` (status region pattern D128B-12), `shared/ui/{Dialog,Input,Select,Button}`; the EP13D/EP13E dismissible banner pattern on the dashboard (summary level).
- **Proposed:** `entities/day-bounds/api/dayBoundsApi.ts` (axios, `entities/availability` pattern), `features/day-bounds/ui/*`; sessionStorage key `sp.dayBoundsBannerDismissed`.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-F1 | Dismiss persistence: (a) session-scoped (`sessionStorage`), no server field; (b) a `User.preferences` key | **(a)** — the nudge returns next visit until bounds are set, which is the point; no settings sprawl (D15-14) | Proposed |
| D-F2 | "Same every day" semantics: (a) a client-only switch that expands one pair to seven rows on save; the API stays seven-entry `PUT`; (b) an API flag | **(a)** — one contract, the simplification lives where the student sees it | Proposed |
| D-F3 | Pre-fill: (a) the current effective values (defaults when unconfigured); (b) empty inputs | **(a)** — a student who only wants to change the evening edits one field | Proposed |

## Definition of Done

1, 2 (mirror), 4 (API messages surfaced per field), 5 (sheet loading/error), 6 (dialog + keyboard), 7 (narrow layout, 44px), 8 (TR-E15-06), TR-E15-11 manual pass recorded. 3/9 N/A. 10–11 via the EP15 combined review.

## Sizing

- **Outcome:** a student sets their day in two taps and sees the grid change.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/src/entities/day-bounds/{api,model}/*` (new), `apps/web/src/features/day-bounds/ui/{DayBoundsBanner,DayBoundsSheet}.tsx` (new) + tests, `apps/web/src/pages/calendar/ui/CalendarPage.tsx` (banner slot, entry point).
- **Start context:** this story; contracts.md § API (day bounds); `AvailabilitySlotForm.tsx` as the dialog pattern; EP15E's shaded-region label.
- **Verification:** `pnpm --filter @studypilot/web test -- day-bounds calendar` green; manual: save with "same every day", reload, banner gone, shading moved.
- **Dependencies / exclusions:** EP15B, EP15E. Blocks → EP15G.
