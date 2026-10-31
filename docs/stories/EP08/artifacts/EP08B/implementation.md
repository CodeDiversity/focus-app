# EP08B implementation record

**Story:** [EP08B-deterministic-workload-rescheduling.md](../../EP08B-deterministic-workload-rescheduling.md)
**Implemented:** 2026-10-31 (single implementer pass; pure domain module)
**Baseline HEAD before changes:** `b00271ca33b962aa4ac93af346bbcc4d7f661936`
**Parent:** EP08 breakdown; combined EP08 parent review after all six children.
**Scope:** pure `replan(...)` domain function reusing EP06's engine. EP08C–EP08F were **not** started.

## Changed paths

Production:
- `apps/api/src/domain/study-planning/catch-up.ts` (**new**) — `replan`, `ReplanInput`, `ReplanOutput`, `MissedSession`, `ReplanBusyInterval`.

Tests:
- `apps/api/src/domain/study-planning/catch-up.spec.ts` (**new**) — 11 unit tests (TR-E08-03).

Docs:
- `docs/stories/EP08/artifacts/EP08B/checkpoint.md`
- `docs/stories/EP08/artifacts/EP08B/implementation.md` (this file)
- `docs/stories/EP08/EP08B-deterministic-workload-rescheduling.md` — Status → Implemented — awaiting parent review
- `docs/stories/EP08/README.md` — queue row EP08B, active/next substory, evidence links

No HTTP, no persistence, no migration, no UI. No writes to any data. No new scheduling algorithm.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 `replan(input)` pure: no I/O, no clock, no randomness; "today"/window supplied by caller | **PASS.** Module imports only `./remaining-work` and `./scheduler`; reads no clock. `days[0]` is "today". | catch-up.ts imports |
| 2 Reuses EP06's `schedule(...)`; no second implementation | **PASS.** `replan` calls `schedule` and `classifyAssignments` by import; test compares output to a direct `schedule()` call. | catch-up.ts, catch-up.spec.ts |
| 3 Unfinished assignments only; completed excluded | **PASS.** Facts path runs `classifyAssignments` (skips non-unfinished); classified path filters `flagged === null`. Tests assert COMPLETED/SUBMITTED/GRADED excluded. | catch-up.spec.ts |
| 4 Locked `PlannedSession`s never proposed and in busy set | **PASS.** Locked intervals are in `busy` (passed to engine), so placements cannot overlap; `lockedPreserved` counted. Tests assert no overlap and count. | catch-up.spec.ts |
| 5 Completed `PlannedSession`s and confirmed `StudySession`s in busy set | **PASS.** All `busy` intervals passed to engine unchanged; completed tagged intervals counted as `completedPreserved`. Tests assert no overlap and count. | catch-up.spec.ts |
| 6 Deficit categories surfaced unchanged | **PASS.** `results` returned verbatim from `schedule()`; tests assert `NO_AVAILABLE_TIME` and `OVERDUE`. | catch-up.spec.ts |
| 7 Never writes to assignments; due dates inputs only | **PASS.** Pure function; assignment objects are not mutated (purity test). | catch-up.spec.ts |
| 8 Deterministic output | **PASS.** Test compares `JSON.stringify` across two runs. | catch-up.spec.ts |
| 9 Output includes proposed sessions + missed-session list + counts | **PASS.** `ReplanOutput` carries `sessions`, `results`, `missedSessions`, `lockedPreserved`, `completedPreserved`. | catch-up.ts |

## Verification

Working directory: `/Users/michaelrobert/Desktop/focus-app`

- `npm run typecheck --workspace=apps/api` — exit 0.
- `npm run lint --workspace=apps/api` — exit 0, 0 warnings.
- `npm run test --workspace=apps/api` — 41 suites / 894 tests passed (catch-up spec: 11 tests).
- `npm run build --workspace=apps/api` — exit 0.

## Findings and deviations

- **F-B-1 (none):** No deviations from the shared contract. The `busy` input accepts both tagged `ReplanBusyInterval[]` and plain `DatedInterval[]`; counts default to 0 when tags are absent, so EP08C can pass confirmed sessions untagged without affecting preserved totals.
- **F-B-2 (input flexibility):** `assignments` accepts raw `AssignmentFacts[]` (replan calls `classifyAssignments`) or already-classified arrays (used as-is). This keeps the reuse contract (classifyAssignments is called on the facts path) while letting EP08C pass pre-classified data if preferred.
- **F-B-3 (MissedSession shape):** Defined locally in the domain module (not imported from the service) to keep the domain→module dependency arrow clean; structurally identical to the service's `MissedSession`.

## Status

Implemented — awaiting parent review.