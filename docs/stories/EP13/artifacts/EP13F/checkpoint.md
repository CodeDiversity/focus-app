# EP13F checkpoint
Updated: 2026-11-15 (local session)
Execution state: [EP13 execution queue](../../README.md#execution-queue) → row EP13F
Story: [EP13F — ADHD-Aware Placement Engine v2](../../EP13F-adhd-aware-placement-engine-v2.md)
Review unit: EP13 parent (combined review after EP13M); parent index `../EP13/implementation.md` (not yet written)
Role / scope: implementer; backend pure-domain placement rewrite + the two new preference keys through the API boundary and the profile form. Excluded flex anchors (EP13G), energy ordering (EP13J), calibration (EP13L).

## Repository state
- Workspace / branch: `oak` worktree, `hfi/7d487005-e0c1-41bd-86ad-91c841f956bb/oak`
- HEAD at last update: see the EP13F implementation commit (`feat(EP13F): …`)
- Saved work: EP13A–EP13E committed; the EP13F implementation commit
- Other work to preserve: none

## Progress
- [x] M1 — `StudyPreferences` gains `breakMinutes`/`densityPercent` (defaults, bounds, validator, defensive reader) + spec
- [x] M2 — `scheduler.ts` placement v2 (breaks, density cap, interleaving, min/max + tail merge-or-drop) + spec
- [x] M3 — API boundary: DTO fields, preference response projection, gated e2e expectations
- [x] M4 — web `StudyPreferencesForm` two fields + tests
- [x] M5 — verification, implementation record, queue update, commit
- Current step: none — story complete; see `implementation.md`.

## Decisions and dependencies
- Placement v2 rules 1–5 implemented per the EP13 README shared contract; D13-5 (break 15/0–60, density 80/50–100) and D13-6 (round-robin, feasibility beats variety).
- Break = a search-time buffer around placed sessions, never a stored row.
  Density denominator = the day's free minutes before this run's placements.
  Critical-work detection uses an **optimistic** capacity bound, so the
  feasibility override never fires merely because another assignment competes.
- `NO_AVAILABLE_TIME` now means "the student had no free time in this
  assignment's horizon", not "no time was left after earlier assignments".
- Open findings ride to the parent review: F-EP13F-01 (sub-minimum tail uses a
  misleading deficit category), F-EP13F-02 (gated suites updated, CI-executed),
  F-EP13F-03 (EP06 README still says "four-key object"), F-EP13F-04 (density
  cap can report a shortfall on a short availability window).

## Verification
- `apps/api`: `pnpm jest` → 980 passed, 471 skipped (gated), 0 failed; typecheck/lint/format clean.
- `apps/web`: `pnpm vitest run` → 1160 passed, 8 failed (the pre-existing `CalendarPage` suite); typecheck/lint/format clean.

## Resume next
1. Nothing for EP13F. Queue order after EP13I (D13-17): EP13L → EP13N → EP13K → EP13J → EP13M; EP13L is next.
2. `pnpm --filter @studypilot/api test` re-confirms the engine suites if needed.
- Read next: `../../README.md` execution queue, `../../EP13L-deterministic-estimate-calibration.md`, `../../EP13J-energy-aware-availability-and-placement.md`.
