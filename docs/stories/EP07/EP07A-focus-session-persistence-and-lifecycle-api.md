# EP07A: Focus-Session Persistence & Lifecycle API

**Story ID:** EP07A
**Title:** Backend — extend `StudySession` in place and expose the start / pause / resume / current-session lifecycle
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Queued
**Dependencies:** EP03 complete (assignments and tasks exist). Decisions D07-1…D07-8 recorded in the parent README. **No dependency on EP06** — the EP06 seam is provisional (V-07-1, V-07-2).
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

`StudySession` becomes the actual-time log: the migration makes `endTime` nullable and adds a lifecycle status, an assignment link, an optional task link, an elapsed-seconds accumulator and a planned duration (D07-1). A new `study-sessions` module exposes the lifecycle — start a session, pause it, resume it and read back the student's open session — with elapsed time derived from **server timestamps** and every query scoped to the authenticated student.

## Description & bounded scope

### In scope

1. **The migration** — extend `StudySession` in place (no new table): `endTime` nullable; `status` (`ACTIVE`/`PAUSED`/`COMPLETED`, default `ACTIVE`); `assignmentId` (nullable FK → `Assignment`, `onDelete: SetNull`); `taskId` (nullable FK → `Task`, `onDelete: SetNull`); `elapsedSeconds Int @default(0)`; `plannedMinutes Int?`; a persisted segment-start timestamp (`resumedAt DateTime?`) so a reload cannot lose the running segment; indexes on `(userId, status)` and `(userId, startTime)`. Backfill existing rows to `COMPLETED` with `elapsedSeconds = durationMinutes * 60`; document the rollback.
2. **The new module** `apps/api/src/modules/study-sessions/` — controller, service, module, `StartStudySessionDto`, registered in `apps/api/src/app.module.ts`. Follows the `availability` module precedent (projection function, DTO re-validation for non-HTTP callers, `ConflictException` for state conflicts, `assertAffected` for scoped writes).
3. **`POST /study-sessions`** — start a session. Body `{ assignmentId?, taskId?, plannedMinutes? }`. An assignment or task that is not owned → the uniform 404. A task that belongs to a different assignment than the one given → 400 field error. Starting while an open session exists → 409 (provisional, D07-6).
4. **`POST /study-sessions/:id/pause`** and **`POST /study-sessions/:id/resume`** — lifecycle transitions, race-safe (status-guarded `updateMany` + `assertAffected`).
5. **`GET /study-sessions/current`** — the student's open session (`ACTIVE` or `PAUSED`), or `null` when there is none. This is the reload-recovery read (AC-E07-06): a read never changes state.
6. **Ownership scoping** on every query, following `apps/api/src/common/ownership/ownership.ts` (uniform 404, never 403).
7. **The calendar compatibility change** (D07-08) — `apps/api/src/modules/calendar/calendar.service.ts` must handle sessions whose `endTime` is null: the current filter `endTime: { gt: rangeStart }` excludes NULL rows, so an in-progress session silently disappears from the calendar, and the event mapping calls `zoneDateParts(s.endTime, …)` on a now-nullable field.
8. **Tests** — unit, data-scoping and e2e specs for the new module; the calendar regression is verified in EP07F (TR-E07-07), but EP07A's own change must not break the existing calendar specs.

### Out of scope

- Finishing a session, the confirmed-time log and the read APIs — **EP07B**.
- Any frontend work — **EP07C/D/E**.
- The cross-layer E2E suite and the parent index — **EP07F**.
- Writing `Assignment.actualHours`, `Task.actualMinutes` or `Assignment.status` (D07-2; AC-E07-07 is enforced by EP07B's finish endpoint).
- The EP06 planning tables (`StudyPlan` / `ScheduledTask`), the scheduling engine, and EP06's remaining-work calculation.
- The dashboard's "Start Focus Session" quick action (D07-9 — EP05's surface).
- The `notes` and `rating` columns (they exist; no EP07 endpoint writes them yet).

## Source requirement references

- **Epic AC-E07-01** (backend half: the session is created with its assignment link), **AC-E07-02** (backend half: start / pause / resume), **AC-E07-05** (backend half: the assignment link is ownership-checked at create), **AC-E07-06** (backend half: recovery is a read; nothing auto-completes).
- **TR-E07-01** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP07 parent review.
- **Decisions:** D07-1, D07-2, D07-6, D07-7, D07-8 (parent README decision register) and the shared API/data contract section.

## Acceptance criteria

