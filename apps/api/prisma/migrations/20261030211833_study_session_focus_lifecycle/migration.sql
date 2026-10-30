-- CreateEnum
CREATE TYPE "StudySessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "planned_sessions" RENAME CONSTRAINT "scheduled_tasks_pkey" TO "planned_sessions_pkey";

-- AlterTable
ALTER TABLE "study_sessions" ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plannedMinutes" INTEGER,
ADD COLUMN     "resumedAt" TIMESTAMP(3),
ADD COLUMN     "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "taskId" TEXT,
ALTER COLUMN "endTime" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "study_sessions_userId_status_idx" ON "study_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startTime_idx" ON "study_sessions"("userId", "startTime");

-- RenameForeignKey
ALTER TABLE "planned_sessions" RENAME CONSTRAINT "scheduled_tasks_studyPlanId_fkey" TO "planned_sessions_studyPlanId_fkey";

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (EP07A, D07-1): every pre-migration row has endTime + durationMinutes
-- set, so mark them COMPLETED and derive elapsedSeconds from durationMinutes.
UPDATE "study_sessions" SET "status" = 'COMPLETED', "elapsedSeconds" = "durationMinutes" * 60;

-- Rollback (manual, reverse order):
-- UPDATE "study_sessions" SET "endTime" = COALESCE("endTime", "startTime") ... (not needed: all rows have endTime);
-- ALTER TABLE "study_sessions" ALTER COLUMN "end_time" SET NOT NULL;
-- DROP INDEX "study_sessions_userId_startTime_idx";
-- DROP INDEX "study_sessions_userId_status_idx";
-- ALTER TABLE "study_sessions" DROP CONSTRAINT "study_sessions_taskId_fkey";
-- ALTER TABLE "study_sessions" DROP CONSTRAINT "study_sessions_assignmentId_fkey";
-- ALTER TABLE "study_sessions" DROP COLUMN "resumedAt", "plannedMinutes", "elapsedSeconds", "status", "taskId", "assignmentId";
-- DROP TYPE "StudySessionStatus";
