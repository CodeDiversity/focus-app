# EP13M — Cross-Layer E2E and Parent Index

**Story ID:** EP13M
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP13A–EP13L implemented (if D13-4 descopes EP13G/H, their journeys drop out and this story's AC 4 becomes N/A with a recorded reason).
**Jira key:** Pending creation

## Summary

The epic's promises are multi-day, multi-surface behaviors no unit test can
prove: do the work and the plan shrinks; miss a day and the plan quietly
rolls forward; start from the plan in one tap; momentum reflects reality.
This story adds a new Playwright suite (`apps/web/e2e/adaptive-scheduling.spec.ts`)
against the self-contained EP09 stack, exercising those journeys end to end
(driving "today" via the suite's controlled data setup, consistent with how
the existing specs construct dated fixtures), plus the parent implementation
index (`./artifacts/EP13/implementation.md`) collecting all child evidence
and the recorded manual a11y passes (TR-E13-14) for the combined review.

## Scope

**In scope:**
- New E2E journeys: (1) focus session → confirmed minutes → regenerated plan
  demonstrably smaller for that assignment; (2) past unstarted session →
  next plan read shows it rolled forward, recovery view informational, no
  mandatory catch-up; (3) dashboard what-now → one-tap focus start → finish
  → planned session COMPLETED on calendar/today; (4) flex session started
  anytime and absent from clock-conflict behavior (if EP13G/H landed);
  (5) micro-start counts; absorption extends; (6) momentum numbers update
  after a finish.
- Keeping every pre-existing suite green (API, web unit, existing E2E specs).
- Parent implementation index.

**Out of scope:**
- New product behavior; fixing unrelated pre-existing failures (report,
  don't absorb — EP08 F-02 precedent).

## Source requirement references

- Epic AC-E13-01…14 (cross-layer proof where marked in the ownership table).
- Shared DoD 1, 3, 8, 9, 10. TR-E13-13; TR-E13-14 (collection).

## Acceptance criteria

1. The six journeys above pass deterministically against the self-contained
   stack (`pnpm test:e2e`), with dated fixtures controlled by the suite.
2. All pre-existing suites remain green; any pre-existing failure is
   documented with control-run evidence, never silently waived.
3. The parent index exists with per-child evidence links and the collected
   TR-E13-14 manual a11y records.
4. Flex and absorption journeys match the D13-4/D13-13 rulings as landed (or
   carry a recorded N/A if descoped).

## Tests (TR-E13-13)

The journeys **are** the tests; plus a smoke assertion that `/catch-up`
redirects and no nav dead-ends exist (EP13E).

## Technical notes

- **Inspected (2026-11-14):** EP09's self-contained harness per code baseline
  (`global-setup.ts`, throwaway `*_e2e_test` DB, API :4100 / web :3100);
  existing specs `study-plan.spec.ts`, `catch-up.spec.ts`,
  `study-sessions.spec.ts` as fixture/pattern sources.
- Journey (2) needs a planned session dated before "today": create it via
  the API with an earlier window (the save endpoint accepts windows starting
  up to today−6, D06-23) rather than clock-mocking the stack.

## Definition of Done

1. Functional criteria pass. 2. N/A. 3. Fixtures scoped per test user.
4. N/A. 5–7. N/A (verification story; a11y evidence collected, not created).
8. Automated E2E (TR-E13-13). 9. Parent index.
10–11. This story readies the combined EP13 parent review; the reviewer owns
   the walkthrough.

## Sizing

- **Outcome:** the epic's adaptive loop is proven end to end on the real stack, and the parent index readies the combined review.
- **Estimate:** 2–3 requests/tokens.
- **Model recommendation:** 3 — harness reuse with careful dated fixtures.
- **Production files:** `apps/web/e2e/adaptive-scheduling.spec.ts` (new); `./artifacts/EP13/implementation.md` (new).
- **Test files:** the spec itself.
- **Minimal start context:** this story, EP13 README (contracts + queue evidence links), the three existing E2E specs, EP09 harness docs.
- **Verification:** `pnpm test:e2e` (full), `pnpm test`, lint.
- **Dependencies:** EP13A–EP13L. Final child before the combined review.
- **Exclusions:** new behavior; unrelated pre-existing failures.

## Tracker reference

Jira key: Pending creation (no sync authorized).
