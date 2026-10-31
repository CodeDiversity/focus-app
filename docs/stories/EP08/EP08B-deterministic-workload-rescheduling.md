# EP08B — Deterministic Workload Rescheduling

**Story ID:** EP08B
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Backend (pure domain module)
**Status:** Queued
**Dependencies:** EP08A implemented (missed/unfinished inputs); EP06 engine available (`domain/study-planning/`). No UI decisions.
**Jira key:** Pending creation

## Summary

The deterministic rescheduler for catch-up. It does **not** create a second scheduling algorithm: it reuses EP06's `schedule(...)` engine, feeding it the unfinished assignments and a busy set that includes the student's current availability constraints plus **completed** and **locked** planned sessions, so replacement sessions land only in genuinely free time. The output is a proposed change set (sessions to add/move, plus the engine's deficit/feasibility warnings) that EP08C wraps in a preview/confirm API. The module is pure: no writes, no clock, no randomness.

## Scope

**In scope:**
- A pure `replan(...)` function (and supporting types) in the study-planning domain module.
- Reuse of `schedule`, `classifyAssignments`, `compareAssignments`, `freeIntervals` (no copy of the subtraction logic).
- Locked-session and completed-session preservation (treated as busy; never moved).
- Completed-assignment exclusion.
- Deficit/feasibility warnings surfaced unchanged from the engine.
- Unit tests (TR-E08-03).

**Out of scope:**
- HTTP/persistence (EP08C).
- Any UI (EP08D/E).
- Any write to the database.
- A new scheduling algorithm (explicitly forbidden by the epic Technical Notes).

## Source requirement references

- Epic AC-E08-03 (completed work/logs unchanged) — engine is pure, no writes.
- Epic AC-E08-04 (replacement sessions respect availability and commitments).
- Epic AC-E08-06 (locked sessions preserved).
- Epic AC-E08-08 (replanning never extends deadlines).
- Shared DoD items 1, 3 (scoping N/A for pure module), 8, 9.
- TR-E08-03.

## Acceptance criteria

1. `replan(input)` is a pure function: no I/O, no clock read, no randomness; "today" and the window are supplied by the caller.
2. It reuses EP06's `schedule(...)` — there is no second implementation of placement, free-interval subtraction, ordering or deficit classification. Verified by import, not by copy.
3. Unfinished assignments only: assignments whose status is `COMPLETED` are excluded from the proposed sessions (AC-E08-01 downstream, AC-E08-03).
4. Locked `PlannedSession`s are never proposed for movement and are included in the busy set, so new placements cannot overlap them (AC-E08-06).
5. Completed `PlannedSession`s and confirmed `StudySession`s are included in the busy set, so replacements do not collide with existing commitments (AC-E08-04).
6. The engine's deficit categories (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`) are surfaced unchanged as feasibility warnings (AC-E08-07 downstream).
7. The function never writes to assignments: assignment due dates are inputs only and are returned unchanged (AC-E08-08).
8. Output is deterministic: identical inputs produce byte-identical output across runs (the engine's last-key tie-break guarantees a total order).
9. The output includes the proposed sessions (grouped by date, with assignment title + times + duration) and the missed-session list passed in, so EP08C can build the `CatchUpPreview`.

## Tests (TR-E08-03)

- Reuse of `schedule()` verified by import (no duplicated placement logic).
- Locked-session preservation: a locked session is not in the proposed set and blocks placement.
- Completed-session preservation: a completed session is not in the proposed set and blocks placement.
- Completed-assignment exclusion.
- Determinism across repeated runs.
- Purity: no writes, no clock, no randomness (the module imports nothing from `@nestjs/*`, nothing from Prisma).
- Deficit/feasibility categories surfaced.

## Technical notes

- **Inspected code paths (verified):**
  - `apps/api/src/domain/study-planning/scheduler.ts` (`schedule`, `SchedulerInput/Output`).
  - `apps/api/src/domain/study-planning/intervals.ts` (`freeIntervals`, `overlaps`).
  - `apps/api/src/domain/study-planning/ordering.ts` (`compareAssignments`).
  - `apps/api/src/domain/study-planning/remaining-work.ts` (`classifyAssignments`).
  - `apps/api/src/domain/study-planning/conflicts.ts` (`findConflicts`).
  - `apps/api/src/domain/study-planning/types.ts`.
- **Proposed (new):** `apps/api/src/domain/study-planning/catch-up.ts` (or `replan.ts`) exporting `replan(input)` and `ReplanInput`/`ReplanOutput` types, plus `catch-up.spec.ts`. The module lives inside `domain/study-planning/` so the "no Nest, no Prisma, no clock, no randomness" boundary stays visible in the import graph (EP06 convention).
- **Input shape (proposed):** `{ days: string[]; assignments: SchedulableAssignment[]; availability, blocked, classes: WeeklyWindow[]; busy: DatedInterval[];  // confirmed + completed + locked sessions, already dated
    lockedSessions: DatedInterval[]; // subset, for counting/reporting
    missedSessions: MissedSession[]; preferences: StudyPreferences }`.
  - `busy` is the union of confirmed `StudySession`s, completed `PlannedSession`s and locked `PlannedSession`s; `lockedSessions` is passed separately only so the output can report `lockedPreserved`.
- **Output shape (proposed):** `{ sessions: PlannedSessionProposal[]; results: SchedulerResult[]; (deficit categories); missedSessions; lockedPreserved; completedPreserved }`.
- **Replan does not recompute missed sessions** — EP08A owns that. It receives them.
- **Window:** uses the caller-supplied `days` (EP08C supplies the 7-day window per D08-6; provisional).
- **Civil-date discipline:** the caller dates the weekly windows and sessions before calling; the module stays zone-free.

## Definition of Done

1. Functional criteria pass (AC-E08-03, AC-E08-04, AC-E08-06, AC-E08-08).
2. Invalid input N/A (pure function; validation at the API boundary in EP08C).
3. Student data scoping N/A (pure module; scoping is EP08C's).
4. Actionable API errors N/A (pure module).
5. Loading/empty/error states N/A (pure module).
6. Keyboard/accessibility N/A.
7. Responsive N/A.
8. Automated tests (TR-E08-03).
9. API/migration documentation N/A (no API/migration in this story).
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable pure-domain outcome (replan function + tests).
- **Estimate:** 2 requests/tokens.
- **Model recommendation:** 3 — moderate complexity (composition of existing engine, busy-set construction, invariants); no novel algorithm; purity discipline.
- **Production files:** `apps/api/src/domain/study-planning/catch-up.ts` (new), possibly `types.ts` additions.
- **Test files:** `apps/api/src/domain/study-planning/catch-up.spec.ts`.
- **Minimal start context:** this story file, EP08 README, EP06C engine files (`scheduler.ts`, `intervals.ts`, `ordering.ts`, `remaining-work.ts`, `types.ts`, `conflicts.ts`), EP08A's missed-session shape.
- **Verification commands:** `npm run test --workspace=apps/api` (unit), `npm run typecheck --workspace=apps/api`, `npm run lint --workspace=apps/api`.
- **Dependencies:** EP08A (input shapes). Blocks EP08C (consumes replan output).
- **Exclusions:** no HTTP, no persistence, no UI, no new algorithm, no migration.

## Tracker reference

Jira key: Pending creation (no sync authorized).