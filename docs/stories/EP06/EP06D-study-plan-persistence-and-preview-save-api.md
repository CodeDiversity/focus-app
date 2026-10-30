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
   - drop `task_id` and its foreign key; add `assignment_id` (not null) with a foreign key to `assignments(id)` `ON DELETE CASCADE`, behind a **guard** that raises if any row exists;
   - drop the unique index on `(study_plan_id, task_id)`; add the indexes on `study_plan_id` and `assignment_id`;
   - `Task.scheduledTasks` is removed and `Assignment` gains `plannedSessions PlannedSession[]`;
   - the rollback is documented and reversible.
2. **The ownership convention's comment** — `apps/api/src/common/ownership/ownership.ts:26-29` names `ScheduledTask` and its parents; it must name `PlannedSession` and `studyPlan.userId` in the same change.
3. **The data gathering** — the service reads, all ownership-scoped: the profile (`timeZone`, `preferences.studyDefaults`), the candidate assignments (through EP06B's classification), the availability slots (available and blocked), the `ClassMeeting` windows of the active courses, and the confirmed `StudySession` intervals — converted into the profile zone's wall-clock intervals, one entry per local date.
4. **The window** — the seven civil dates from "today" in the profile zone (D06-03), computed by the service (the engine takes the dates as an input).
5. **`POST /study-plans/preview`** — runs the engine over the student's data and returns the proposal (`PlanPreview`). **It writes nothing**: no `StudyPlan` row, no `PlannedSession` row, no assignment field.
6. **`POST /study-plans`** — saves the edited proposal: the seven `StudyPlan` rows for the window are upserted, the window's existing `PlannedSession` rows are deleted and the submitted ones inserted, **in one Prisma transaction**. Every submitted session is re-validated (the malformed ones → 400 with a field-level `errors` map; a foreign assignment → the uniform 404; an overlap → 409 with a per-session `conflicts` array).
7. **`GET /study-plans?from&to`** — the saved plan for a range (the inclusive span ≤ 31 days, the `calendar` module's rule).
8. **The conflict re-check** — a pure function in `apps/api/src/domain/study-planning/conflicts.ts` (`findConflicts`) that the service applies to the submitted sessions against the classes, the blocked windows and the confirmed sessions, plus the overlap between the submitted sessions themselves. It reuses the interval algebra from EP06C.
9. **Tests** — the migration's shape, the service's unit tests, the data-scoping spec and the e2e spec for the three endpoints.

### Out of scope

- The engine and the interval algebra — **EP06C**.
- The remaining-work calculation and the confirmed-time aggregation — **EP06B**.
- The preferences shape and endpoint — **EP06A**.
- Any frontend work — **EP06F**.
- Editing a **saved** session (moving or deleting one after the save) — out of EP06's scope per D06-05 (the epic requires editing *before* saving); recorded as **FU-EP06-01**.
- Free-form session creation — the epic does not require it (D06-05). The endpoint accepts the edited session list, so a crafted request could introduce a session; that is not reachable through the product, and the rule is a scope rule, not a security invariant (D06-11/D06-12 in the parent README).
- The calendar read model — **not EP06's** (D06-18, seam V-05-1).
- Writing `Assignment.actualHours`, `Assignment.status` or any other assignment field (AC-E06-08).

## Source requirement references

- **Epic AC-E06-03** (the service supplies the availability windows), **AC-E06-04** (the conflict re-check on save), **AC-E06-05** (the service feeds the engine), **AC-E06-06** ("Students can review and edit proposed sessions before saving" — the backend half), **AC-E06-07** (the warnings in the preview payload), **AC-E06-08** ("The scheduler does not change assignment due dates" — the service writes only plan rows).
- **TR-E06-04** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-1, D06-2, D06-3, D06-5, D06-6, D06-8, D06-11, D06-12, D06-13, D06-17, D06-18; and the parent README's **Shared API and data contract** → *Data model*, *Endpoints*, *The save, the edits and the conflict re-check*, *Rules*.

## Acceptance criteria

1. After the migration the plan's persistence is `StudyPlan` (one row per day, `@@unique([userId, date])`) plus `PlannedSession` (an assignment link, a start, an end, a duration, a status); the legacy `task_id` column, its foreign key and the per-plan unique constraint are gone; `Task.scheduledTasks` is removed; the ownership convention's comment names the new model; the migration's rollback step is documented and reversible.
2. `POST /study-plans/preview` returns the proposal for the seven days from today in the student's profile zone — the days, the proposed sessions, the warnings and the deferred list — and **writes nothing**: no `StudyPlan` row, no `PlannedSession` row and no assignment field changes after the call.
3. `POST /study-plans` saves the submitted sessions atomically: on success the seven `StudyPlan` rows for the window exist with the day's planned hours, the window's previous sessions are gone and the submitted ones are present; on any failure the transaction rolls back and the stored week is unchanged.
4. The save re-checks every submitted session against the current state: a date outside the window, a non-increasing time range, a duration that does not match the range or a missing assignment id → **400** with a field-level `errors` map and nothing written; an assignment that is not the student's → the **uniform 404** `Resource not found`; an overlap with a class, a blocked window, a confirmed session or another submitted session → **409** with a `conflicts` array naming each offending session (`sessionIndex`, `date`, `startTime`, `reason`) and nothing written.
5. A save replaces exactly the sessions inside the window; sessions outside the window are untouched and remain readable through `GET /study-plans?from&to` (D06-13).
6. The service never writes an assignment: after a preview and a save, every assignment row — `dueDate` included — is byte-for-byte what it was (AC-E06-08).
7. `GET /study-plans?from&to` returns the saved plan for the range, with the days, the planned hours and the sessions (`id`, `assignmentId`, `assignmentTitle`, `startTime`, `endTime`, `durationMinutes`, `status`); an invalid or over-long range → 400; the projection never exposes `userId`.
8. Every read and write is ownership-scoped: a second student's plan is unreachable and indistinguishable from a missing one (the uniform 404); an unauthenticated request is rejected.
9. Unit, data-scoping and e2e specs cover the preview's side-effect freedom, the save's atomicity and replace semantics, the conflict re-check and the malformed-session matrix, the migration's shape, the ownership scoping and the assignment-unchanged assertion.

## Tests to add / update

- `apps/api/src/domain/study-planning/conflicts.spec.ts` (new) — the pure conflict function:
  - a session overlapping a class window, a blocked window and a confirmed session each produce a conflict with the right reason;
  - two submitted sessions overlapping each other produce a conflict;
  - touching intervals are not an overlap (half-open);
  - a clean set produces no conflicts.
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify) — the service against a mocked Prisma service:
  - the preview calls the engine with the seven dates, the student's windows, the classes, the confirmed sessions (converted to wall clock) and the preferences, and returns its output;
  - the preview performs no write (no `create`/`update`/`delete` on `studyPlan` or `plannedSession`);
  - the save wraps the upsert + delete + insert in one `$transaction` and rolls back on a failure;
  - the save replaces only the window's sessions;
  - the save's conflict re-check rejects with 409 and writes nothing;
  - the malformed-session matrix produces 400 and writes nothing;
  - the save never calls an assignment write.
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify) — every query carries the `userId`; a second student's plan, assignment and session are invisible; a foreign assignment id in a save produces the uniform 404 (identical to a non-existent one); the projections never expose `userId`.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify) — HTTP level: 200 on the preview with the `PlanPreview` shape and no rows created; 201 on the save with the `SavedPlan` shape; 400 on a malformed session; 409 with a `conflicts` array on a conflicting save; 200 on the read with the saved week; 400 on an invalid range; 401 unauthenticated.
- A migration check (a documented manual step, recorded in the implementation record): apply the migration to a database that has the pre-EP06 schema and confirm that the guarded `assignment_id` step succeeds on the empty table, that `planned_sessions` and `PlannedSessionStatus` exist, and that the documented rollback restores the previous schema.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/api/prisma/schema.prisma:307-322` (`StudyPlan`) and `:324-339` (`ScheduledTask`), `:341-347` (`ScheduledTaskStatus`), `:237-257` (`Task` — the `scheduledTasks` relation to remove), `:187-210` (`Assignment` — the inverse relation to add), `:167-181` (`ClassMeeting`), `:292-305` (`AvailabilitySlot`), `:276-290` (`StudySession`).
- **Both tables are empty and unreferenced** — a repo-wide search of `apps/api/src` and `apps/web/src` finds `StudyPlan`/`ScheduledTask` only in the ownership convention's comment (`apps/api/src/common/ownership/ownership.ts:26-29`). The migration carries no data risk, and the guard below documents that fact rather than assuming it.
- `apps/api/src/modules/calendar/calendar.service.ts:105-132` — `wallToInstant` / `tzOffsetMs` (the zone arithmetic the service reuses for the confirmed sessions' wall-clock conversion); `:47-66` — `zoneDateParts`; `:156-186` — the "today" derivation in the profile zone (`formatToday`), which the service reuses for the window's first date.
- `apps/api/src/modules/calendar/dto/list-calendar-events-query.dto.ts` + `calendar.service.ts:156-179` — the range validation precedent (`from`/`to` as `YYYY-MM-DD`, the order rule and the 31-day cap).
- `apps/api/src/modules/availability/availability.service.ts:35-45` (the projection precedent), `:56-76` (the DTO re-validation and the field-level errors), `:193` (`ConflictException`), `:300` (`assertAffected`).
- `apps/api/src/app.module.ts:13-33` and `apps/api/src/test/test-http.ts:72-89` — the two module lists (EP06A already registered the module in both).
- `apps/api/prisma/migrations/` — 13 existing migrations; the last is `20261025000000_assignment_optional_type`. The migration script is `pnpm --filter api db:migrate` (`dotenv -e .env.local -- prisma migrate dev`).

### Implementation notes (concrete)

1. **The migration shape** — `apps/api/prisma/migrations/<timestamp>_study_plan_planned_sessions/migration.sql`:
   ```sql
   ALTER TABLE "scheduled_tasks" RENAME TO "planned_sessions";
   ALTER TYPE "ScheduledTaskStatus" RENAME TO "PlannedSessionStatus";
   ALTER TABLE "planned_sessions" DROP COLUMN "task_id";
   ALTER TABLE "planned_sessions" ADD COLUMN "assignment_id" TEXT;
   DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM "planned_sessions") THEN
       RAISE EXCEPTION 'planned_sessions must be empty before the EP06 migration';
     END IF;
   END $$;
   ALTER TABLE "planned_sessions" ALTER COLUMN "assignment_id" SET NOT NULL;
   ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_assignment_id_fkey"
     FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   DROP INDEX "scheduled_tasks_study_plan_id_task_id_key";
   CREATE INDEX "planned_sessions_study_plan_id_idx" ON "planned_sessions"("study_plan_id");
   CREATE INDEX "planned_sessions_assignment_id_idx" ON "planned_sessions"("assignment_id");
   ```
   The `DO $$` guard is deliberate: the table is empty today, and a silent delete would destroy data if that were ever untrue. The rollback drops the EP06-created rows and restores `scheduled_tasks`, `ScheduledTaskStatus`, `task_id NOT NULL` and the original unique index.
2. **The service's data gathering.** One scoped read per source:
   - `prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true, preferences: true } })` → the zone and the preferences (through EP06A's defensive reader);
   - `prisma.assignment.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } }, include: { course: { select: { code: true } } } })` → the candidates (EP06B's classification then filters and flags them);
   - `prisma.availabilitySlot.findMany({ where: { userId } })` → the available and the blocked windows;
   - `prisma.course.findMany({ where: { userId, isActive: true }, include: { meetings: true } })` → the class windows (EP04's D404-7: an archived course's meetings leave the calendar);
   - `prisma.studySession.findMany({ where: { userId } })` → the confirmed sessions, converted into wall-clock intervals per local date.
3. **The window.** "Today" is the profile zone's civil date (`formatToday(timeZone)`-style, or the same `Intl.DateTimeFormat('en-CA')` construction the calendar service uses); the seven dates are that date and the next six, each formatted as `YYYY-MM-DD`.
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
7. **The conflict re-check.** Before the transaction, the service loads the classes, the blocked windows and the confirmed sessions for the affected dates and calls the pure `findConflicts(submitted, context)`; a non-empty result → `ConflictException` with the `conflicts` array (409) and **nothing is written**. The malformed-session matrix is checked first (400), then the ownership of each assignment (404 uniform), then the conflicts (409).
8. **The projections.** `toPlanPreview`, `toSavedPlan` and `toPlannedSessionResponse` (the session's `id`, `assignmentId`, `assignmentTitle`, `startTime`, `endTime`, `durationMinutes`, `status`) — none of them exposes `userId`.

### Risks / open questions (none blocking)

- **The `ScheduledTask` → `PlannedSession` rename touches EP07's prose.** EP07's README (D07-1) refers to "EP06's `StudyPlan`/`ScheduledTask`". No EP07 code depends on the name; the EP07 owner may update that sentence. Recorded as a finding for the coordinator — this plan does not edit another epic's files.
- **The wall-clock conversion of the confirmed sessions** is duplicated logic from the calendar service (whose helpers are private). The implementer may extract a shared helper, but changing the calendar service is EP04's file and is not required — the duplication is acceptable for one call site and is recorded rather than pre-emptively refactored.
- **The saved-plan edit gap.** A student cannot move or delete a session *after* the save; they regenerate the week, which recomputes the proposal from the current remaining work and therefore loses their manual edits (FU-EP06-01, and D06-19's recorded consequence). The epic requires editing *before* saving, so this is in scope as specified — but it is a real limitation and the coordinator should know it before release.
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
  - `apps/api/src/modules/study-plans/dto/save-study-plan.dto.ts` (new);
  - `apps/api/src/modules/study-plans/dto/list-study-plans-query.dto.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify).
