-- EP15A (D15-1, D15-4, D15-5, D15-13; story decisions D-A1…D-A4): the
-- schedule model — per-weekday day bounds, student-created BUSY / STUDY
-- blocks (one-off or weekly, weekdays as a bitmask) and cancelled
-- occurrences of weekly blocks.
--
-- Additive, and it copies every `availability_slots` row into
-- `schedule_blocks` so later EP15 children verify against real data
-- (AC-E15-13): `kind` = STUDY when `isAvailable` else BUSY; `energy` kept for
-- STUDY and NORMAL for BUSY; `weekdays` = 1 << dayOfWeek; `startDate` =
-- `createdAt::date` (D-A2 — `createdAt` is a zone-less TIMESTAMP(3) holding
-- the UTC instant, so the cast is the UTC civil date, not the profile
-- zone; at worst one day late for a slot created near local midnight);
-- `title` NULL; times verbatim; `userId` preserved (DoD-3). Ids come from
-- `gen_random_uuid()` (D-A3, Postgres 13+ built-in). `availability_slots`
-- itself is not modified — the old API keeps serving it until EP15I drops
-- the table (D15-15).
--
-- The copy is exactly the statement between `-- copy:start` and
-- `-- copy:end`; the gated round-trip spec
-- (`src/modules/schedule/schedule-migration.e2e.spec.ts`, TR-E15-01 / V-15-2)
-- executes that statement verbatim against a seeded table.
--
-- Rollback (a full restore, because `availability_slots` was never touched —
-- R-EP15-05):
--   DROP TABLE "schedule_block_exceptions", "schedule_blocks", "day_bounds";
--   DROP TYPE "ScheduleBlockKind";
--
-- DDL below is the verbatim `prisma migrate diff --from-config-datasource
-- --to-schema prisma/schema.prisma --script` output (SP-111A F111A-1
-- precedent).

-- CreateEnum
CREATE TYPE "ScheduleBlockKind" AS ENUM ('BUSY', 'STUDY');

-- CreateTable
CREATE TABLE "day_bounds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "sleepTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_bounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_blocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ScheduleBlockKind" NOT NULL,
    "title" TEXT,
    "courseId" TEXT,
    "energy" "EnergyLevel" NOT NULL DEFAULT 'NORMAL',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "weekdays" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_block_exceptions" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "schedule_block_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "day_bounds_userId_dayOfWeek_key" ON "day_bounds"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "schedule_blocks_userId_startDate_idx" ON "schedule_blocks"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_block_exceptions_blockId_date_key" ON "schedule_block_exceptions"("blockId", "date");

-- AddForeignKey
ALTER TABLE "day_bounds" ADD CONSTRAINT "day_bounds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_block_exceptions" ADD CONSTRAINT "schedule_block_exceptions_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "schedule_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy every availability slot into schedule_blocks (AC-E15-13, V-15-2).
-- copy:start
INSERT INTO "schedule_blocks" ("id", "userId", "kind", "title", "courseId", "energy", "startDate", "endDate", "weekdays", "startTime", "endTime", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    s."userId",
    CASE WHEN s."isAvailable" THEN 'STUDY'::"ScheduleBlockKind" ELSE 'BUSY'::"ScheduleBlockKind" END,
    NULL,
    NULL,
    CASE WHEN s."isAvailable" THEN s."energy" ELSE 'NORMAL'::"EnergyLevel" END,
    (s."createdAt")::date,
    NULL,
    (1 << s."dayOfWeek"),
    s."startTime",
    s."endTime",
    s."createdAt",
    s."updatedAt"
FROM "availability_slots" s;
-- copy:end
