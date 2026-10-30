# EP06D: Study-Plan Persistence & Preview / Save / Read API

**Story ID:** EP06D
**Title:** Backend — the plan schema, the plan service and the preview / save / read API
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP06A, EP06B and EP06C implemented (the preferences, the remaining-work classification and the engine). EP03 + EP04 complete. **No dependency on EP07** (D06-6).
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

The epic's fifth proposed story — the plan preview, its editing and its confirmation — needs somewhere to live. This story creates it: the migration that turns the legacy, unused `StudyPlan`/`ScheduledTask` tables into the plan's persistence (one per-day `StudyPlan` row plus assignment-linked `PlannedSession` rows), the service that gathers the student's academic data, invokes the pure engine and persists the confirmed result through a Prisma transaction, and the three endpoints: a side-effect-free preview, an atomic save that re-checks every conflict, and a read of the saved week.

## Description & bounded scope

### In scope

1. **The migration** — one migration folder that reshapes the plan's persistence (D06-8):
   - rename `scheduled_tasks` → `planned_sessions` and `ScheduledTaskStatus` → `PlannedSessionStatus`;
   - drop `"taskId"` and its foreign key; add `"assignmentId"` (not null) with a foreign key to `assignments(id)` `ON DELETE CASCADE`, behind a **guard** that raises if any row exists;
   - drop the unique index `scheduled_tasks_studyPlanId_taskId_key`; add the indexes on `"studyPlanId"` and `"assignmentId"`;
   - `Task.scheduledTasks` is removed and `Assignment` gains `plannedSessions PlannedSession[]`;
   - the rollback is documented and reversible.
   **The physical names are the schema's camelCase names** — no scalar field carries an `@map`, so the columns are `"taskId"`, `"studyPlanId"`, `"assignmentId"`, `"startTime"`, `"endTime"`, `"durationMinutes"` (verified in the init migration, `apps/api/prisma/migrations/20261011000000_init/migration.sql:155-167`). There are **no** `"task_id"` / `"study_plan_id"` / `"assignment_id"` columns and **no** `scheduled_tasks_study_plan_id_task_id_key` index in this schema.
2. **The ownership convention's comment** — `apps/api/src/common/ownership/ownership.ts:26-29` names `ScheduledTask` and its parents; it must name `PlannedSession` and `studyPlan.userId` in the same change.
3. **The data gathering** — the service reads, all ownership-scoped: the profile (`timeZone`, `preferences.studyDefaults`), the candidate assignments (through EP06B's classification), the availability slots (available and blocked), the `ClassMeeting` windows of the active courses, and the confirmed `StudySession` intervals — converted into the profile zone's wall-clock intervals, one entry per local date.
4. **The window** — the seven civil dates from "today" in the profile zone (D06-3), computed by the service (the engine takes the dates as an input).
5. **`POST /study-plans/preview`** — runs the engine over the student's data and returns the proposal (`PlanPreview`). **It writes nothing**: no `StudyPlan` row, no `PlannedSession` row, no assignment field.
6. **`POST /study-plans`** — saves the edited proposal: the seven `StudyPlan` rows for the window are upserted, the window's existing `PlannedSession` rows are deleted and the submitted ones inserted, **in one Prisma transaction**. Every submitted session is re-validated (the malformed ones → 400 with a field-level `errors` map; a foreign assignment → the uniform 404; an overlap → 409 with a per-session `conflicts` array).
7. **`GET /study-plans`** — the saved plan for a range. The `from`/`to` query parameters are **optional**: with no parameters the server returns the student's most recent saved plan window (or the current rolling window when nothing is saved) and states the effective window in the response (D06-23); with `?from&to` it returns that range (the inclusive span ≤ 31 days, the `calendar` module's rule). The client never derives a date itself.
8. **The conflict re-check** — a pure function in `apps/api/src/domain/study-planning/conflicts.ts` (`findConflicts`) that the service applies to the submitted sessions against the classes, the blocked windows and the confirmed sessions, plus the overlap between the submitted sessions themselves. It calls **EP06C's `freeIntervals(...)` helper** from `apps/api/src/domain/study-planning/intervals.ts` with the availability windows omitted (D06-12), so the placement and the re-check share one implementation of the interval subtraction.
9. **Tests** — the migration's shape, the service's unit tests, the data-scoping spec and the e2e spec for the three endpoints.

