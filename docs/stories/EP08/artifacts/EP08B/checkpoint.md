# EP08B checkpoint

Updated: 2026-10-31 (local)
Execution state: [EP08 README queue](../../README.md#execution-queue) row EP08B — `Implemented — awaiting parent review`
Story: [EP08B-deterministic-workload-rescheduling.md](../../EP08B-deterministic-workload-rescheduling.md)
Review unit: EP08 combined parent review (`../EP08/review.md` + `../EP08/walkthrough.md`) after all six children
Role / scope: implementer; pure domain rescheduler only. No HTTP, no persistence, no UI, no new scheduling algorithm.
Result record: [implementation.md](./implementation.md)

## Repository state
- Workspace / branch: `/Users/michaelrobert/Desktop/focus-app`, `main`
- Baseline HEAD before changes: `b00271ca33b962aa4ac93af346bbcc4d7f661936`
- Saved work: this child's scoped commit (hash returned in handoff; see implementation record for paths)
- Other work to preserve: coordinator-owned autopilot block in `docs/stories/EP08/README.md` — reconciled for queue row EP08B only.

## Progress
- [x] Added `apps/api/src/domain/study-planning/catch-up.ts` exporting `replan`, `ReplanInput`, `ReplanOutput`, `MissedSession`, `ReplanBusyInterval`.
- [x] `replan` reuses EP06's `classifyAssignments` (facts path) and `schedule` (placement); no duplicated logic.
- [x] Locked/completed preservation counted from tagged `busy` intervals; busy passed to engine unchanged.
- [x] Completed-assignment exclusion via `classifyAssignments`.
- [x] Unit tests in `catch-up.spec.ts` (11 tests, TR-E08-03).
- [x] Verification: api typecheck, lint, tests, build green.
- Current step: none — EP08B implementation complete; do not start EP08C.

## Decisions and dependencies
- Input `assignments` accepts raw `AssignmentFacts[]` (calls `classifyAssignments`) or already-classified arrays (used as-is), so completed assignments are excluded in both paths.
- `busy` intervals may carry `locked`/`completed` tags; untagged intervals (e.g. confirmed `StudySession`s) count towards neither preserved total.
- Civil-date discipline preserved: module stays zone-free; caller dates windows/sessions.
- No writes, no clock, no randomness; "today" is `days[0]`.

## Verification
- `npm run typecheck --workspace=apps/api` — exit 0.
- `npm run lint --workspace=apps/api` — exit 0, 0 warnings.
- `npm run test --workspace=apps/api` (catch-up spec) — 11 tests passed; full suite 894 passed.
- `npm run build --workspace=apps/api` — exit 0.

## Resume next
1. None for EP08B. Next child EP08C may be implemented after this child's review gate is satisfied by the combined EP08 review.
2. Do not start EP08C until EP08B is accepted as part of the combined review (implementation completion unblocks dependent children per README).
- Read next: `implementation.md`; story AC/test sections only if the reviewer raises findings.