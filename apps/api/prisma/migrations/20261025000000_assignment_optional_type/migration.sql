-- SP-115G (D115-1): optional closed assignment type.
-- Additive: the column is nullable with no default, so existing rows keep
-- `type = NULL` — no backfill (D115-4/AC-1). Rollback:
--   ALTER TABLE "assignments" DROP COLUMN "type";
--   DROP TYPE "AssignmentType";
-- in that order.

CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM');
ALTER TABLE "assignments" ADD COLUMN "type" "AssignmentType";
