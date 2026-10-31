# EP08C — Catch-Up Plan Preview, Confirmation and Feasibility API

**Story ID:** EP08C
**Parent epic:** [EP08: Catch-Up & Recovery](../../epics/EP08-catch-up-and-recovery.md) (Jira STUDY-17)
**Milestone:** M4
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP08A + EP08B implemented. EP06 save/conflict primitives reused. No UI decisions.
**Jira key:** Pending creation

## Summary

The catch-up API spine. `POST /study-plans/catch-up/preview` runs the rescheduler (EP08B) over the student's current data and returns a side-effect-free `CatchUpPreview` (proposed sessions + missed sessions + feasibility warnings + locked/completed preservation counts). `POST /study-plans/catch-up/confirm` persists the accepted change set transactionally, preserving completed, in-progress, skipped, rescheduled and locked sessions, re-checking conflicts on save, and never touching `StudySession`, `Assignment` or `Task`. Declining is client-side (no call). This story also owns the `locked` migration on `PlannedSession` (D08-4, provisional).

## Scope

**In scope:**
- `locked Boolean @default(false)` migration on `PlannedSession` (additive, reversible).
- `POST /study-plans/catch-up/preview` (side-effect-free).
- `POST /study-plans/catch-up/confirm` (transactional, conflict re-check, locked/completed preservation).
- Conflict re-check reusing EP06's `findConflicts` + `overlaps`.
- Window validation reusing EP06's `WINDOW_ROLLED_OVER` rules.
- Assignment-row-unchanged assertion (AC-E08-08).
- Ownership scoping and uniform 404.
- Unit + data-scoping + API e2e tests.

**Out of scope:**
- The rescheduler itself (EP08B).
- Any UI (EP08E).
- Historical-log writes (explicitly forbidden).
- A server-side decline endpoint (provisional, V-08-4: client-side).

## Source requirement references

- Epic AC-E08-02 (manual initiation) — endpoint.
- Epic AC-E08-03 (completed work/logs unchanged) — confirm writes only plan rows.
- Epic AC-E08-04 (availability/commitments) — busy set + conflict re-check.
- Epic AC-E08-05 (preview before confirm) — side-effect-free preview.
- Epic AC-E08-06 (locked sessions preserved) — confirm preserves locked.
- Epic AC-E08-07 (report infeasible work) — feasibility warnings in preview.
- Epic AC-E08-08 (never extends deadlines) — no assignment writes.
- Epic AC-E08-09 (decline) — preview side-effect-free.
- Shared DoD items 1, 2, 3, 4, 8, 9 (item 10/11 belong to the combined EP08 parent review).
- TR-E08-04.

## Acceptance criteria

1. `POST /study-plans/catch-up/preview` returns 200 with a `CatchUpPreview` and performs **no writes** (verified by row counts before/after).
2. `CatchUpPreview` reuses EP06's `PlanPreview` fields (`from`, `to`, `timeZone`, `generatedAt`, `preferences`, `days`, `warnings`, `deferred`) plus `missedSessions`, `lockedPreserved`, `completedPreserved`.
3. Feasibility warnings reuse EP06's categories (`NO_AVAILABLE_TIME`, `INSUFFICIENT_TIME_BEFORE_DEADLINE`, `OVERDUE`) and shape.
4. `POST /study-plans/catch-up/confirm` with a valid body returns 201 with a `SavedPlan` and, inside one transaction:
   - validates the window (same rules as EP06D save, including `to === from + 6` and `WINDOW_ROLLED_OVER`);
   - re-runs the conflict check using EP06's `findConflicts`; on conflict returns 409 with a `conflicts` array using the same reason codes and precedence;
   - deletes only `PlannedSession` rows with `status === 'SCHEDULED' && locked === false` within `[from, to]`;
   - upserts `StudyPlan` rows per day (target hours from placed minutes);
   - inserts the submitted proposed sessions with `status: 'SCHEDULED'`, `locked: false`;
   - never writes `StudySession`, `Assignment` or `Task`.
5. After confirm, completed, in-progress, skipped, rescheduled and locked `PlannedSession`s in the window are unchanged (counts and fields).
6. Malformed sessions return 400 with a field-level `errors` map (same matrix as EP06D: missing assignmentId, date out of window, endTime ≤ startTime).
7. A foreign or missing assignment returns the uniform 404 `Resource not found`.
8. Assignment rows are unchanged field-for-field after confirm (AC-E08-08); a test asserts this.
9. `StudySession` rows are unchanged after confirm (AC-E08-03); a test asserts this.
10. Declining = not calling confirm; no server-side mutation occurs on preview. No decline endpoint is required (provisional, V-08-4).
11. The `locked` migration is additive with a default of `false`; existing rows keep `locked = false`; rollback drops the column with no data loss.

