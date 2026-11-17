# EP15J — Cross-Layer End-to-End Verification and Parent Index

**Story ID:** EP15J
**Parent epic:** [EP15: Schedule & Availability Redesign](../../epics/EP15-schedule-and-availability-redesign.md)
**Milestone:** M8 (D15-11)
**Layer:** Integration
**Status:** Queued
**Dependencies:** EP15A–EP15I implemented.

## Plan at a glance

- **What this changes:** a new Playwright suite `apps/web/e2e/schedule.spec.ts` over the self-contained stack (bounds → event → free time shrinks → the plan respects it; a study block fills first; one occurrence cancelled; agenda editing; a pointer drag), the existing `calendar.spec.ts` rewritten for the grid, the axe gate extended to the grid and the sheet with no allowlist, and the parent implementation index.
- **Why it improves it:** the epic's promise — the calendar and the planner agree — is proven end to end against a real database and browser, not asserted (AC-E15-02/05/06/08 cross-layer); the index gives the reviewer one place to start.
- **Decisions needing you:** none ▲ — D-J1 ratifies by default (D15-17).
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Real integration implementation (EP08F/EP13M precedent): a new harness over
multi-step journeys the unit level cannot cover, plus the parent index with
AC-by-AC outcomes and the collected manual accessibility evidence.

## Scope

**In:** `schedule.spec.ts` (new), `calendar.spec.ts` (rewrite), `adaptive-scheduling.spec.ts` axe gate extension, seeding helpers for bounds/blocks, `artifacts/EP15/implementation.md`.
**Out:** product code (defects found go to the owning child or the EP15 backlog with an ID).

## Source requirement references

AC-E15-01, AC-E15-02, AC-E15-05, AC-E15-06, AC-E15-08, AC-E15-10, AC-E15-11 (cross-layer proof); TR-E15-10, TR-E15-11 (collected); DoD-8, DoD-9 (index), DoD-10.

## Acceptance criteria

1. `schedule.spec.ts` passes on the self-contained stack with journeys: (a) save bounds → the shaded region and free labels change; (b) add a weekly Busy → the free interval shrinks → Generate plan → no planned session overlaps the event or lies outside bounds on any shown day; (c) add a Study block tied to a course → Generate plan → that course's work is placed inside the block before any other free time on that day; (d) cancel one occurrence → that date's free time returns while the next week's does not; (e) at 375px, add and edit a block through the agenda; (f) drag-select on the grid opens the pre-filled sheet and saving creates the block.
2. `calendar.spec.ts` is rewritten for the grid (week navigation, item details, keyboard order, narrow agenda) and stays deterministic on any calendar date (EP14C's date-proof approach); `adaptive-scheduling.spec.ts` stays green; the axe gate runs on the grid, the details dialog, the bounds sheet and the block sheet with no `ignore` predicate.
3. `artifacts/EP15/implementation.md` records AC-E15-01…14 outcomes with links to each child's record, both migrations, the V-15-1…4 evidence, the TR-E15-11 manual passes collected from EP15E/F/G/H, and the full-gate results (API gated `--runInBand`, web unit, E2E) with the CI run link.

## Tests (TR-E15-10)

- The six journeys above; three consecutive full E2E runs with zero failures from the EP15 specs (EP14C's standard).
- Axe assertions per surface; keyboard journey through grid → details → sheet → save.

## Technical notes

- **Inspected:** `apps/web/e2e/{calendar.spec.ts, adaptive-scheduling.spec.ts, helpers.ts, global-setup.ts}` (file list and EP14C's per-test login users, summary level); the self-contained stack (`pnpm test:e2e`, throwaway `*_e2e_test` DB, API :4100, web :3100 — root README).
- **Proposed:** seeding via the public API in `helpers.ts` (`PUT /schedule/day-bounds`, `POST /schedule/blocks`), never direct SQL; a fixed course + assignment set per test user.

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-J1 | Seeding: (a) through the public API per test user; (b) direct database rows | **(a)** — exercises the contract; EP14C's isolation model holds | Proposed |

## Definition of Done

8 (TR-E15-10), 9 (parent index), 10 (the combined review follows), TR-E15-11 evidence collected. 1–7 are proven for the owning children by the journeys, not re-claimed here. 11 reviewer-owned.

## Sizing

- **Outcome:** the calendar-planner agreement is proven end to end and the reviewer has one index.
- **Actual at closeout:** tbd.
- **Files:** `apps/web/e2e/schedule.spec.ts` (new), `apps/web/e2e/calendar.spec.ts`, `apps/web/e2e/adaptive-scheduling.spec.ts`, `apps/web/e2e/helpers.ts`, `docs/stories/EP15/artifacts/EP15/implementation.md` (new).
- **Start context:** this story; the nine child records; `helpers.ts`; EP14C's record for the date-proof and login-user patterns.
- **Verification:** `pnpm test:e2e` three consecutive runs, zero failures from `schedule.spec.ts`/`calendar.spec.ts`; `pnpm test` green; CI run link.
- **Dependencies / exclusions:** EP15A–EP15I. Product defects → owning child or backlog row.