### Out of scope

- The engine and the interval algebra — **EP06C**.
- The remaining-work calculation and the confirmed-time aggregation — **EP06B**.
- The preferences shape and endpoint — **EP06A**.
- Any frontend work — **EP06F**.
- Editing a **saved** session (moving or deleting one after the save) — out of EP06's scope per D06-5 (the epic requires editing *before* saving); recorded as **FU-EP06-01**.
- Free-form session creation — the epic does not require it (D06-5). The endpoint accepts the edited session list, so a crafted request could introduce a session; that is not reachable through the product, and the rule is a scope rule, not a security invariant (D06-12 in the parent README).
- The calendar read model — **not EP06's** (D06-18, seam V-05-1).
- Writing `Assignment.actualHours`, `Assignment.status` or any other assignment field (AC-E06-08).

## Source requirement references

- **Epic AC-E06-03** (the service supplies the availability windows), **AC-E06-04** (the conflict re-check on save), **AC-E06-05** (the service feeds the engine), **AC-E06-06** ("Students can review and edit proposed sessions before saving" — the backend half), **AC-E06-07** (the warnings in the preview payload), **AC-E06-08** ("The scheduler does not change assignment due dates" — the service writes only plan rows).
- **TR-E06-04** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-1, D06-2, D06-3, D06-5, D06-6, D06-8, D06-11, D06-12, D06-13, D06-17, D06-18, D06-20, D06-21, D06-23, D06-24; and the parent README's **Shared API and data contract** → *Data model*, *Endpoints*, *The window, the dates and the time representation*, *The save, the edits and the conflict re-check*, *Rules*.

## Acceptance criteria