1. After the migration, `StudySession.endTime` is nullable and the model carries `status`, `assignmentId`, `taskId`, `elapsedSeconds`, `plannedMinutes` and a persisted segment-start timestamp; every pre-migration row is `COMPLETED` with `elapsedSeconds = durationMinutes * 60` and its `startTime`/`endTime`/`durationMinutes` unchanged; the migration's rollback step is documented and reversible.
2. `POST /study-sessions` creates a session owned by the authenticated student with `status: ACTIVE`, `startTime` = now, `endTime: null`, `elapsedSeconds: 0`, `durationMinutes: 0`; it accepts an optional `assignmentId`, an optional `taskId` and an optional `plannedMinutes` (`5 ≤ n ≤ 480`); an assignment or task that is not the student's returns the same uniform 404 `Resource not found` as a non-existent one; a task that belongs to another assignment returns a 400 field error; unknown body fields are rejected with 400.
3. `POST /study-sessions/:id/pause` sets `status: PAUSED` and adds the server-measured running segment to `elapsedSeconds`; `POST /study-sessions/:id/resume` sets `status: ACTIVE` and starts a new segment. Elapsed seconds are always computed by the server from stored timestamps — a request body can never set them.
4. Pausing an already-paused session, resuming a completed session and pausing a completed session each return 409 with an actionable message; a missing or foreign session id returns the uniform 404; two concurrent pause requests against the same ACTIVE session result in exactly one successful transition and one 409, with the elapsed segment counted once.
5. `GET /study-sessions/current` returns the student's open session (`ACTIVE` or `PAUSED`) with its `elapsedSeconds`, or `null` when there is none; it never changes the session's state, so reloading the app can never mark a session complete.
6. An in-progress session (null `endTime`) is handled explicitly by the calendar service: it appears in the calendar range that contains its start, and the existing calendar unit, data-scoping and e2e specs still pass.
7. Unit, data-scoping and e2e specs cover the lifecycle, the timestamp-derived elapsed time, the ownership uniformity (missing and foreign are indistinguishable), the invalid-transition 409s and the lost-race double pause.

## Tests to add / update

- `apps/api/src/modules/study-sessions/study-sessions.service.spec.ts` (new) — unit coverage against a mocked Prisma service:
  - start sets `status ACTIVE`, `startTime` = now, `endTime` null, `elapsedSeconds` 0, `durationMinutes` 0, and stores the assignment/task link;
  - start with an out-of-range `plannedMinutes` → 400; start with an unknown body field → 400 (DTO re-validation, `availability.service.ts` precedent);
  - pause adds `floor((now - segmentStart)/1000)` to `elapsedSeconds` and clears the segment start; resume sets a new segment start;
  - pause on a PAUSED / COMPLETED session → 409; resume on a COMPLETED session → 409;
  - the status-guarded update affects 0 rows → 409 (lost race), never a double-counted segment;
  - `GET current` returns the open session or `null`.
- `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (new) — every query carries the authenticated `userId`; a missing record and another student's record produce the identical uniform 404 `Resource not found` (never 403, never a distinct message); `GET /study-sessions/current` never returns another student's session; the projection never exposes `userId`.
- `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (new) — HTTP-level: 201 on start with the projection shape; 400 with a field-level `errors` map on invalid input; 404 uniform on a foreign assignment id; 409 on a second open session; 200 on pause/resume with the updated `elapsedSeconds`; 200 with `null` from `current` when nothing is open; 401 unauthenticated.
- `apps/api/src/modules/calendar/calendar.service.spec.ts` (update) — a session with a null `endTime` inside the queried range is emitted as a `STUDY_SESSION` event; an out-of-range open session is not; the existing class-meeting/assignment cases stay green.
- `apps/api/src/modules/calendar/calendar-e2e.spec.ts` (update only if the event projection changes shape — a null `endTime` must not produce an invalid `endTime` in the payload).

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/api/prisma/schema.prisma:276-290` — `model StudySession` exactly as listed in the parent README's code baseline: both `startTime` and `endTime` are required `DateTime`, `durationMinutes Int @default(0)` with the comment "Calculated", no `assignmentId`, no `status`.
- `apps/api/prisma/schema.prisma:187-210` — `model Assignment` has `tasks Task[]` and no relation to `StudySession`; `apps/api/prisma/schema.prisma:237-257` — `model Task` has `scheduledTasks ScheduledTask[]` and no relation to `StudySession`. Both need the inverse relation added for the new FKs.
- `apps/api/prisma/schema.prisma:17-53` — `User` already declares `studySessions StudySession[]`; the new FKs are on the session side, so `User` needs no change.
- `apps/api/src/modules/calendar/calendar.service.ts:204-210` — the session query; `:298-324` — the `STUDY_SESSION` event mapping, including `zoneDateParts(s.endTime, timeZone)` at `:300` and `focus: s.isFocusMode` at `:322`. Prisma's `gt` on a NULL column is not true, so a null-`endTime` row is excluded by the current filter; the mapping would also receive a null `endTime` once the column is nullable (a compile-time error until handled — good, it forces the fix).
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere(userId, id)`, `assertOwned(userId, record)`, `assertAffected(userId, count)`, `RESOURCE_NOT_FOUND = 'Resource not found'`; the header comment already lists `StudySession` in the scoped-model list.
- `apps/api/src/modules/availability/availability.service.ts` — the module precedent: a `toSlotResponse(row)` projection that never exposes `userId`, a `dtoErrors(dto, template)` helper that re-runs the DTO constraint set with `validateSync({ whitelist: true, forbidNonWhitelisted: true })` for non-HTTP callers, `ConflictException` for state conflicts, and `assertAffected` for scoped writes.
- `apps/api/src/modules/assignments/assignments.controller.ts` — the controller/DTO-metype pattern: the DTO class is declared as the `@Body()`/`@Query()` metatype so the global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) applies; `:id` is a plain string and a malformed id is "missing" → uniform 404, never 400.
- `apps/api/src/modules/users/dto/update-user.dto.ts` — `preferences` is validated only as a plain object of bounded size; the EP06 default seam (V-07-1) must therefore read it defensively.
- `apps/api/src/app.module.ts` — the module registration list (assignments, calendar, availability, …); `StudySessionsModule` is added here.
- Migrations live in `apps/api/prisma/migrations/<timestamp>_<name>/` (13 existing migrations, the last `20261025000000_assignment_optional_type`); `pnpm --filter api db:migrate` is the repo's migration script (`dotenv -e .env.local -- prisma migrate dev`).

