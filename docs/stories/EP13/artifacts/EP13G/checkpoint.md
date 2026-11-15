# EP13G checkpoint
Updated: 2026-11-15 (local session)
Execution state: [EP13 execution queue](../../README.md#execution-queue) → row EP13G
Story: [EP13G — Flexible Day-Anchored Sessions (Model + Engine + API)](../../EP13G-flexible-day-anchored-sessions-api.md)
Review unit: EP13 parent (combined review after EP13M); parent index `../EP13/implementation.md` (not yet written)
Role / scope: implementer; backend only — model, engine partition, conflict semantics, payload/DTO round-trip, start-fixes-time. Excludes all presentation (EP13H) and energy (EP13I).

## Repository state
- Workspace / branch: `oak` worktree, `hfi/7d487005-e0c1-41bd-86ad-91c841f956bb/oak`
- HEAD at last update: see the EP13G implementation commit (`feat(EP13G): …`)
- Saved work: EP13A–EP13F committed; the EP13G implementation commit
- Other work to preserve: none

## Progress
- [x] M1 — schema + migration (`anchor`, `windowHint`, two enums; existing rows backfill FIXED)
- [x] M2 — engine: deterministic FLEX_DAY/FIXED partition + window hint on the proposal
- [x] M3 — conflicts: flex excluded from clock overlap, still counted in day budgets
- [x] M4 — payloads + DTO round-trip (preview/catch-up/save/getPlan/today), lock implies FIXED
- [x] M5 — start-from-planned fixes a flex session at its real time; rollover proof
- [x] M6 — verification, implementation record, queue update, commit
- Current step: none — story complete; see `implementation.md`.

## Decisions and dependencies
- **D13-4 resolved as option (b)** — user instruction 2026-11-15 ("implement 13G"),
  taking the planner's recorded recommendation: `startTime`/`endTime` stay
  non-nullable as the *suggested* slot, `anchor` (FIXED|FLEX_DAY) carries the
  semantics, `windowHint` is an optional flex-only hint. Recorded in the story
  status and the queue row's evidence; the README's decision register is
  planner-owned and still shows D13-4 open (F-EP13G-01).
- Pinning rule (AC-1): an assignment's blocks are emitted FIXED when its
  remaining work leaves less than one `minSessionMinutes` of slack in its own
  horizon capacity, or when it ends with an `INSUFFICIENT_TIME_BEFORE_DEADLINE`
  deficit. Overdue work does **not** pin (there is no deadline left to protect,
  and pinning it would re-create the "scheduled opportunity to fail").
- `windowHint` is derived from the suggested slot (<12:00 MORNING, <17:00
  AFTERNOON, else EVENING) and is `null` on FIXED sessions.
- Locking a session fixes it (`locked: true` ⇒ `anchor: FIXED`), enforced by
  the write rather than rejected as invalid.

## Verification
- `apps/api`: `pnpm jest` → 1012 passed, 473 skipped (gated), 0 failed;
  typecheck/lint/format clean; `db:generate` run for the two new enums.
- `apps/web`: unchanged — 1160 passed, 8 pre-existing `CalendarPage` failures.
- Open findings ride to the parent review: F-EP13G-01 (decision register still
  shows D13-4 open — planner-owned), F-EP13G-02 (two flex sessions may share a
  clock slot — EP13H presentation), F-EP13G-03 (gated suites + migration
  CI-executed), F-EP13G-04 (no student-visible benefit until EP13H).

## Resume next
1. Nothing for EP13G. The queue's next actionable rows are EP13H (needs its
   `refiner` pass first, D13-14), EP13I or EP13L.
2. `pnpm --filter @studypilot/api test` re-confirms the engine/service suites.
- Read next: `../../README.md` execution queue, `../../EP13H-flexible-sessions-ui.md`.
