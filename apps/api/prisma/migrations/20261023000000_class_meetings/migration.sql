-- SP-112A (D112-1/D112-4): recurring class meetings. Weekly times follow the
-- `availability_slots` precedent: `dayOfWeek` 0–6 (Sunday=0 … Saturday=6)
-- plus `HH:mm` strings (`endTime` strictly after `startTime`, same day —
-- enforced by the API). `courseId` cascades from `courses` (safety net
-- only — the MVP exposes no course hard-delete); `userId` cascades from
-- `users` and scopes every meeting query. The per-course unique
-- (`courseId`, `dayOfWeek`, `startTime`) backs the 409 "slot taken" rule.
-- Verified byte-equivalent to `prisma migrate diff --from-schema
-- --to-schema --script` output for the schema change (SP-111A F111A-1
-- precedent).
-- CreateTable
CREATE TABLE "class_meetings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_meetings_courseId_dayOfWeek_startTime_key" ON "class_meetings"("courseId", "dayOfWeek", "startTime");

-- AddForeignKey
ALTER TABLE "class_meetings" ADD CONSTRAINT "class_meetings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_meetings" ADD CONSTRAINT "class_meetings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