- **Start context:** this story file; the parent README's shared API/data contract → *Data model*, *Endpoints*, *The save, the edits and the conflict re-check*, *Rules*, and the decision register (D06-1, D06-2, D06-3, D06-5, D06-8, D06-11, D06-12, D06-13, D06-17, D06-18); EP06A's, EP06B's and EP06C's story files (the module, the classification and the engine this service calls); `apps/api/prisma/schema.prisma:167-181`, `:187-210`, `:276-290`, `:292-305`, `:307-347`; `apps/api/src/modules/calendar/calendar.service.ts:47-66`, `:105-132`, `:156-186`; `apps/api/src/modules/availability/availability.service.ts`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api db:generate` (the generated client must compile with the new model); `pnpm --filter api test -- study-plans` (the unit, data-scoping and e2e specs); `pnpm --filter api test -- conflicts`; `pnpm --filter api test` (the full API suite — the calendar and assignments specs must stay green); `pnpm --filter api typecheck`; `pnpm --filter api lint`; the migration check against a pre-EP06 database (recorded in the implementation record). The migration is also applied by the EP09 self-contained E2E harness in EP06H.
- **Dependencies / exclusions:** EP06A + EP06B + EP06C implemented; EP03 + EP04 complete. Excludes the engine (EP06C), the remaining-work calculation (EP06B), all frontend work (EP06F), editing a saved session (FU-EP06-01), free-form session creation, the calendar read model (D06-18), and any write to an assignment field.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The preview's **presentation** and the move/resize/delete interaction model are EP06F's and need their own `ui-refiner` pass; the payload shapes settled here are the stable part of that pass's input.
