# EP17E — Editable week grid

**Story ID:** EP17E
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Frontend
**Status:** **Needs refinement** (D17-11) — the in-place interaction model is genuinely unsettled and is deliberately **not** invented here.
**Dependencies:** EP17D.

## Plan at a glance

- **What this changes:** the proposed week stops rendering twice. The 7-column grid itself becomes the editable surface — change a session's day, start, length, pin state or delete it, with undo, right where the session is drawn — and the separate `PlanSessionEditor` list below it disappears. Day labels become "Wed 19 Nov" instead of `2026-11-19`.
- **Why it improves it:** today a student who wants to move one session has to look at the grid, scroll past it, find the same session again in a second list of form rows, and edit it there (`PlanProposal.tsx:182-202`). That is two mental models of one week and an unnecessary search, which is exactly the kind of friction that makes a student abandon the proposal (product). In code it removes a whole duplicated rendering of the same data and the drift risk between them (code).
- **Decisions needing you:** ▲ D17-4 (in-place editing) is **Ruled (user, 2026-11-19)**. ▲ D-E1 below (the interaction model) is the real open question and is **for the refiner to ground, not for the planner to invent**; a recommendation is recorded so nobody is blocked.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Replace the `PlanWeek` + `PlanSessionEditor` pair with one editable week
region. Every capability `PlanSessionEditor` has today survives — day, start
time, end time, Move earlier / Move later, Shorten / Lengthen, Delete with
undo, Pin to this time / Make flexible, per-row conflict marking, and the
polite announcement after each change — but it is reached on the session, in
the week, instead of in a second list. Day headings and every rendered date
become human-readable.

## Scope