1. After the migration the plan's persistence is `StudyPlan` (one row per day, `@@unique([userId, date])`) plus `PlannedSession` (an assignment link, a start, an end, a duration, a status); the legacy `"taskId"` column, its foreign key and the per-plan unique constraint are gone; `Task.scheduledTasks` is removed; the ownership convention's comment names the new model; the migration's rollback step is documented and reversible. The migration's SQL uses the **real physical names** (`"taskId"`, `"studyPlanId"`, `"assignmentId"`, the index `scheduled_tasks_studyPlanId_taskId_key`) — the schema has no `@map` on any scalar field.
2. `POST /study-plans/preview` returns the proposal for the seven days from today in the student's profile zone — the days, the proposed sessions, the warnings and the deferred list — and **writes nothing**: no `StudyPlan` row, no `PlannedSession` row and no assignment field changes after the call.
3. `POST /study-plans` saves the submitted sessions atomically: on success the seven `StudyPlan` rows for the **named** window exist with the day's planned hours, the window's previous sessions are gone and the submitted ones are present; on any failure the transaction rolls back and the stored week is unchanged. The body is `{ from, to, sessions: [{ assignmentId, date, startTime, endTime }] }` — exactly those fields; `durationMinutes` and `assignmentTitle` are rejected by the global `FieldValidationPipe` (the client projects the preview's sessions onto the four fields).
4. The save re-checks every submitted session against the current state: a date outside the named window, a date that is not `YYYY-MM-DD`, a time that is not `HH:mm`, a non-increasing time range or a missing assignment id → **400** with a field-level `errors` map and nothing written; an assignment that is not the student's → the **uniform 404** `Resource not found`; an overlap with a class, a blocked window, a confirmed session or another submitted session → **409** with a `conflicts` array naming each offending session (`sessionIndex`, `date`, `startTime`, `reason`) and nothing written. **There is no "a duration that does not match the range" case**: the body carries no duration, the server derives it from the range, so it cannot disagree.
5. A save replaces exactly the sessions inside the **named** window `[from, to]`; sessions outside that window are untouched and remain readable through `GET /study-plans?from&to` (D06-13). The named window must be one the server could itself have generated (`today − 6 ≤ from ≤ today`); an older window is **409** `{ error: 'WINDOW_ROLLED_OVER' }` with an actionable message and nothing written (D06-21).
6. The service never writes an assignment: after a preview and a save, every assignment row — `dueDate` included — is byte-for-byte what it was (AC-E06-08).
7. `GET /study-plans` returns the saved plan, with the days, the planned hours and the sessions (`id`, `assignmentId`, `assignmentTitle`, `startTime`, `endTime`, `durationMinutes`, `status`); the response's `from`/`to` state the effective window — the student's most recent saved plan window when the request carries no parameters, or the named range when it does (D06-23); an invalid or over-long range → 400; the projection never exposes `userId`.
8. Every read and write is ownership-scoped: a second student's plan is unreachable and indistinguishable from a missing one (the uniform 404); an unauthenticated request is rejected.
9. Unit, data-scoping and e2e specs cover the preview's side-effect freedom, the save's atomicity and replace semantics, the conflict re-check and the malformed-session matrix, the rollover rejection, the migration's shape, the ownership scoping and the assignment-unchanged assertion.

## Tests to add / update

- `apps/api/src/domain/study-planning/conflicts.spec.ts` (new) — the pure conflict function:
  - a session overlapping a class window, a blocked window and a confirmed session each produce a conflict with the right reason;
  - two submitted sessions overlapping each other produce a conflict;
  - touching intervals are not an overlap (half-open);
  - a clean set produces no conflicts.
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify) — the service against a mocked Prisma service:
  - the preview calls the engine with the seven dates, the student's windows, the classes, the confirmed sessions (converted to wall clock), the **civil** due dates (D06-24) and the preferences, and returns its output;
  - the preview performs no write (no `create`/`update`/`delete` on `studyPlan` or `plannedSession`);
  - the save wraps the upsert + delete + insert in one `$transaction` and rolls back on a failure;
  - the save replaces only the **named** window's sessions;
  - the save's conflict re-check rejects with 409 and writes nothing;
  - the malformed-session matrix produces 400 and writes nothing;
  - a body carrying `durationMinutes` or `assignmentTitle` is rejected with 400 (the global pipe's whitelist);
  - a stale window (`from` older than `today − 6`) is rejected with 409 `WINDOW_ROLLED_OVER` and writes nothing;
  - the write converts the wall-clock `date` + `HH:mm` into the profile zone's instants and derives `durationMinutes` from the range;
  - the save never calls an assignment write.
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify) — every query carries the `userId`; a second student's plan, assignment and session are invisible; a foreign assignment id in a save produces the uniform 404 (identical to a non-existent one); the projections never expose `userId`.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify) — HTTP level: 200 on the preview with the `PlanPreview` shape and no rows created; 201 on the save with the `SavedPlan` shape; 400 on a malformed session; 400 on a body carrying `durationMinutes`; 409 with a `conflicts` array on a conflicting save; 409 `WINDOW_ROLLED_OVER` on a stale window; 200 on the read with the saved week (with and without query parameters); 400 on an invalid range; 401 unauthenticated.
- A migration check (a documented manual step, recorded in the implementation record): apply the migration to a database that has the pre-EP06 schema and confirm that the guarded `"assignmentId"` step succeeds on the empty table, that `planned_sessions` and `PlannedSessionStatus` exist, that the two indexes are `planned_sessions_studyPlanId_idx` / `planned_sessions_assignmentId_idx`, and that the documented rollback restores the previous schema (`scheduled_tasks`, `ScheduledTaskStatus`, `"taskId" TEXT NOT NULL` with its FK and the unique index `scheduled_tasks_studyPlanId_taskId_key`).

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/api/prisma/schema.prisma:307-322` (`StudyPlan`) and `:324-339` (`ScheduledTask`), `:341-347` (`ScheduledTaskStatus`), `:237-257` (`Task` — the `scheduledTasks` relation to remove), `:187-210` (`Assignment` — the inverse relation to add), `:167-181` (`ClassMeeting`), `:292-305` (`AvailabilitySlot`), `:276-290` (`StudySession`).
- **Both tables are empty and unreferenced** — a repo-wide search of `apps/api/src` and `apps/web/src` finds `StudyPlan`/`ScheduledTask` only in the ownership convention's comment (`apps/api/src/common/ownership/ownership.ts:26-29`). The migration carries no data risk, and the guard below documents that fact rather than assuming it.
- `apps/api/src/modules/calendar/calendar.service.ts:105-132` — `wallToInstant` / `tzOffsetMs` (the zone arithmetic the service reuses for the confirmed sessions' wall-clock conversion **and for the save's wall-clock → instant conversion**); `:47-66` — `zoneDateParts` (the civil date + time of an instant — the due-date conversion and the read's wall-clock rendering); `:68-75` — `formatToday`, the "today" derivation in the profile zone, which the service reuses for the window's first date (called at `:188`).
- `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts` + `calendar.service.ts:156-179` — the range validation precedent (`from`/`to` as `YYYY-MM-DD`, the order rule and the 31-day cap).
- `apps/api/src/modules/availability/availability.service.ts:35-45` (the projection precedent), `:56-76` (the DTO re-validation and the field-level errors), `:193` (`ConflictException`), `:300` (`assertAffected`).
- `apps/api/src/app.module.ts:13-33` and `apps/api/src/test/test-http.ts:72-89` — the two module lists (EP06A already registered the module in both).
- `apps/api/prisma/migrations/` — 13 existing migrations; the last is `20261025000000_assignment_optional_type`. The migration script is `pnpm --filter api db:migrate` (`dotenv -e .env.local -- prisma migrate dev`). **The init migration** (`20261011000000_init/migration.sql`) is the authority for the physical names: `:155-167` creates `"scheduled_tasks" ("id", "studyPlanId", "taskId", "startTime", "endTime", "durationMinutes", "status", …)`, `:188` creates `CREATE UNIQUE INDEX "scheduled_tasks_studyPlanId_taskId_key" ON "scheduled_tasks"("studyPlanId", "taskId")`, `:224` and `:227` create the foreign keys `scheduled_tasks_studyPlanId_fkey` and `scheduled_tasks_taskId_fkey` (`ON DELETE RESTRICT`).

### Implementation notes (concrete)

1. **The migration shape** — `apps/api/prisma/migrations/<timestamp>_study_plan_planned_sessions/migration.sql`. **Illustrative, but every identifier is the schema's real physical name** (no `@map` on any scalar field → camelCase columns; verified in `apps/api/prisma/migrations/20261011000000_init/migration.sql:155-167`, `:188`, `:224`, `:227`). The authoritative SQL is derived with `prisma migrate diff` (the repo's convention) and must match these names:
   ```sql
   ALTER TABLE "scheduled_tasks" RENAME TO "planned_sessions";
   ALTER TYPE "ScheduledTaskStatus" RENAME TO "PlannedSessionStatus";
   ALTER TABLE "planned_sessions" DROP COLUMN "taskId";
   ALTER TABLE "planned_sessions" ADD COLUMN "assignmentId" TEXT;
   DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM "planned_sessions") THEN
       RAISE EXCEPTION 'planned_sessions must be empty before the EP06 migration';
     END IF;
   END $$;
   ALTER TABLE "planned_sessions" ALTER COLUMN "assignmentId" SET NOT NULL;
   ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_assignmentId_fkey"
     FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   DROP INDEX "scheduled_tasks_studyPlanId_taskId_key";
   CREATE INDEX "planned_sessions_studyPlanId_idx" ON "planned_sessions"("studyPlanId");
   CREATE INDEX "planned_sessions_assignmentId_idx" ON "planned_sessions"("assignmentId");
   ```
   Notes the implementer needs: a table rename does **not** rename the indexes or the constraints, so the unique index is still `scheduled_tasks_studyPlanId_taskId_key` and the FKs are still `scheduled_tasks_studyPlanId_fkey` / `scheduled_tasks_taskId_fkey` when the columns are dropped; dropping `"taskId"` drops its FK (`ON DELETE RESTRICT`) and its `NOT NULL` with it; the two `CREATE INDEX` names are the ones Prisma's `@@index([studyPlanId])` / `@@index([assignmentId])` produce.

   The `DO $$` guard is deliberate: the table is empty today, and a silent delete would destroy data if that were ever untrue. **The rollback** (documented in the implementation record) drops the EP06-created `planned_sessions` rows, renames `planned_sessions` back to `scheduled_tasks` and `PlannedSessionStatus` back to `ScheduledTaskStatus`, restores the original `"taskId" TEXT NOT NULL` column with its `scheduled_tasks_taskId_fkey` foreign key to `tasks(id)` (`ON DELETE RESTRICT`) and the original unique index `scheduled_tasks_studyPlanId_taskId_key`, and drops the two indexes EP06 created. The original table was empty, so the rollback loses nothing that existed before EP06.
2. **The service's data gathering.** One scoped read per source:
   - `prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true, preferences: true } })` → the zone and the preferences (through EP06A's defensive reader);
   - `prisma.assignment.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }, include: { course: { select: { code: true } } } })` → the candidates (EP06B's classification then filters and flags them);
   - `prisma.availabilitySlot.findMany({ where: { userId } })` → the available and the blocked windows;
   - `prisma.course.findMany({ where: { userId, isActive: true }, include: { meetings: true } })` → the class windows (EP04's D404-7: an archived course's meetings leave the calendar);
   - `prisma.studySession.findMany({ where: { userId } })` → the confirmed sessions, converted into wall-clock intervals per local date.

   **The due date's conversion (D06-24).** `Assignment.dueDate` is stored as an **instant**; the service converts each one **once**, to the civil date in the student's profile `timeZone`, with the calendar's `zoneDateParts` arithmetic (`apps/api/src/modules/calendar/calendar.service.ts:47-66`) — an assignment due `2026-11-01T00:30:00Z` is **31 October** for a student in `America/New_York`. The engine receives that civil `YYYY-MM-DD` string, and the same converted value is what the remaining-work read and the preview's warnings report, so the plan, the list and the calendar the student sees never disagree by a day. No boundary in EP06 compares an instant to a civil date.
3. **The window.** "Today" is the profile zone's civil date (`formatToday(timeZone)` — `apps/api/src/modules/calendar/calendar.service.ts:68-75`, called at `:188` — or the same `Intl.DateTimeFormat('en-CA')` construction the calendar service uses); the seven dates are that date and the next six, each formatted as `YYYY-MM-DD`. The **read**'s default window is the student's most recent saved plan window — `[max(StudyPlan.date) − 6 days, max(StudyPlan.date)]` over the student's own rows — or the current rolling window when there are no rows (D06-23).
4. **The confirmed sessions' wall-clock conversion.** Each session's `startTime`/`endTime` are rendered in the profile zone with the calendar service's `zoneDateParts` helper (or an equivalent local helper in the study-plans service — the calendar's helpers are private to that file). A session that crosses midnight in the profile zone is attributed to the local day it starts in; that boundary is recorded, not hidden.
5. **The preview.** `preview(userId)` → gather → `scheduler(input)` → map the output into the `PlanPreview` payload (the days, the sessions, the warnings, the deferred list). **No write call of any kind.**
6. **The save.**
   ```ts
   await this.prisma.$transaction(async (tx) => {
     for (const date of days) {
       await tx.studyPlan.upsert({ where: { userId_date: { userId, date } }, create: { userId, date, targetHours }, update: { targetHours } });
     }
     await tx.plannedSession.deleteMany({ where: { studyPlan: { userId }, date: { gte: from, lte: to } } });
     await tx.plannedSession.createMany({ data: sessions.map(...) });
   });
   ```
   `targetHours` is the day's planned minutes ÷ 60 (D06-13). The `deleteMany` is scoped through `studyPlan.userId`, so it can only touch the student's own rows.

   **The body's three conversions (D06-21).**
   - **The window.** `from`/`to` are the window the preview returned; the server validates `to = from + 6 days` and `today − 6 ≤ from ≤ today` (a window the server could itself have generated). A `from` outside that range → **409** `{ error: 'WINDOW_ROLLED_OVER', message: 'The plan week has rolled over — generate a new proposal to save it.' }` and nothing is written. A rollover **between the preview and the save is therefore not an error** — the student saves the week they reviewed, manual edits included.
   - **The times.** `date` + `startTime`/`endTime` (`HH:mm`) in the profile zone → the persisted instants, with the calendar's `wallToInstant` arithmetic (`apps/api/src/modules/calendar/calendar.service.ts:105-132`). The read converts the stored instants back to `HH:mm` with `zoneDateParts` (`:47-66`).
   - **The duration.** `durationMinutes` is **derived** from the range (`endTime − startTime`, same day) and is never read from the body — the DTO has no duration field, so "the duration does not match the range" cannot happen.
7. **The conflict re-check.** Before the transaction, the service loads the classes, the blocked windows and the confirmed sessions for the affected dates and calls the pure `findConflicts(submitted, context)`; the conflict function computes the day's **hard-conflict-free** intervals by calling **EP06C's `freeIntervals({ date, blocked, classes, busy })`** (the availability windows omitted — D06-12 says a manual edit is not bounded by the student's declared availability) and checks each submitted session against them plus the other submitted sessions. A non-empty result → `ConflictException` with the `conflicts` array (409) and **nothing is written**. The malformed-session matrix is checked first (400), then the ownership of each assignment (404 uniform), then the conflicts (409).
8. **The projections.** `toPlanPreview`, `toSavedPlan` and `toPlannedSessionResponse` (the session's `id`, `assignmentId`, `assignmentTitle`, `startTime`, `endTime`, `durationMinutes`, `status`) — none of them exposes `userId`.

### Risks / open questions (none blocking)

- **The `ScheduledTask` → `PlannedSession` rename touches EP07's prose.** EP07's README (D07-1) refers to "EP06's `StudyPlan`/`ScheduledTask`". No EP07 code depends on the name; the EP07 owner may update that sentence. Recorded as a finding for the coordinator — this plan does not edit another epic's files.
- **The wall-clock conversion of the confirmed sessions** is duplicated logic from the calendar service (whose helpers are private). The implementer may extract a shared helper, but changing the calendar service is EP04's file and is not required — the duplication is acceptable for one call site and is recorded rather than pre-emptively refactored.
- **The saved-plan edit gap.** A student cannot move or delete a session *after* the save; they regenerate the week, which recomputes the proposal from the current remaining work and therefore loses their manual edits (FU-EP06-01, and D06-19's recorded consequence). The epic requires editing *before* saving, so this is in scope as specified — but it is a real limitation and the coordinator should know it before release.
- **The midnight rollover.** The save's window is recomputed from "today" at save time. The save therefore **names the window it applies to** (D06-21) and accepts any rolling window the server could itself have generated (`today − 6 ≤ from ≤ today`), so the common rollover — a preview at 23:59 and a save at 00:05 — saves the week the student reviewed, edits included. Only a proposal older than seven days is rejected (409 `WINDOW_ROLLED_OVER`, an actionable message, nothing written). The alternative — deriving the window from the submitted sessions — was rejected: it would not clear the sessions the student *deleted* from a day on which no session remains.
- **The `date` column is a `@db.Date`.** The service must pass a date-only value (a UTC midnight `Date` for that civil date), consistent with how the column is stored; the exact conversion is the implementer's, and the e2e spec must assert the saved date equals the requested civil date.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is rejected — the malformed-session matrix and the invalid range produce 400 with a field-level `errors` map, and an unknown body field is rejected by the global `FieldValidationPipe`.
3. Academic data is scoped to the authenticated student — every query carries the `userId`, `PlannedSession` is scoped through `studyPlan.userId`, and a missing and a foreign record return the identical uniform 404.
4. API errors are actionable — 400 names the field, 409 names the conflicting session and the reason, 404 is the uniform `Resource not found`.
5. Not applicable — no frontend async states in this story (the preview and save states are EP06F's).
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests — the conflict function's unit tests, the service's unit tests (the preview's side-effect freedom, the save's atomicity and replace semantics), the data-scoping spec and the e2e spec, plus the recorded migration check.
9. API changes and migrations are documented — the migration, its guard, its rollback and the three endpoint contracts are recorded in the parent README's shared API/data contract section and in this story's implementation record.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** the plan's persistence exists and works end to end on the backend — a preview that proposes without writing, an atomic save that re-checks every conflict, and a read of the saved week — with the schema reshaped for assignment-level, multi-session planning.

- **Request/token estimate:** 2–3 requests/tokens — one migration (rename, reshape, guard, indexes, rollback), the schema and the ownership-comment changes, the conflict function, the data-gathering service, three endpoints, and the additions to three spec files. The upper end of the band is warranted because the transaction, the replace semantics and the conflict re-check interact, and a mistake there can persist a wrong week.
- **Model recommendation:** 4 — a schema migration with a guard and a rollback, a transactional replace, and a conflict re-check whose failure modes (a partial write, a missed overlap, a silently dropped session) are quiet rather than loud. A frontier model is recommended for the migration + transaction + conflict design; the endpoint wiring is ordinary.
- **Files:**
  - `apps/api/prisma/schema.prisma` (modify — `StudyPlan`, the new `PlannedSession`, `PlannedSessionStatus`, `Assignment.plannedSessions`, `Task.scheduledTasks` removed);
  - `apps/api/prisma/migrations/<timestamp>_study_plan_planned_sessions/migration.sql` (new);
  - `apps/api/src/common/ownership/ownership.ts` (modify — the scope comment);
  - `apps/api/src/domain/study-planning/conflicts.ts` (new);
  - `apps/api/src/domain/study-planning/conflicts.spec.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.service.ts` (modify — the gathering, the preview, the save, the read);
  - `apps/api/src/modules/study-plans/study-plans.controller.ts` (modify — the three routes);
  - `apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts` (new — `from`, `to` and the session list; exactly four fields per session);
  - `apps/api/src/modules/study-plans/dto/list-study-plans-query.dto.ts` (new — the **optional** `from`/`to`);
  - `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify).