### Implementation notes (concrete)

1. **Migration shape.** One migration folder, e.g. `apps/api/prisma/migrations/<timestamp>_study_session_focus_lifecycle/migration.sql`:
   - `ALTER TABLE "study_sessions" ALTER COLUMN "end_time" DROP NOT NULL;`
   - `ALTER TABLE "study_sessions" ADD COLUMN "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE';`
   - `ADD COLUMN "assignment_id" TEXT, "task_id" TEXT, "elapsed_seconds" INTEGER NOT NULL DEFAULT 0, "planned_minutes" INTEGER, "resumed_at" TIMESTAMP(3);`
   - FKs with `ON DELETE SET NULL`; indexes `(user_id, status)` and `(user_id, start_time)`;
   - **backfill**: `UPDATE "study_sessions" SET "status" = 'COMPLETED', "elapsed_seconds" = "duration_minutes" * 60;` (all pre-migration rows have `end_time` and `duration_minutes` set, so the status default is safe to overwrite).
   - **rollback**: restore `"end_time" NOT NULL` (every row has it), drop the added columns/indexes/FKs, restore the `status` default. `elapsed_seconds` is derived from `duration_minutes`, so no unique data is lost.
2. **Elapsed-time arithmetic (D07-07).** `segmentStart` = `resumedAt ?? startTime`. On pause/finish: `elapsedSeconds += max(0, floor((now - segmentStart) / 1000))`, then clear `resumedAt`. On resume: `resumedAt = now`. The service reads the clock once per request and uses it for both the arithmetic and the persisted `endTime`.
3. **Race-safe transitions.** For pause/resume/finish: (a) read the session with `where: ownedWhere(userId, id)` and pass it through `assertOwned` → uniform 404 when missing or foreign; (b) validate the transition against the read status → 409 with an actionable message; (c) apply the change with `updateMany({ where: { id, userId, status: <expected status> }, data: … })` and pass the count through `assertAffected` — but a 0 count here means a lost race, not a missing row (step (a) already proved ownership), so it must surface as 409, not 404. Implement this as an explicit `if (count === 0) throw new ConflictException(...)` rather than `assertAffected`, and document why.
4. **The start-time 409 (D07-6).** `POST /study-sessions` first checks for an existing open session (`where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } }`); if one exists → 409 "A focus session is already in progress." Provisional — the check is a single reversible service condition.
5. **Assignment/task ownership at create.** If `assignmentId` is given, read it scoped (`ownedWhere`) and `assertOwned` → uniform 404. If `taskId` is given, same; then compare `task.assignmentId` with the requested `assignmentId` — if both are set and differ → 400 with a field-level error on `taskId`.
6. **Projection.** `toStudySessionResponse(row)` in the service, mirroring `toSlotResponse`: `{ id, assignmentId, taskId, status, startTime, endTime, elapsedSeconds, durationMinutes, plannedMinutes, notes, createdAt, updatedAt }` with ISO timestamps. `userId` is never exposed.
7. **Calendar compatibility (D07-08).** In `calendar.service.ts`, the session query becomes something like:
   `where: { userId, startTime: { lt: rangeEnd }, OR: [{ endTime: null }, { endTime: { gt: rangeStart } }] }`
   and the mapping must tolerate a null `endTime` — render the open session with a projected end (for example the range end or the current instant) and a flag that marks it as in progress. The exact event shape for an open session is a presentation detail of the existing calendar contract; if the calendar payload needs a new field, that is an EP04-visible contract change and must be flagged in the EP07A implementation record rather than silently reshaped.
