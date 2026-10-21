-- SP-111A (D111-1): add the instructor column to courses — nullable, no
-- default (the API validates ≤ 100 chars after trim; existing rows stay
-- NULL until edited).
-- AlterTable
ALTER TABLE "courses" ADD COLUMN "instructor" TEXT;