- **Start context:** this story file; the parent README's shared API/data contract → *Data model*, *Endpoints*, *The window, the dates and the time representation*, *The save, the edits and the conflict re-check*, *Rules*, and the decision register (D06-1, D06-2, D06-3, D06-5, D06-8, D06-11, D06-12, D06-13, D06-17, D06-18, D06-20, D06-21, D06-23, D06-24); EP06A's, EP06B's and EP06C's story files (the module, the classification, the shared comparator and the engine this service calls); `apps/api/prisma/schema.prisma:167-181`, `:187-210`, `:276-290`, `:292-305`, `:307-347`; `apps/api/prisma/migrations/20261011000000_init/migration.sql:155-167`, `:188`, `:224`, `:227`; `apps/api/src/modules/calendar/calendar.service.ts:47-66`, `:68-75`, `:105-132`; `apps/api/src/modules/availability/availability.service.ts`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api db:generate` (the generated client must compile with the new model); `pnpm --filter api test -- study-plans` (the unit, data-scoping and e2e specs); `pnpm --filter api test -- conflicts`; `pnpm --filter api test` (the full API suite — the calendar and assignments specs must stay green); `pnpm --filter api typecheck`; `pnpm --filter api lint`; the migration check against a pre-EP06 database (recorded in the implementation record). The migration is also applied by the EP09 self-contained E2E harness in EP06H.
- **Dependencies / exclusions:** EP06A + EP06B + EP06C implemented; EP03 + EP04 complete. Excludes the engine (EP06C), the remaining-work calculation (EP06B), all frontend work (EP06F), editing a saved session (FU-EP06-01), free-form session creation, the calendar read model (D06-18), and any write to an assignment field.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The preview's **presentation** and the move/resize/delete interaction model are EP06F's and need their own `ui-refiner` pass; the payload shapes settled here are the stable part of that pass's input.