8. **The `StudySession` web type** (`apps/web/src/shared/types/academic.ts:112-122`) still mirrors the old required-`endTime` schema. It is updated by EP07C/EP07D when the client starts consuming the new projection — **not** in this story (no frontend writes in EP07A).

### Risks / open questions (none blocking)

- **The `status` enum name.** `StudySessionStatus` is proposed to avoid colliding with the existing `AssignmentStatus` / `TaskStatus` enums. If the repo prefers a shared name, that is a naming decision with no behavioral consequence.
- **The `resumedAt` column.** It is the mechanism that makes the segment survive a reload (AC-E07-06). An alternative — deriving the segment from `updatedAt` — would be wrong whenever an unrelated field is written, so it is not an option; record the column as required.
- **Backfill of historical rows.** Pre-migration sessions have no assignment link and no status history, so they become `COMPLETED` with no assignment. If the product later wants historical sessions attributed to assignments, that is a separate data decision, not an EP07 requirement.
- **Calendar payload shape for an open session.** Flagged, not decided here (see point 7).
- **No `notes`/`rating` write path.** The columns exist but the epic does not ask for them; the finish endpoint in EP07B deliberately does not accept them.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is rejected: unknown body fields and out-of-range `plannedMinutes` produce 400 with a field-level `errors` map; a task that belongs to another assignment produces 400.
3. Academic data is scoped to the authenticated student — every query carries the `userId`, and a missing and a foreign record return the identical uniform 404.
4. API errors are actionable — 400 field errors, 409 with a human-readable reason, 404 with the uniform `Resource not found`.
5. Not applicable — no frontend async states in this story (the API's own error states are covered by 2/4).
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests: unit, data-scoping and e2e specs for the lifecycle, the timestamp-derived elapsed time, the 409 transitions and the lost race; the calendar regression is covered by EP07F (TR-E07-07) and the existing calendar specs stay green here.
9. API changes and migrations are documented: the migration, its backfill and its rollback are recorded in `./artifacts/EP07A/implementation.md`; the endpoint contract lives in the parent README's shared API/data contract section.
10. Integrated review — the combined EP07 parent review.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** `StudySession` can persist a focus session's lifecycle — start, pause, resume and read back the open session — with server-timestamp-derived elapsed time, ownership scoping on every query, and no regression to the EP04 calendar.
- **Request/token estimate:** 2–3 requests/tokens — one migration with backfill and rollback, one new NestJS module (controller + service + DTO + module registration), four endpoints with the race-safe transition pattern, one cross-module calendar change, and three spec files. The elapsed-time arithmetic and the lost-race handling are the two places a mistake is silent, so the estimate is at the upper end of the band.
- **Model recommendation:** 4 — a nullable-column migration with a data backfill on a table another module reads, plus a state machine whose transitions must be race-safe and whose elapsed time must come from persisted timestamps. A frontier model is recommended for the migration + transition design; the endpoint wiring itself is ordinary.
- **Files:**
  - `apps/api/prisma/schema.prisma` (modify — `StudySession`, `Assignment`, `Task`, new `StudySessionStatus` enum);
  - `apps/api/prisma/migrations/<timestamp>_study_session_focus_lifecycle/migration.sql` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.module.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.controller.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.service.ts` (new);
  - `apps/api/src/modules/study-sessions/dto/start-study-session.dto.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.service.spec.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (new);
  - `apps/api/src/app.module.ts` (modify — register the module);
  - `apps/api/src/modules/calendar/calendar.service.ts` (modify — null-`endTime` handling) and `apps/api/src/modules/calendar/calendar.service.spec.ts` (modify).
- **Start context:** this story file; the parent README's shared API/data contract + decision register (D07-1, D07-6, D07-7, D07-8) + code baseline; `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/availability/` (the module + projection + DTO re-validation precedent); `apps/api/src/modules/calendar/calendar.service.ts:190-330`; `apps/api/prisma/schema.prisma:180-290`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- study-sessions` (unit + data-scoping); `pnpm --filter api test -- calendar` (existing calendar specs stay green); `pnpm --filter api test` (full API suite); `pnpm --filter api typecheck`; `pnpm --filter api lint`; `pnpm --filter api db:generate` (the generated Prisma client must compile with the nullable `endTime`). The migration itself is applied in the EP09 self-contained E2E database (EP07F).
- **Dependencies / exclusions:** EP03 complete. Excludes finish/confirmed-time/read APIs (EP07B), all frontend work (EP07C/D/E), the cross-layer E2E suite and the parent index (EP07F), writes to `Assignment.actualHours` / `Task.actualMinutes` / `Assignment.status` (D07-2), the EP06 planning tables, and the dashboard quick action (D07-9).

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The `ui-refiner` pass is not required for EP07A.
