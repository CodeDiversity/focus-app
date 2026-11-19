# EP17C — Engine: study-day selection

**Story ID:** EP17C
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Backend (pure domain)
**Status:** Implemented (2026-11-19) — awaiting the combined EP17 parent review. Record: [artifacts/EP17C/implementation.md](./artifacts/EP17C/implementation.md)
**Dependencies:** EP17B (pacing must exist for "spread *within* the chosen days" to mean anything). ▲ D17-2 **Ruled (a)** (user, 2026-11-19): this story reads the existing `weeklyGoalDays` key.

## Plan at a glance

- **What this changes:** the planner stops assuming it may use all seven days. It selects the student's chosen number of study days from the window — deterministically, by where the free time actually is — and EP17B's pacing spreads work *within* those days. A deadline still beats the preference: the feasibility pass may use a day outside the selection rather than miss it.
- **Why it improves it:** it resolves the tension the epic names out loud — "study 3 days a week" and "spread my work across the week" cannot both be honoured across seven days. Under ▲ D17-2 (a) the student's number finally instructs the planner instead of decorating a progress bar (product), and `weeklyGoalDays` stops being a control that `preferences.ts:58-59` documents as gating nothing (code).
- **Decisions needing you:** none — **▲ D17-2 is ruled (a) (user, 2026-11-19)**: `weeklyGoalDays` becomes a planning instruction, with the proviso that the control is visibly surfaced with its new meaning (EP17G owns the UI).
- **How to change this plan:** edit a Ruling cell below or ▲ D17-2 in the epic register; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Compute, once per run from `baselineFreeMinutes`, the set of days the plan may
use: the N days of the window with the most free time, ties by earlier date,
where N is the student's chosen study-day count. Days outside the set get a
zero budget for the normal placement pass; the rule 3 critical pass may still
use them. `N = 7` reproduces today's behaviour exactly. If the selection would
leave an assignment with no usable day before its deadline, that assignment
falls back to its full horizon — smoothness never manufactures a miss.

## Scope

**In:** the selection function in `scheduler.ts`, its interaction with
`dayBudgetOf` and with EP17B's `usableDays`, the rule-list doc comment, the
spec cases, and the `weeklyGoalDays` documentation change (or the new key's
engine read) that ▲ D17-2 selects.

**Out:** letting the student name *which* weekdays (that is a different
control and a different preference — backlog); any change to the momentum
read's use of `weeklyGoalDays` beyond what ▲ D17-2 rules; the service wiring
(EP17D); the UI (EP17G).

## Source requirement references

AC-E17-05, AC-E17-07, AC-E17-04 (determinism), AC-E17-14; TR-E17-01,
TR-E17-02; DoD-1, DoD-8, DoD-9.

## Acceptance criteria

