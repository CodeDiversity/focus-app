-- EP14E (D-E1a, D-E2): the student-owned "hard" flag on assignments.
--
-- Additive. Nullable, no default: every existing row reads back NULL, which
-- the engine treats as Auto (the D13-10 type/size rule, unchanged), so no
-- student's plan changes until they choose Hard or Not hard. No backfill.
--
-- Rollback: ALTER TABLE "assignments" DROP COLUMN "hard";

ALTER TABLE "assignments" ADD COLUMN "hard" BOOLEAN;
