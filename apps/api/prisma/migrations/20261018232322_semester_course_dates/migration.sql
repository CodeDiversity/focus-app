-- SP-107B (D107-7): switch the Semester date columns to calendar dates
-- (follows the `study_plans.date DATE` precedent). Existing rows are
-- cast in place; no semesters module existed before this story, so the
-- cast is a no-op in practice (row count recorded in the SP-107B
-- implementation record).
-- AlterTable
ALTER TABLE "semesters" ALTER COLUMN "startDate" SET DATA TYPE DATE USING "startDate"::date,
ALTER COLUMN "endDate" SET DATA TYPE DATE USING "endDate"::date;
