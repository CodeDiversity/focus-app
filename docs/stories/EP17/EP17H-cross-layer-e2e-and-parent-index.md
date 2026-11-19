# EP17H — Cross-layer e2e, determinism gate and parent index

**Story ID:** EP17H
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP17A–EP17G implemented.

## Plan at a glance

- **What this changes:** one Playwright journey proves the whole epic end to end — plan a week, see it spread across the chosen days, nudge a session in place, change a spread preset and watch the week change, confirm, and find the session on Today — plus the gates that protect what EP17 must not break (the engine identity and determinism checks, the existing suites) and the parent index the combined review reads. It also closes the last three places on the proposal that still print `2026-11-19` beside a grid now reading "Thu, Nov 19" (D17-17).
- **Why it improves it:** every child verifies its own layer against mocks; only a journey over the real stack proves that a preference a student sets in the browser reaches a pure function three layers down and comes back as a different Thursday (product). The gates make "we didn't break scheduling" a test result instead of a claim (code). And a page that speaks two date languages at once is exactly the small friction this epic exists to remove.
- **Decisions needing you:** none. D-H1/D-H2 below and the epic's D17-17 are non-material and ratify by default at implementation start.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add the EP17 journeys to `apps/web/e2e/`, extend the axe gate to the rebuilt
proposal, update any journey whose first steps the rebuild changed, run and
record the API and web suites plus the engine determinism/identity checks,
and write the parent index at `./artifacts/EP17/implementation.md` per the
review cadence. It also finishes AC-E17-10: three secondary surfaces on the
proposal still print raw ISO dates, and they move to the `dayLabel` helper
EP17E shipped (D17-17, AC7 below).

## Scope

**In:** new/updated Playwright specs, the axe stop on the rebuilt proposal,
the recorded full-suite runs, the determinism/identity gate results, the
parent index, and — per D17-17 — the three remaining raw-ISO-date call sites
on `/plan/proposal` with their component tests and the one e2e assertion that
pins the ISO string.

**Out:** new product behaviour; fixing a defect a journey finds in another
child's code — that is a finding against the owning child, recorded and
fixed there. Also out: `PlanWeek.tsx` / `WeekGrid` on `/plan`, which is
outside AC-E17-10's "the proposal" (EP17E scope), and any other EP13/EP16
surface that renders a date off the proposal page.

## Source requirement references

AC-E17-10 (the three non-grid call sites, D17-17; EP17E owns the week grid),
AC-E17-14; TR-E17-05 (the two component tests below) and TR-E17-06, and the
collection of TR-E17-01…05, TR-E17-07 evidence; V-17-4; DoD-1, DoD-8,
DoD-10.

## Acceptance criteria

1. A Playwright journey covers: sign in → **Plan my week** → the proposal
   shows a week whose minutes fall on more than the first two days and only
   on the chosen study days — **asserted on a seeded fixture with no critical
   work**, since the rule 3 critical pass may legitimately place on an
   unselected day (contracts §4; R-EP17-05) → edit one session in place
   (change its day) →
   **Use this plan** → Today shows the resulting next session. It asserts
   human day labels, never an ISO date.
2. A second journey covers the plan-time preset: change the spread preset on
   the proposal → the week re-plans → confirm → the Profile preferences page
   shows the same saved value.
3. A regression journey covers the EP16 guarantee this epic must not break:
   lock a session, replan, and confirm the locked session survives.
4. The axe gate runs on the rebuilt proposal at a wide and a narrow viewport
   with no violations; existing axe stops still pass.
5. The protective gates pass and are recorded with their numbers: the full
   API suite, the full web suite, the full e2e suite, the EP13J identity
   test, the EP15 determinism check (V-15-3), and EP17B's byte-identical
   baseline case (V-17-3). No API route was added or removed.
6. The parent index at `./artifacts/EP17/implementation.md` links every
   child's record, lists the epic AC-E17 / TR-E17 outcomes and the open
   findings, and is the entry point for the combined review.
7. No raw ISO date is rendered to a student anywhere on `/plan/proposal`
   (AC-E17-10, V-17-4, D17-17). Three call sites change, each to
   `dayLabel(...)` from `@/features/study-plan/lib/dayLabel`, the helper
   EP17E shipped — no second formatter is introduced:
   - `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.tsx:80` —
     the locked-session line `<time dateTime={s.date}>{s.date}</time>`;
   - `apps/web/src/features/plan-proposal/ui/MovedSessionRow.tsx:23` — the
     "moved forward" row's `<time dateTime={session.date}>{session.date}</time>`;
   - `apps/web/src/features/plan-proposal/ui/PlanProposal.tsx:223-226` —
     each 409 conflict-summary line, `{c.date} {c.startTime} — …`.

   In all three the `<time dateTime=…>` attribute keeps the ISO value (the
   machine-readable form is not a student-visible string); only the rendered
   text changes. The 409 summary's wording, its `role="alert"`, its
   `data-testid` and the confirm behaviour around it are otherwise unchanged
   — EP17F-AC5's frozen copy promise is about the message, and this changes
   only how its date reads.

## Tests

The journeys above are the tests. Additionally:

- any existing journey broken by the proposal rebuild is **updated**, not
  deleted, and the update is named in the record.
- `catch-up`/plan journeys that asserted the old editor list's structure are
  rewritten against the editable week.
- a flake guard: each new journey is run three times and the result recorded
  (the EP16F precedent).