**In:** the editable week component (new, in `features/plan-proposal/ui/` or
`features/study-plan/ui/` — the refiner's call), its integration into
`PlanProposal`, the removal of the duplicate rendering, human day labels, and
component tests.

**Out:** the rest of the page's composition and the decision controls
(EP17F); the spread presets (EP17G); rendering on the EP15 calendar grid
(BL-16-02's deferred half); `PlanWeek`'s other callers, if any — the
implementer checks and either keeps or retires the component accordingly.

## Source requirement references

AC-E17-09, AC-E17-10, AC-E17-12 (the per-session half), AC-E17-13;
TR-E17-05; DoD-1, DoD-2, DoD-5, DoD-6, DoD-7, DoD-8.

## Acceptance criteria

1. The proposed week is rendered **once**. For each session, a student can,
   without leaving that session's place in the week: change its day, change
   its start, change its length, pin it / make it flexible, and delete it with
   an undo affordance. The standalone read-only grid and the standalone
   editor list no longer both exist on the page.
2. Every edit has a keyboard path, visible focus, and a result announced once
   in a polite live region; focus stays on or returns to the edited session
   after a change, and after an undo. Moving a `FLEX_DAY` session or typing a
   start time pins it and says so; resizing does not pin
   ([contracts §6](./contracts.md#6-proposal-surface-contract-ep17eep17f-own-it),
   carried over from EP13H D-H5).
3. No raw ISO date is shown to a student anywhere in the proposal: day
   headings, the day selector and any session label read as weekday + day +
   month in the plan's time zone.
4. Conflicts are still marked on the session they belong to — the conflicted
   session is visually and textually identifiable (not by colour alone) and
   carries its reason text, as `PlanSessionEditor` does today.
5. Loading, empty and error states are preserved: the skeleton week while
   loading, the "Nothing new to schedule" empty state, and the error card
   with **Try again**; on a narrow viewport the week is usable (no horizontal
   scrolling trap, 44 px targets).

## Tests

Component tests (TR-E17-05), each by keyboard **and** by pointer:

- change a session's day → the session moves to the new day column; the
  announcement names the new day in human form.
- change start → the session's time updates, a `FLEX_DAY` session pins, the
  announcement says it was pinned.
- lengthen / shorten → duration updates, the anchor does **not** change.
- pin → make flexible → the window hint is derived from the start, never
  stale.
- delete → the session leaves the week; undo restores it at its original
  position; focus is handled.
- a conflicted session is marked and names its reason; the mark is not
  colour-only.
- loading skeleton, empty state, error card.
- a negative: an edit that would move a session outside the day's bounds is
  refused without corrupting the session (the existing `clampTime` /
  `moveBy` guards, `PlanSessionEditor.tsx:33-39`, `:93`).
- no rendered string matches an ISO date pattern (EP17E-AC3, and the EP16
  copy-audit helper for the forbidden words).

## Technical notes

- Inspected: `PlanProposal.tsx:182-202` renders `PlanWeek` and then
  `PlanSessionEditor` over the same sessions — `PlanWeek` from
  `preview.days`, the editor from `edited`. The editable region must be the
  **single** consumer of `edited` so there is one source of truth.
- Inspected: `PlanSessionEditor.tsx` — `dayOptions` `:48` is the ISO-label
  defect; `updateAt` `:51`, `removeAt` `:59` (toast-based undo), `moveBy`
  `:87` (pins a flex session, D-H5), `resizeBy` `:110` (does not pin),
  `clampTime` `:33`, the shared explanation paragraph `:140-143`, the
  per-row conflict mark `:150-153` and `:303-307`, the live region `:135`,
  and the pin/unpin pair `:270-301` with its WCAG 2.5.3 accessible names
  (F-EP16C-01) — all of this is behaviour to carry over, not to redesign.
- Inspected: `PlanProposal.tsx` keeps the `edited` state and conflict list in
  `useProposal`; the new region takes the same `sessions` / `days` /
  `onChange` / `conflicts` contract, so the data path is unchanged.
- **Not inspected / for the refiner:** `PlanWeek.tsx` and
  `useProposal.ts` end to end; whether `PlanWeek` has other callers; how an
  editable 7-column grid behaves below `md` (EP17F owns the phone layout, but
  the grid's own responsive behaviour is decided here).
- **Deliberately unspecified:** the interaction model (▲ D-E1). The planner
  is not inventing drag-and-drop, a popover, or an inline expander; the
  refiner grounds it against the existing components and the keyboard
  requirement of EP17E-AC2.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| ▲ D-E1 | In-place interaction model: (a) **select a session → it expands in place** into the controls `PlanSessionEditor` already renders (day select, start, end, the five buttons, the pin toggle), one open at a time; (b) a popover/sheet anchored to the session; (c) drag-and-drop between day columns with keyboard equivalents | **(a)** — it reuses every reviewed control and accessible name EP16C shipped, needs no new focus-trap surface, has an obvious keyboard story, and is the smallest change that satisfies ▲ D17-4. (c) is the most "modern" and the most expensive: a drag interaction needs a full keyboard alternative anyway, which *is* (a). **Refiner to confirm or replace with grounded reasoning.** ▲ — user-visible workflow | Ratified (user, 2026-11-19) |
| D-E2 | Where the component lives: (a) a new `EditableWeek` in `features/plan-proposal/ui/` — it exists for the proposal; (b) extend `PlanWeek` in `features/study-plan/ui/` in place | **(a)** — `PlanWeek` is a read-only presentation of a saved week and `/plan` may still want it; a separate editable component keeps both honest. Retire `PlanSessionEditor` only once nothing else imports it | Ratified (user, 2026-11-19) |
| D-E3 | Undo: (a) keep the existing toast-with-Undo (`PlanSessionEditor.tsx:65-82`); (b) an in-grid "restore" slot | **(a)** — it is shipped, tested and consistent with the rest of the app; changing it is a separate concern | Ratified (user, 2026-11-19) |
| D-E4 | Day label format: (a) weekday + day + month ("Wed 19 Nov") in the plan's time zone, from the existing datetime helpers; (b) weekday only ("Wed") | **(a)** — a proposal spans one week but a student re-reads it next to a calendar; the date removes the ambiguity. (b) in the narrow layout if space demands — EP17F's call | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-1, DoD-2 (time inputs keep their guards), DoD-5 (loading/empty/error),
DoD-6 (keyboard), DoD-7 (responsive), DoD-8 (component tests). DoD-3 N/A — no
new read or write. DoD-4 N/A — error copy unchanged. DoD-9 N/A. DoD-10/11 at
the parent review.

## Sizing

- **Outcome:** one editable week — a student changes a session where they see
  it.
- **Actual at closeout:** tbd.
- **Files:** **new** editable week component + test in
  `apps/web/src/features/plan-proposal/ui/`;
  `features/plan-proposal/ui/PlanProposal.tsx`;
  `features/study-plan/ui/PlanSessionEditor.tsx` (retired or reduced);
  `features/study-plan/ui/PlanWeek.tsx` (unchanged if still used);
  the proposal's existing tests.
- **Start context:** this story, [contracts.md §6](./contracts.md#6-proposal-surface-contract-ep17eep17f-own-it),
  `PlanProposal.tsx`, `PlanSessionEditor.tsx`, `PlanWeek.tsx`,
  `useProposal.ts`.
- **Verification:** `pnpm --filter @studypilot/web test -- plan-proposal`
  green; V-17-4 (no ISO date rendered) observed.
- **Dependencies / exclusions:** needs EP17D for the payload. Page
  composition, the decision controls and the phone layout are EP17F; the
  spread presets are EP17G.
