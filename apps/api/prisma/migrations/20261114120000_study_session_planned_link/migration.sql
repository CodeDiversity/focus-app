-- EP13B: the durable link between a planned session and the focus session
-- that executes it.
--
-- Additive and nullable: every existing row backfills to NULL (a session
-- started from an assignment — EP07's original path — has no planned row).
-- ON DELETE SET NULL so deleting a planned session (replanning deletes
-- SCHEDULED rows every save) never deletes a student's study history.
--
-- Rollback: drop the index, the constraint and the column, in that order.

ALTER TABLE "study_sessions" ADD COLUMN "plannedSessionId" TEXT;

ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plannedSessionId_fkey"
  FOREIGN KEY ("plannedSessionId") REFERENCES "planned_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "study_sessions_plannedSessionId_idx" ON "study_sessions"("plannedSessionId");
