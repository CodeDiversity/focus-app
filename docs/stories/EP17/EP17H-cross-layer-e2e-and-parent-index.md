# EP17H — Cross-layer e2e, determinism gate and parent index

**Story ID:** EP17H
**Epic:** [EP17](../../epics/EP17-adhd-friendly-pacing-and-plan-proposal.md)
**Milestone:** M10 (proposed, D17-1)
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP17A–EP17G implemented.

## Plan at a glance

- **What this changes:** one Playwright journey proves the whole epic end to end — plan a week, see it spread across the chosen days, nudge a session in place, change a spread preset and watch the week change, confirm, and find the session on Today — plus the gates that protect what EP17 must not break (the engine identity and determinism checks, the existing suites) and the parent index the combined review reads.
- **Why it improves it:** every child verifies its own layer against mocks; only a journey over the real stack proves that a preference a student sets in the browser reaches a pure function three layers down and comes back as a different Thursday (product). The gates make "we didn't break scheduling" a test result instead of a claim (code).
- **Decisions needing you:** none. D-H1/D-H2 below are non-material and ratify by default.
- **How to change this plan:** edit a Ruling cell below; ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Add the EP17 journeys to `apps/web/e2e/`, extend the axe gate to the rebuilt
proposal, update any journey whose first steps the rebuild changed, run and
record the API and web suites plus the engine determinism/identity checks,
and write the parent index at `./artifacts/EP17/implementation.md` per the
review cadence.

## Scope

**In:** new/updated Playwright specs, the axe stop on the rebuilt proposal,
the recorded full-suite runs, the determinism/identity gate results, and the
parent index.

**Out:** new product behaviour; fixing a defect a journey finds in another
child's code — that is a finding against the owning child, recorded and
fixed there.

## Source requirement references

AC-E17-14; TR-E17-06, and the collection of TR-E17-01…05, TR-E17-07
evidence; DoD-8, DoD-10.

## Acceptance criteria

1. A Playwright journey covers: sign in → **Plan my week** → the proposal
   shows a week whose minutes fall on more than the first two days and only
   on the chosen study days → edit one session in place (change its day) →
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

## Tests

The journeys above are the tests. Additionally:

- any existing journey broken by the proposal rebuild is **updated**, not
  deleted, and the update is named in the record.
- `catch-up`/plan journeys that asserted the old editor list's structure are
  rewritten against the editable week.
- a flake guard: each new journey is run three times and the result recorded
  (the EP16F precedent).

## Technical notes

- Inspected: `apps/web/e2e/` holds the suite EP16F left green (73/0/0 ×3,
  axe gate from EP15J, `helpers.ts` landing on `/today`).
- Known limitation: BL-15-08 (env-derived ports / throwaway DB name) is the
  standing harness constraint; EP17H should not need to touch it. If a
  concurrent-session collision appears, record it against BL-15-08 rather
  than working around it silently.
- Unverified: which existing specs assert the proposal's structure — the
  implementer greps before planning the updates.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-H1 | Asserting "the week is spread": (a) assert the **shape** — minutes appear on more than N days and on no unselected day — from a seeded fixture; (b) assert exact per-day minutes | **(a)** — (b) re-pins the engine's arithmetic in a slow browser test that the domain spec already owns far better; the journey's job is that the levers reach the engine | Ratified (user, 2026-11-19) |
| D-H2 | Where the preset journey asserts persistence: (a) on the Profile page after confirming; (b) by re-opening the proposal | **(a)** — it proves the ▲ D-G1 persistence claim at the surface a student would check | Ratified (user, 2026-11-19) |

## Definition of Done

DoD-8 (automated tests), DoD-10 (integrated review — this story produces the
index the review reads). DoD-1 applies to its own ACs. DoD-11 is the
reviewer's, inside the combined report.

## Sizing

- **Outcome:** the epic is proven end to end and the combined review has one
  entry point.
- **Actual at closeout:** tbd.
- **Files:** **new** `apps/web/e2e/plan-pacing.spec.ts` (name tbd), updates
  to existing plan/catch-up specs and `helpers.ts` if needed, and a **new**
  `docs/stories/EP17/artifacts/EP17/implementation.md`.
- **Start context:** this story, the seven children's `implementation.md`
  records, `apps/web/e2e/helpers.ts`, and the existing plan journey.
- **Verification:** `pnpm test:e2e` ×3 recorded; API and web suites recorded
  with counts; the identity, determinism and baseline gates recorded.
- **Dependencies / exclusions:** needs EP17A–EP17G implemented. Review is the
  reviewer's; this story only prepares its inputs.
