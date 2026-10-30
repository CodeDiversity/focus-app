# EP06D implementation

**Story:** EP06D — Study-Plan Persistence & Preview / Save / Read API
**Status:** Implemented — awaiting parent review
**Artifact root:** docs/stories/EP06/artifacts/EP06D/

## Summary of changes

- Migration `apps/api/prisma/migrations/20261030185825_study_plan_planned_sessions/migration.sql` reshapes persistence: renames `scheduled_tasks`→`planned_sessions` and `ScheduledTaskStatus`→`PlannedSessionStatus`, drops the unique index before the `taskId` column, drops `taskId`, adds `assignmentId` (NOT NULL, FK to assignments ON DELETE CASCADE) behind a non-empty guard, adds two indexes.
- `apps/api/prisma/schema.prisma`: `PlannedSession` model + `PlannedSessionStatus` enum; `StudyPlan.sessions`; `Assignment.plannedSessions`; `Task.scheduledTasks` removed.
- `apps/api/src/common/ownership/ownership.ts`: scope comment names `PlannedSession` and `studyPlan.userId`.
- `apps/api/src/domain/study-planning/conflicts.ts` (+ spec): pure `findConflicts` using shared `freeIntervals` (base whole-day) and `overlaps` precedence.
- `apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts`, `dto/list-study-plans-query.dto.ts`: new DTOs.
- `apps/api/src/modules/study-plans/study-plan.controller.ts`: `POST /study-plans/preview`, `POST /study-plans`, `GET /study-plans` (preview returns 200).
- `apps/api/src/modules/study-plans/study-plans.service.ts`: `gatherPlanData`, `preview`, `save`, `getPlan`.
- `apps/api/src/common/filters/all-exceptions.filter.ts`: preserve `conflicts` field additively.

## Acceptance criteria outcomes

1. Migration + schema + ownership comment — Done. Verified via `\d planned_sessions` and enum query.
2. Preview side-effect free — Done; preview performs no writes.
3. Save atomic, body exact fields, derived duration, targetMinutes round-trip — Done.
4. Malformed → 400; foreign assignment → 404 uniform; overlap → 409 with conflicts array and four reason codes — Done.
5. Replace only named window via relation filter; rollover 409 WINDOW_ROLLED_OVER — Done.
6. No assignment writes — Done (manual verified dueDate byte-for-byte).
7. GET /study-plans with/without range, invalid range 400, no userId exposure — Done.
8. Ownership scoping + uniform 404 + 401 — Done.
9. Unit/data-scoping/e2e + migration check — Done (recorded below).

## Verification

| Command | CWD | Result |
|---|---|---|
| pnpm --filter api db:migrate (reset + re-apply) | apps/api | Applied cleanly; guard succeeded on empty table; planned_sessions + PlannedSessionStatus + two indexes present |
| pnpm --filter api test -- study-plans | apps/api | 3 suites / 56 tests passed |
| pnpm --filter api test -- conflicts | apps/api | 1 suite / 8 tests passed |
| pnpm --filter api test | apps/api | 59 suites / 1274 tests passed |
| pnpm --filter api typecheck | apps/api | exit 0 |
| pnpm --filter api lint | apps/api | exit 0 |

Database URL used: postgresql://michaelrobert@localhost:5432/studypilot (local dev, already-migrated). No .env files read.

## Rollback (documented)

1. `DELETE FROM "planned_sessions";`
2. `DROP INDEX "planned_sessions_studyPlanId_idx"; DROP INDEX "planned_sessions_assignmentId_idx";`
3. `ALTER TABLE "planned_sessions" DROP CONSTRAINT "planned_sessions_assignmentId_fkey"; ALTER TABLE "planned_sessions" DROP COLUMN "assignmentId";`
4. `ALTER TABLE "planned_sessions" ADD COLUMN "taskId" TEXT NOT NULL;` + FK `scheduled_tasks_taskId_fkey` ON DELETE RESTRICT + `CREATE UNIQUE INDEX "scheduled_tasks_studyPlanId_taskId_key" ...`
5. `ALTER TABLE "planned_sessions" RENAME TO "scheduled_tasks"; ALTER TYPE "PlannedSessionStatus" RENAME TO "ScheduledTaskStatus";`

## Changed paths

- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20261030185825_study_plan_planned_sessions/migration.sql
- apps/api/src/common/filters/all-exceptions.filter.ts
- apps/api/src/common/ownership/ownership.ts
- apps/api/src/domain/study-planning/conflicts.ts
- apps/api/src/domain/study-planning/conflicts.spec.ts
- apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts
- apps/api/src/modules/study-plans/dto/list-study-plans-query.dto.ts
- apps/api/src/modules/study-plans/study-plan.controller.ts
- apps/api/src/modules/study-plans/study-plans.service.ts

## Findings / deviations

- F-EP06D-01: AllExceptionsFilter did not preserve the `conflicts` field on 409 responses; fixed additively by copying `record.conflicts` through. Disposition: fixed. Evidence: manual integration test now returns conflicts array.
- Findings/deviations: None otherwise.

## Commit scope

Scoped commits recorded in handoff. apps/api/tsconfig.json left modified and unstaged (not owned).