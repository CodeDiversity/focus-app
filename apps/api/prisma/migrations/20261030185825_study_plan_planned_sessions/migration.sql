-- EP06D: reshape the legacy StudyPlan/ScheduledTask persistence into the
-- plan's persistence (D06-8): rename scheduled_tasks -> planned_sessions and
-- ScheduledTaskStatus -> PlannedSessionStatus; drop the taskId/unique constraint;
-- add assignmentId (NOT NULL, FK to assignments ON DELETE CASCADE) behind a
-- guard that raises on a non-empty table; add the two indexes.
--
-- The physical names are the schema's real camelCase names (no @map on any
-- scalar field). The order below is part of the migration: the unique index
-- must be dropped BEFORE the column it indexes, because PostgreSQL drops an
-- index that involves a dropped column together with that column (a later
-- DROP INDEX would abort with "index ... does not exist").

-- 1. Rename the table (indexes and constraints keep their original names).
ALTER TABLE "scheduled_tasks" RENAME TO "planned_sessions";

-- 2. Rename the enum type.
ALTER TYPE "ScheduledTaskStatus" RENAME TO "PlannedSessionStatus";

-- 3. Drop the unique index BEFORE the column that owns it.
DROP INDEX "scheduled_tasks_studyPlanId_taskId_key";

-- 4. Drop the taskId column (its FK scheduled_tasks_taskId_fkey and its
--    NOT NULL go with it).
ALTER TABLE "planned_sessions" DROP COLUMN "taskId";

-- 5. Add assignmentId behind a guard, then NOT NULL + FK.
ALTER TABLE "planned_sessions" ADD COLUMN "assignmentId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "planned_sessions") THEN
    RAISE EXCEPTION 'planned_sessions must be empty before the EP06 migration';
  END IF;
END $$;

ALTER TABLE "planned_sessions" ALTER COLUMN "assignmentId" SET NOT NULL;

ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Indexes.
CREATE INDEX "planned_sessions_studyPlanId_idx" ON "planned_sessions"("studyPlanId");
CREATE INDEX "planned_sessions_assignmentId_idx" ON "planned_sessions"("assignmentId");
