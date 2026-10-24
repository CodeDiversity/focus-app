-- EP03 AC-2: quick-created assignments may omit a deadline.
-- Existing deadlines are preserved; no backfill is required.
ALTER TABLE "assignments" ALTER COLUMN "dueDate" DROP NOT NULL;
