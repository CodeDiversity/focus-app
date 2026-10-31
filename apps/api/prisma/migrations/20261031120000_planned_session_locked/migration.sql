-- EP08A (PR-001): additive `locked` flag on PlannedSession.
-- Locked sessions are never moved/resized/deleted by replanning and are
-- treated as busy. Defaults to false; existing rows backfill to false.
-- Rollback: drop the column.
ALTER TABLE "planned_sessions" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
