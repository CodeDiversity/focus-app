# EP13I — Micro-Start and Hyperfocus Absorption

**Story ID:** EP13I
**Re-lettered:** 2026-11-15 (D13-16; EP13J until the user re-prioritised micro-start ahead of energy — F-EP13H-02 is the rationale: flex sessions need an initiation counterweight before the plan gets smarter about placement)
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Frontend (+ one small API endpoint)
**Status:** Needs refinement (ui-refiner required, D13-14)
**Dependencies:** EP13B + EP13D implemented. D13-13 provisional (V-13-6).
**Jira key:** Pending creation

## Summary

Honor the two ends of ADHD session reality. **Micro-start:** every start
affordance (what-now card, today rows, assignment rows) offers "Just 10
minutes" beside the full start; a micro-start is a normal EP07 session with
`plannedMinutes: 10`, so stopping at 10 still counts — the minutes land in
confirmed time and the plan shrinks (EP13A). Most sessions that start keep
going; the barrier is the first minute. **Hyperfocus absorption:** when a
running focus session reaches its target and the student keeps working, the
focus page offers to absorb the next planned session of the same assignment
on the same day (`POST /study-sessions/:id/absorb-next`, D13-13: the absorbed
row is marked `COMPLETED` and linked; the running session's `plannedMinutes`
grows by its duration) — hyperfocus becomes a plan asset, not an overrun
warning.

## Scope

**In scope:**
- Micro-start affordance on every start surface (10 min; value per
  ui-refiner); no backend change (existing create contract).
- Absorption: the new endpoint (transactional: mark absorbed row COMPLETED +
  link + extend `plannedMinutes`), the focus-page offer at target-reached
  with an active timer, decline = no call.
- Tests (TR-E13-10); recorded manual a11y pass (TR-E13-14).

**Out of scope:**
- Sounds/alerts and reminders (D13-8). Momentum displays (EP13K). Changing
  EP07 timer mechanics.

## Source requirement references

- Epic AC-E13-11, AC-E13-12 (copy). Shared DoD 1, 2, 3, 4, 5, 6, 7, 8, 9.
- TR-E13-10, TR-E13-14.

## Acceptance criteria

1. A micro-start creates a standard session with `plannedMinutes: 10` from
   any start surface in one interaction; finishing at ~10 minutes records
   confirmed minutes that demonstrably reduce remaining work (integration-
   level assertion against EP13A math).
2. When a running session reaches its target and is still ACTIVE, the focus
   page offers absorption only if a qualifying next planned session exists
   (same assignment, same civil day, `SCHEDULED`); accepting extends the
   target in place without interrupting the timer; declining changes nothing
   (no state, no nag repetition rule per ui-refiner).
3. The absorption endpoint is transactional, user-scoped (uniform 404), and
   409s with an actionable reason when no candidate exists or the session is
   not ACTIVE.
4. Copy frames both features positively ("keep going?" not "you exceeded");
   no overrun warnings remain for sessions with an absorption candidate
   (D13-9).
5. All states, keyboard operability, narrow screens; the absorption offer is
   announced accessibly (live region) and respects reduced motion.

## Tests (TR-E13-10)

- Micro-start: creation payload, one-interaction flow, confirmed-minutes →
  remaining-work assertion.
- Absorption: offer gating matrix (target reached × ACTIVE × candidate
  exists), accept transaction effects (row COMPLETED + link + plannedMinutes
  grown), decline no-op, 409 matrix, ownership/uniform 404.
- Copy assertions; keyboard; reduced-motion; narrow screen.

## Technical notes

- **Inspected (2026-11-14):** EP07 focus lifecycle per code baseline
  (`FocusTimer` target-reached state exists; server-side elapsed tracking);
  `StudySession.plannedMinutes` field (schema 292).
- **Proposed:** `absorb-next` in the study-sessions module (reuses EP13B's
  link + status helper); focus-page offer component; micro-start button wired
  to the existing create path.
- **UI/UX gaps for the ui-refiner (D13-14):** micro-start placement/wording
  and the exact minutes; absorption offer presentation (inline vs toast),
  re-offer policy, target-extension display.

## Definition of Done

1. Functional criteria pass (AC-E13-11).
2. Endpoint validation (id shape; state preconditions).
3. Ownership scoping (uniform 404). 4. Actionable 409 reasons.
5. States. 6. Keyboard + live-region announcement. 7. Responsive.
8. Automated tests (TR-E13-10). 9. Endpoint documented.
10–11. Combined EP13 parent review / reviewer walkthrough.

## Sizing

- **Outcome:** starting costs ten minutes of commitment; overrunning becomes absorbing the next session.
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — one transactional endpoint + focused UI; semantics settled by D13-13.
- **Production files:** study-sessions module (endpoint), focus page/feature components, start surfaces (what-now card, today rows, `StartFocusSessionDialog`).
- **Test files:** study-sessions spec (extend), focus feature component tests.
- **Minimal start context:** this story + ui-refiner record, EP13 README D13-13, EP13B record, focus feature files.
- **Verification:** `pnpm --filter @studypilot/api test`, `pnpm --filter @studypilot/web test`, lint, typecheck.
- **Dependencies:** EP13B, EP13D, ui-refiner. Blocks nothing.
- **Exclusions:** reminders/sounds, momentum, timer mechanics.

## Tracker reference

Jira key: Pending creation (no sync authorized).
