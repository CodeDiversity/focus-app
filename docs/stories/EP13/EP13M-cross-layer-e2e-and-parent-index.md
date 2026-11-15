# EP13M — Cross-Layer E2E and Parent Index

**Story ID:** EP13M
**Parent epic:** [EP13: Adaptive Scheduling for ADHD](../../epics/EP13-adaptive-scheduling-for-adhd.md)
**Milestone:** M6
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP13A–EP13N implemented — the whole epic, including EP13H2 (fix story) and EP13N (preference controls). **D13-4 is resolved (option b), so the flex journeys are in scope unconditionally.**
**Reviewed:** 2026-11-15 — dependencies de-conditionalised, the manual a11y pass promoted from "collected" to "performed" (see *Review note*).

## Plan at a glance

- **What this changes:** a new Playwright suite `apps/web/e2e/adaptive-scheduling.spec.ts` on the EP09 stack covering the multi-day journeys (work → plan shrinks; miss a day → rolls forward; one-tap start; flex journey; momentum), the recorded manual a11y pass for all new surfaces (TR-E13-14), and the parent implementation index for the combined review.
- **Why it improves it:** the epic's promises are multi-day, multi-surface behaviors no unit test can prove; this is the only place they are demonstrated end to end (product). The index gives the reviewer per-child diff ranges and test commands, so the final review starts from a map instead of rediscovery (code).
- **Decisions needing you:** none ▲ open.
- **How to change this plan:** edit a Ruling cell in the Decisions table below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.


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
  next plan read shows it rolled forward, plan health informational, no
  mandatory catch-up; (3) dashboard what-now → one-tap focus start → finish
  → planned session COMPLETED on calendar/today; (4) flex session started
  anytime, absent from clock-conflict behaviour, rendered as "Anytime" on
  the plan/today/calendar surfaces (EP13G/EP13H — unconditional since D13-4
  ruled option (b)); (5) micro-start ("Just 10 min") counts and absorption
  extends the running target (EP13I); (6) momentum numbers update after a
  finish (EP13K); (7) information architecture: `/catch-up` and
  `/catch-up/preview` redirect into plan health, Focus and Plan health are
  reachable from the nav, and no surface leads with a missed/rolled count
  (EP13E).
- **One combined manual accessibility pass** across every surface EP13D,
  EP13E, EP13H, EP13I and EP13K added, recorded as the TR-E13-14 evidence
  those five stories each left open.
- Keeping every pre-existing suite green (API, web unit, existing E2E specs).
- Parent implementation index.

**Out of scope:**
- New product behavior; fixing unrelated pre-existing failures (report,
  don't absorb — EP08 F-02 precedent).

## Source requirement references

- Epic AC-E13-01…14 (cross-layer proof where marked in the ownership table).
- Shared DoD 1, 3, 8, 9, 10. TR-E13-13; TR-E13-14 (the combined manual pass is performed and recorded here — EP13M-AC3).

## Acceptance criteria

1. The six journeys above pass deterministically against the self-contained
   stack (`pnpm test:e2e`), with dated fixtures controlled by the suite.
2. All pre-existing suites remain green. **The baseline is now genuinely
   zero failures** (EP13H2 repaired the clock-dependent `CalendarPage`
   suite), so any failing test at this gate is a real regression to fix —
   the "report, don't absorb" escape hatch no longer has a standing
   exception to point at.
3. The parent index exists with per-child evidence links **for every child
   including EP13H2 and EP13N**, and carries the TR-E13-14 record produced
   by this story's own combined manual a11y pass — **performed here, not
   merely collected**: five children (EP13D, EP13E, EP13H, EP13I, EP13K)
   each deferred it, and an empty slot ×5 is not evidence.
4. Flex, absorption and micro-start journeys match the D13-4 (option b) and
   D13-13/D-I8 rulings as landed.

## Tests (TR-E13-13)

The journeys **are** the tests; journey (7) carries the EP13E information-
architecture assertions (redirects, nav entries, no count-led surface).

## Technical notes

- **Inspected (2026-11-14):** EP09's self-contained harness per code baseline
  (`global-setup.ts`, throwaway `*_e2e_test` DB, API :4100 / web :3100);
  existing specs `study-plan.spec.ts`, `catch-up.spec.ts`,
  `study-sessions.spec.ts` as fixture/pattern sources.
- Journey (2) needs a planned session dated before "today": create it via
  the API with an earlier window (the save endpoint accepts windows starting
  up to today−6, D06-23) rather than clock-mocking the stack.

### Review note (2026-11-15)

Two changes. First, the D13-4 conditional is gone: the ruling landed and
EP13G/EP13H shipped, so the flex journeys are ordinary scope and EP13M-AC4 no
longer offers an N/A escape.

Second, and more important: **the manual accessibility pass is now this
story's work, not its filing cabinet.** Five children deferred TR-E13-14 to
"a recorded manual pass" that no environment in the delivery chain could
execute; collecting five absences would hand the combined review an evidence
gap at the last gate. Doing one pass here across the whole surface set is
cheaper than five, catches cross-surface issues (focus order between the
what-now card, momentum and the timer) that per-story passes would miss, and
is the honest reading of "collected".

A warning for whoever implements this story: a clock-dependent E2E fixture
is exactly what broke `CalendarPage` for four stories (EP13H2's diagnosis).
Dated fixtures here must be derived from the suite's own controlled "today",
never from a hard-coded calendar week.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| — | None recorded yet; proposed at refinement. | | Proposed |

Rows are `D-M<n>`; one that refines or overrides a register row says `(refines D13-<n>)` / `(overrides D13-<n>)`. ▲ = material: the implementer stops and asks if still `Proposed`; other rows become `Ratified by default` at implementation start.

## Definition of Done

1. Functional criteria pass. 2. N/A. 3. Fixtures scoped per test user.
4. N/A. 5–7. N/A as new UI (verification story); the TR-E13-14 combined manual a11y pass is performed and recorded here (EP13M-AC3).
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