## Tests (TR-E08-04)

- Preview side-effect-free (row counts unchanged before/after).
- Confirm atomic and preserves completed + locked sessions (counts + fields).
- Conflict re-check on confirm (409) with per-session reasons (reuse EP06's reason codes).
- Malformed-session matrix (400).
- Window rollover (409 `WINDOW_ROLLED_OVER`).
- Foreign-assignment uniform 404.
- Assignment rows unchanged after confirm (AC-E08-08).
- `StudySession` rows unchanged after confirm (AC-E08-03).
- Missed-session list correctness in the preview.
- Migration shape and reversibility (if a migration test harness exists; otherwise documented).

## Technical notes

- **Inspected code paths (verified):**
  - `apps/api/src/modules/study-plans/study-plans.service.ts` — `preview`, `save`, `gatherPlanData`, `findConflicts` call site, `dtoErrors`, ownership, civil-date conversion.
  - `apps/api/src/domain/study-planning/conflicts.ts` (`findConflicts`, `overlaps`).
  - `apps/api/src/domain/study-planning/scheduler.ts`.
  - `apps/api/prisma/schema.prisma` — `PlannedSession`, `StudyPlan`.
  - `apps/api/src/common/ownership/ownership.ts`.
- **Proposed (new/changed):**
  - Migration: add `locked Boolean @default(false)` to `PlannedSession` (one migration folder, additive; document in implementation record).
  - `StudyPlansService` methods `catchUpPreview(userId)` and `catchUpConfirm(userId, dto)`, reusing `gatherPlanData` (possibly refactored to be reusable) and `replan(...)`.
  - Controller routes `POST /study-plans/catch-up/preview` and `POST /study-plans/catch-up/confirm` (or a dedicated controller — implementation detail; contract is the path).
  - `gatherPlanData` must also collect `PlannedSession` rows (with `locked`) for the busy set and `StudySession` confirmed minutes; reuse EP06's pattern.
- **Conflict re-check:** reuse the exact EP06D call site pattern (`findConflicts(submitted, { classes, blocked, busy })`) with the same dated-interval construction; only the busy set changes (adds completed + locked planned sessions).
- **No new scheduling algorithm:** placement comes from EP08B's `replan`, which calls EP06's `schedule`.
- **Civil-date discipline:** same as EP06D (profile zone, `zoneParts`, `wallToInstant`).

## Definition of Done

1. Functional criteria pass (AC-E08-02, AC-E08-03, AC-E08-04, AC-E08-05, AC-E08-06, AC-E08-07, AC-E08-08, AC-E08-09).
2. Invalid input validation (session matrix, range caps).
3. Student data scoping (userId in every where; foreign → uniform 404).
4. Actionable API errors (400 field-level, 409 conflicts, 409 WINDOW_ROLLED_OVER, 404 uniform, 401).
5. Loading/empty/error states at API boundary.
6. Keyboard/accessibility N/A (backend).
7. Responsive N/A (backend).
8. Automated tests (TR-E08-04).
9. API/migration documentation (migration steps + rollback in implementation record; contract in EP08 README — done).
10. Integrated review — combined EP08 parent review.
11. Reviewer walkthrough — reviewer, once for the EP08 parent unit.

## Sizing

- **Outcome:** one independently verifiable backend outcome (preview + confirm API + migration + tests).
- **Estimate:** 3 requests/tokens.
- **Model recommendation:** 4 — high complexity (transactional persistence with selective deletion, conflict re-check, migration, cross-entity invariants); careful ownership discipline.
- **Production files:** `apps/api/src/modules/study-plans/study-plans.service.ts` (extend) or new module; controller; migration folder; `schema.prisma`.
- **Test files:** `*.service.spec.ts`, `*data-scoping.spec.ts`, `*e2e.spec.ts`.
- **Minimal start context:** this story file, EP08 README, EP06D section of `study-plans.service.ts` (save/getPlan/gatherPlanData), EP08B's replan module, `conflicts.ts`, `ownership.ts`, `schema.prisma`.
- **Verification commands:** `npm run test --workspace=apps/api`, `npm run test:e2e --workspace=apps/api`, `npm run typecheck --workspace=apps/api`, `npm run lint --workspace=apps/api`, `npx prisma migrate dev` (local).
- **Dependencies:** EP08A + EP08B. Blocks EP08E (UI) and EP08F (E2E).
- **Exclusions:** no UI, no new scheduling algorithm, no historical-log writes.

## Tracker reference

Jira key: Pending creation (no sync authorized).