1. With a chosen count N < 7, the normal placement pass places sessions on at
   most N distinct dates of the window — **except days used by the rule 3
   critical pass or by the full-horizon fallback, each covered by its own
   fixture** (R-EP17-03) — and those dates are the N with the greatest
   baseline free minutes (ties broken by earlier date), computed from
   run-start data only — see
   [contracts §4](./contracts.md#4-study-day-selection-ep17c-owns-the-definition-gated-by--d17-2).
2. With N = 7 the output is byte-identical to the EP17B engine for the same
   input — the selection is a no-op when the student wants every day.
3. A deadline still wins: an assignment that cannot be completed inside the
   selected days before its due date is served by the rule 3 critical pass on
   whatever day it needs, and that day may be outside the selection. No
   fixture gains a deficit category because of the selection alone.
4. The selection is deterministic and pure: the same input yields the same
   day set and byte-identical sessions across repeated runs; no clock and no
   iteration over an insertion-ordered structure whose order depends on input
   order.
5. ▲ D17-2's ruling is reflected in exactly one place per consumer: the key's
   documentation in `preferences.ts`, the engine's rule list, and
   [contracts §4](./contracts.md#4-study-day-selection-ep17c-owns-the-definition-gated-by--d17-2)
   agree; no control in the product claims to instruct the planner while
   gating nothing.

## Tests

- *uses only the chosen number of days* — a week with uneven availability and
  N = 3; asserts the exact three dates (EP17C-AC1).
- *is a no-op at N = 7* — byte-identical to the EP17B output (EP17C-AC2).
- *breaks ties by earlier date* — two days with identical free minutes
  (EP17C-AC1, determinism).
- *a deadline inside an unselected day is still met* — an assignment due on a
  day the selection dropped (EP17C-AC3).
- *an assignment with no selected day before its deadline falls back to its
  full horizon* rather than reporting a deficit (EP17C-AC3, negative).
- *is deterministic* — the same input run twice (EP17C-AC4).
- *N = 1 with a week of work* — the deficit is reported honestly through the
  existing categories; no minutes vanish (EP17C-AC3, boundary).
- **Updated existing cases** carry `// EP17C rule 9b: <why>` comments
  (TR-E17-07 discipline, inherited from EP17B).

## Technical notes

- Inspected: `baselineFreeMinutes` (`scheduler.ts:290-293`) is built before
  any placement and never mutates — the correct and only safe input for the
  selection (purity).
- **The budget must be pass-aware; this is more than one site** (R-EP17-03).
  A bare zeroing of `dayBudgetOf` (`:296`) for unselected days would also
  starve the critical pass, because the day loop seeds `budgetLeft` from
  `dayBudgetOf` (`:534-537`) and `placeBlock` returns 0 whenever
  `budget <= 0` (`:489-490`) — on the critical path too (`:550-551`) —
  contradicting EP17C-AC3. The sites, per
  [contracts §4](./contracts.md#4-study-day-selection-ep17c-owns-the-definition-gated-by--d17-2):
  the **normal rotation's `budgetLeft`** seed is zeroed on unselected days;
  the **critical pass's budget source** keeps the real budget on every day;
  **`capacityAfter`** (`:324`) reads the narrowed budgets so the feasibility
  estimate is correctly narrowed; and the **anchor pass** (`:656-659`) reads
  the narrowed budgets per ▲ D-C2 (a). That anchor coupling is the main
  review risk of this story: an assignment may now pin as `FIXED` where it
  previously stayed `FLEX_DAY`, and the spec must say that is intended (D-C2).
- Inspected: the critical pass `:547-553` is the channel that must keep
  access to unselected days (EP17C-AC3).
- Inspected: `preferences.ts:58-61` — the current comment ("They gate
  nothing — they are only the yardstick the momentum read reports progress
  against") is the sentence ▲ D17-2 (a) invalidates and this story rewrites.
- **Proposed, not inspected:** the momentum read's consumption of
  `weeklyGoalDays` (`features/momentum`, API momentum endpoint) — the
  implementer confirms it is unaffected under option (a) before changing the
  documentation.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | How days are chosen: (a) the N days with the most baseline free minutes, ties by earlier date; (b) evenly spaced days (e.g. Mon/Wed/Fri for N = 3); (c) the N earliest days with any free time | **(a)** — it puts study where the student actually has room, needs no new weekday preference, and is trivially deterministic. (b) is prettier on a calendar but regularly picks a day the student has 20 free minutes on. (c) re-creates the front-loading this epic removes | Ratified (user, 2026-11-19) |
| ▲ D-C2 | The anchor-pass coupling: (a) accept that a narrower day set makes `noSlack` true more often, so more assignments pin `FIXED`, and document it as intended — less slack genuinely means the time is load-bearing; (b) keep the anchor pass on the **unnarrowed** budgets so the FLEX/FIXED partition is unchanged by the selection | **(a)** — the partition's whole premise (EP13G D13-4) is "pin when the deadline makes the exact placement load-bearing"; a three-day week makes it more load-bearing, and (b) would tell the student a session is flexible when it is not. ▲ because it changes a user-visible workflow (which sessions a student may start anytime) | Ratified (user, 2026-11-19) |
| D-C3 | Scope of the preference: (a) a count the engine picks days for; (b) let the student name the weekdays | **(a)** for this epic — (b) is a second control and a second contract; record it as a backlog row if a student asks | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-1 (ACs), DoD-8 (automated tests incl. determinism), DoD-9 (rule
documented in the engine's rule list and
[contracts.md §4](./contracts.md#4-study-day-selection-ep17c-owns-the-definition-gated-by--d17-2),
`preferences.ts` doc updated). DoD-2/3/4/5/6/7 N/A — pure function.
DoD-10/11 at the EP17 parent review.

## Sizing

- **Outcome:** the planner uses the number of days the student asked for, and
  spreads inside them.
- **Actual at closeout:** as sized — one engine rule (`selectStudyDays` + a
  pass-aware `normalBudgetOf` threaded through five readers), a new spec
  section (33 cases) and a documentation-only `preferences.ts` change. The
  compatibility value `weeklyGoalDays: 7` moved into seven existing fixture
  files, one line each; **no existing expectation changed** (TR-E17-07).
  Findings F-EP17C-01…03; F-EP17B-02 re-checked and re-reported.
- **Files:** `apps/api/src/domain/study-planning/scheduler.ts`,
  `scheduler.spec.ts`, `preferences.ts` (documentation only).
- **Start context:** this story, [contracts.md §3–§4](./contracts.md),
  `scheduler.ts:280-340` and `:530-580`, EP17B's implementation record.
- **Verification:** `pnpm --filter @studypilot/api test -- scheduler` green;
  the N = 7 byte-identical case passes.
- **Dependencies / exclusions:** ▲ D17-2 ruled (a) (user, 2026-11-19); needs EP17B.
  Nothing reaches a student until EP17D wires it and EP17G exposes the
  control.