For EP17H-AC7 (D17-17), named per call site:

- `apps/web/src/features/plan-proposal/ui/WhatThisKeepsCard.test.tsx` —
  `renders the locked session's day in human form and keeps the ISO dateTime
  attribute`: the rendered text contains `Thu, Nov 19`, the `<time>` element's
  `dateTime` is still `2026-11-19`.
- `apps/web/src/features/plan-proposal/ui/MovedForwardList.test.tsx`
  (`MovedSessionRow` has no test file of its own; it is only rendered from
  this list) — the same assertion pair for a moved-forward row.
- `apps/web/src/features/plan-proposal/ui/PlanProposal.test.tsx` — `the 409
  conflict summary names the clashing day in human form`: the summary's text
  contains `Thu, Nov 19` and the unchanged lead sentence "Some sessions clash
  with your calendar".
- Negative, page-wide (this is V-17-4's owning test): `no rendered string on
  the proposal matches /\d{4}-\d{2}-\d{2}/` over the **whole** `PlanProposal`
  render in the state that shows all of it at once — a conflicted preview with
  locked and moved-forward sessions and the disclosure open — reusing
  `renderedStrings` from `@/test/forbiddenWords` as EP17E's grid-scoped twin
  does. This is the test that would have caught F-EP17E-02 and F-EP17F-01.
- `apps/web/e2e/plan-flow.spec.ts:781` — the 409 journey's
  `expect(summary).toContainText(target.date)` asserts the ISO string and
  **must be updated**, not deleted: assert the human label derived from
  `target.date` in the same way the page derives it. Named here because it is
  the one existing assertion D17-17 invalidates.

## Technical notes

- Inspected: `apps/web/e2e/` holds the suite EP16F left green (73/0/0 ×3,
  axe gate from EP15J, `helpers.ts` landing on `/today`).
- Known limitation: BL-15-08 (env-derived ports / throwaway DB name) is the
  standing harness constraint; EP17H should not need to touch it. If a
  concurrent-session collision appears, record it against BL-15-08 rather
  than working around it silently.
- Unverified: which existing specs assert the proposal's structure — the
  implementer greps before planning the updates.
- **The D17-17 call sites, inspected 2026-11-19 at HEAD `d918046`.**
  `dayLabel` (`apps/web/src/features/study-plan/lib/dayLabel.ts`) is a pure
  `(date: string) => string` formatted in `UTC` from the civil date, so it
  needs no time-zone prop and takes exactly the `s.date` / `session.date` /
  `c.date` values these three sites already hold — the change at each is
  wrapping one expression. `WhatThisKeepsCard` and `MovedSessionRow` are
  EP13/EP16 components the EP17 rebuild left alone on purpose; both render
  `<time dateTime={…}>{…}</time>`, so only the child text changes.
  `PlanProposal`'s 409 list (`:223-226`) has no `<time>` element — it
  interpolates `{c.date}` into a plain `<li>`, so `dayLabel(c.date)` replaces
  it outright.
- Why this sits here and not in EP17E/EP17F: both are implemented and their
  AC text is frozen (core.md), and both explicitly scoped these components
  out ("placement only, not source"; the 409 copy unchanged). D17-17 records
  the reasoning; the findings are logged as C-F-EP17E-02 / C-F-EP17F-01 in
  [history.md](./history.md).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-H1 | Asserting "the week is spread": (a) assert the **shape** — minutes appear on more than N days and on no unselected day — from a seeded fixture **containing no critical (rule 3) work**, because the critical pass may place on an unselected day (R-EP17-05); (b) assert exact per-day minutes | **(a)** — (b) re-pins the engine's arithmetic in a slow browser test that the domain spec already owns far better; the journey's job is that the levers reach the engine | Ratified (user, 2026-11-19) |
| D-H2 | Where the preset journey asserts persistence: (a) on the Profile page after confirming; (b) by re-opening the proposal | **(a)** — it proves the ▲ D-G1 persistence claim at the surface a student would check | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-8 (automated tests), DoD-10 (integrated review — this story produces the
index the review reads). DoD-1 applies to its own ACs, including EP17H-AC7's
three call sites. DoD-11 is the reviewer's, inside the combined report.

## Sizing

- **Outcome:** the epic is proven end to end, the proposal page speaks one
  date language, and the combined review has one entry point.
- **Actual at closeout:** tbd.
- **Files:** **new** `apps/web/e2e/plan-pacing.spec.ts` (name tbd), updates
  to existing plan/catch-up specs and `helpers.ts` if needed, a **new**
  `docs/stories/EP17/artifacts/EP17/implementation.md`, and for AC7 three
  one-expression edits in
  `features/plan-proposal/ui/{WhatThisKeepsCard,MovedSessionRow,PlanProposal}.tsx`
  with their three test files. Still ~1 window: AC7 adds well under a tenth
  of it.
- **Start context:** this story, the seven children's `implementation.md`
  records, `apps/web/e2e/helpers.ts`, the existing plan journey, and
  `features/study-plan/lib/dayLabel.ts`.
- **Verification:** `pnpm test:e2e` ×3 recorded; API and web suites recorded
  with counts; the identity, determinism and baseline gates recorded; V-17-4
  re-run page-wide and recorded clean.
- **Dependencies / exclusions:** needs EP17A–EP17G implemented. Review is the
  reviewer's; this story only prepares its inputs.
