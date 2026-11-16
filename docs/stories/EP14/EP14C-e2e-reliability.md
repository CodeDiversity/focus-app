# EP14C — E2E Reliability: Date-Proof Fixtures, No Parallel Flakes

**Story ID:** EP14C
**Parent epic:** [EP14: Adaptive Scheduling Follow-ups](../../epics/EP14-adaptive-scheduling-follow-ups.md)
**Milestone:** proposed M7 (D14-2)
**Layer:** Integration (E2E tests only)
**Status:** Ready
**Dependencies:** none (EP14D owns the a11y E2E failures). Source: EP13R D-R13 (user ruling 2026-11-16), F-EP13M-06.

## Plan at a glance

- **What this changes:** the study-plan journey stops failing on days where "move later 15 minutes" lands on a class; the login and logout specs stop flaking under full parallel runs. Test code only.
- **Why it improves it:** EP13M's baseline had a date-dependent failure and two load flakes, which train everyone to ignore red E2E runs (product: gate trust; code: deterministic fixtures, the EP13H2 lesson).
- **Decisions needing you:** none — D-C1…D-C3 ratified by the user 2026-11-16.
- **How to change this plan:** edit a Ruling cell below, or ask the planner for AC changes. AC text freezes when implementation starts; later asks become a follow-up story.

## Summary

Make the three unreliable E2E tests deterministic, using only the server's
window and per-test unique data — no clock mocking of the stack (D-M2).

## Scope

**In:** `e2e/study-plan.spec.ts`, `e2e/login.spec.ts`, `e2e/auth-journeys.spec.ts`, shared helpers if needed.
**Out:** product code (if a flake turns out to be a product race, stop and return it as a finding); the a11y failures (EP14D).

## Source requirement references

AC-E14-04; TR-E14-04; DoD-8.

## Acceptance criteria

1. The study-plan journey edits a proposed session chosen from the server's own preview so that the moved window is free (no class/busy overlap), and passes for any server "today".
2. The login spec registers a unique user per test (no shared `beforeAll` registration), and the logout journey waits for the authenticated shell before acting; both pass under `fullyParallel`.
3. Three consecutive full `npx playwright test` runs with default parallelism show zero failures from these files.

## Tests

The specs themselves; EP14C-AC3's three-run record in the implementation record (commands, counts).

## Technical notes

- Inspected: `apps/web/e2e/study-plan.spec.ts:94–95` (moves `.first()` proposal blindly); `login.spec.ts:13–27` (`testUser` + `beforeAll` registration; the per-worker random suffix still collided in EP13M's runs); the logout failure was a 30s click timeout (EP13M record, F-EP13M-06).

### Decisions

| ID | Options considered | Recommended | Ruling |
|---|---|---|---|
| D-C1 | Study-plan target choice: (a) pick from the preview JSON the first proposal whose +15-min window is free of classes; (b) seed no classes on the edited day | **(a)** — exercises the real UI with the real engine output | Ratified (user, 2026-11-16) |
| D-C2 | Login isolation: (a) per-test registration; (b) retry on 409 | **(a)** — retries mask the cause | Ratified (user, 2026-11-16) |
| D-C3 | Logout flake: (a) await the authenticated header (role-based locator) before clicking; diagnose with a trace first; (b) raise the timeout | **(a)** | Ratified (user, 2026-11-16) |

## Definition of Done

1, 8; others N/A (tests only).

## Sizing

- **Outcome:** the E2E suite is deterministic under parallel load on any date.
- **Actual at closeout:** tbd.
- **Files:** the three spec files; `e2e/helpers.ts` if a shared waiter is added.
- **Start context:** this story; F-EP13M-06 in `docs/stories/EP13/artifacts/EP13M/implementation.md`.
- **Verification:** three full parallel runs, zero failures from these files.
- **Dependencies / exclusions:** a11y E2E failures → EP14D.
