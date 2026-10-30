# EP07B: Completion, Confirmed-Time Log & Read APIs

**Story ID:** EP07B
**Title:** Backend — finish a session with a bounded confirm/adjust, expose the study history and the per-assignment confirmed-time read API
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Implemented — awaiting parent review
**Dependencies:** **EP07A** — the `StudySession` lifecycle, the module and the projection must be implemented before the finish and read endpoints exist. Decisions D07-1…D07-8 recorded in the parent README.
**Jira key:** Pending creation
**Refined:** technical refinement captured in this file (backend-only; no `ui-refiner` pass required) — 2026-10-30

## Summary

Finishing a session writes one row: the session's status becomes `COMPLETED`, its `endTime` is set and its **confirmed** minutes are stored. The student may confirm the server-recorded elapsed time or adjust it within a bounded range. Finishing never touches the assignment. Two read APIs sit on top of the same log: the student's **study history**, and a **per-assignment confirmed-time** endpoint that EP06 consumes to compute remaining work (the provisional seam V-07-2).

## Description & bounded scope

### In scope

1. **`POST /study-sessions/:id/finish`** — complete an open session. Body `{ confirmedMinutes? }` (integer, `0 ≤ n ≤ 1440`; omitted → `round(elapsedSeconds / 60)`). Sets `status: COMPLETED`, `endTime` = the server's now, `durationMinutes` = the confirmed minutes, and adds the running segment to `elapsedSeconds` before confirming. An already-completed session → 409; a missing or foreign session → the uniform 404; an out-of-range or non-integer `confirmedMinutes` → 400 with a field-level `errors` map; unknown body fields → 400.
2. **The "finish never completes the assignment" rule** (AC-E07-07, D07-2) — the finish endpoint writes **only** `StudySession` fields. It never writes `Assignment.status`, `Assignment.actualHours` or `Task.actualMinutes`.
3. **`GET /study-sessions`** — the student's study history. Completed sessions only, ordered `startTime` descending, filtered by `assignmentId?`, `from?`, `to?` (ISO dates), paged with `limit?` (1–100, default 50) and `offset?` (default 0). Returns `{ items, total }`. A given `assignmentId` that is not owned → the uniform 404. Unknown query parameters → 400 (the global validation pipe).
4. **`GET /study-sessions/confirmed-time`** — the EP06 read seam. Without `assignmentId` → `{ assignments: [{ assignmentId, confirmedMinutes, sessionCount }] }` for every assignment that has at least one completed session; with `assignmentId` → `{ assignmentId, confirmedMinutes, sessionCount }`. `confirmedMinutes` is the sum of `durationMinutes` over that assignment's completed sessions — the confirmed log, never the raw accumulator. A given assignment that is not owned → the uniform 404.
5. **No denormalized copy** — no EP07 endpoint writes `Assignment.actualHours` or `Task.actualMinutes`; the confirmed time is derived from the session log on read (D07-2).
6. **Tests** — unit, data-scoping and e2e coverage of the finish rule, the confirm/adjust bounds, the history list and the confirmed-time aggregation.

### Out of scope

- Starting, pausing, resuming and the current-session read — **EP07A**.
- Any frontend work — **EP07C/D/E**.
- The cross-layer E2E suite and the parent index — **EP07F**.
- Writing `notes` or `rating` on a finished session (the columns exist; the epic does not ask for them).
- The EP06 scheduling engine, the `StudyPlan`/`ScheduledTask` tables and EP06's own remaining-work screen — EP07 only ships the endpoint EP06 will consume.
- The dashboard's "Today's study sessions" widget (EP05's surface — D07-3).
- Editing or deleting a completed session (the log is append-only; corrections happen by finishing a new session).

## Source requirement references

- **Epic AC-E07-02** (backend half: finish), **AC-E07-04** (backend half: the finish endpoint accepts a bounded confirmed/adjusted value), **AC-E07-05** (backend half: the confirmed-time read is per assignment), **AC-E07-07** (finishing never marks the assignment complete), **AC-E07-08** (backend half: the confirmed-time endpoint that feeds remaining-work calculations).
- **TR-E07-02** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP07 parent review.
- **Decisions:** D07-1, D07-2, D07-3, D07-4 (V-07-2), D07-7; the shared API/data contract section of the parent README.

## Acceptance criteria

1. `POST /study-sessions/:id/finish` completes an open session: `status` becomes `COMPLETED`, `endTime` is set to the server's now, the running segment is added to `elapsedSeconds`, and `durationMinutes` becomes the confirmed value — the client's `confirmedMinutes` when supplied, otherwise `round(elapsedSeconds / 60)`.
2. The confirmed value is bounded and integral: a non-integer, negative or greater-than-1440 `confirmedMinutes` is rejected with 400 and a field-level `errors` map; an unknown body field is rejected with 400; a body with only `confirmedMinutes` omitted is valid.
3. Finishing a session changes **no** assignment or task field: `Assignment.status`, `Assignment.actualHours`, `Task.actualMinutes` and the assignment's `updatedAt` are byte-identical before and after the finish call, and the assignment's subtask rows are unchanged.
4. Finishing an already-completed session returns 409 with an actionable message; finishing a missing or foreign session returns the uniform 404 `Resource not found`; a concurrent double-finish results in exactly one 200 and one 409, with the confirmed minutes written once.
5. `GET /study-sessions` returns only the student's completed sessions, ordered `startTime` descending, with `{ items, total }`; `assignmentId`, `from` and `to` narrow the result; `limit` (1–100, default 50) and `offset` page it; `total` counts the filtered rows, not the page; an out-of-range `limit` or an invalid date is a 400; a given `assignmentId` that is not owned is the uniform 404.
6. `GET /study-sessions/confirmed-time` returns, for each assignment with at least one completed session, the sum of that assignment's confirmed `durationMinutes` and its completed-session count; with `assignmentId` it returns that single entry (including `confirmedMinutes: 0` and `sessionCount: 0` when the assignment has no completed session); a given assignment that is not owned is the uniform 404. The values come from the session log only — no assignment field is read to compute them.
7. Unit, data-scoping and e2e specs cover the finish rule, the confirm/adjust bounds, the "assignment untouched" invariant, the history list's filter/order/page behavior and the confirmed-time aggregation.

## Tests to add / update

- `apps/api/src/modules/study-sessions/study-sessions.service.spec.ts` (extend):
  - finish computes `durationMinutes` from the client value when supplied and from `round(elapsedSeconds / 60)` when omitted;
  - finish adds the running segment to `elapsedSeconds` and sets `endTime`;
  - finish on an ACTIVE session adds `floor((now - (resumedAt ?? startTime))/1000)`; on a PAUSED session `elapsedSeconds` is unchanged before confirming;
  - an out-of-range / non-integer / unknown-field body → a 400 field-level error map;
  - finish on a COMPLETED session → 409; a status-guarded update that affects 0 rows → 409 (lost race);
  - the service issues **no** write against `assignment` or `task` — asserted by the mocked Prisma client receiving no `assignment.update` / `task.update` / `assignment.findFirst` call beyond the (absent) ownership gate (finish does not read the assignment);
  - `history` (list) builds `where: { userId, status: 'COMPLETED', … }`, orders `startTime` desc then `id` desc, applies `skip`/`take`, and returns `{ items, total }` with `total` from a separate `count`;
  - `history` ownership-gates a given `assignmentId` (uniform 404 when missing/foreign) before any session query;
  - `confirmedTime` without `assignmentId` groups completed sessions by `assignmentId` and sums `durationMinutes` / counts rows, sorted by `assignmentId` asc;
  - `confirmedTime` with `assignmentId` ownership-checks the assignment first (uniform 404), then returns `{ assignmentId, confirmedMinutes, sessionCount }` with `0`/`0` when there are no completed sessions.
- `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (extend):
  - the history query and the confirmed-time query both carry the authenticated `userId`;
  - another student's session id, assignment id and session rows are unreachable, and the responses are the identical uniform 404;
  - `confirmed-time` never aggregates another student's sessions;
  - `GET /study-sessions` never returns another student's completed sessions;
  - the projection never exposes `userId` or `resumedAt`.
- `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (extend):
  - 200 on finish with the completed projection; 400 with a field-level `errors` map on an out-of-range `confirmedMinutes`; 409 on a double finish; 404 uniform on a foreign session;
  - 200 on `GET /study-sessions` with `{ items, total }` and the documented order;
  - `GET /study-sessions?assignmentId=&from=&to=&limit=&offset=` filter/page behavior and 400 on an out-of-range `limit` or an invalid date;
  - 200 on `GET /study-sessions/confirmed-time` in both shapes (with and without `assignmentId`), including the `0`/`0` case;
  - a full "the assignment did not change" check: read the assignment before and after the finish and compare the two payloads field-for-field;
  - 404 uniform on a foreign `assignmentId` for both `GET /study-sessions` and `GET /study-sessions/confirmed-time`.
- `apps/api/src/modules/assignments/assignments.service.spec.ts` (regression check only — no change expected): finishing a session must not alter any assignment behaviour.

## Technical notes

### Relevant files

Existing files to change:

- `apps/api/src/modules/study-sessions/study-sessions.controller.ts` — add `POST :id/finish` (200), `GET` list (200) and `GET confirmed-time` (200); declare `FinishStudySessionDto` as the `@Body()` metatype and `ListStudySessionsQueryDto` as the `@Query()` metatype so the global `FieldValidationPipe` applies; register the literal routes before any parameterised sibling.
- `apps/api/src/modules/study-sessions/study-sessions.service.ts` — add `finish`, `list` (history) and `confirmedTime` methods, plus the `toStudySessionResponse` reuse and a `dtoErrors` re-validation pass for non-HTTP callers.

New files to create (following the `availability` / `assignments` module naming):

- `apps/api/src/modules/study-sessions/dto/finish-study-session.dto.ts` — `FinishStudySessionDto`.
- `apps/api/src/modules/study-sessions/dto/list-study-sessions-query.dto.ts` — `ListStudySessionsQueryDto`.

No migration and no schema change: EP07A already added `status`, `assignmentId`, `elapsedSeconds`, `durationMinutes`, `resumedAt` and the indexes. No new module registration (`StudySessionsModule` exists).

### Verified baseline (inspected 2026-10-30 at EP07A's HEAD)

- `apps/api/src/modules/study-sessions/study-sessions.service.ts` — `pause`/`resume` establish the transition pattern to reuse: read scoped → 404; validate transition → 409; status-guarded `updateMany({ where: { id, userId, status: <expected> } })`; 0 rows → 409 "The session changed; reload and try again."; then re-read and project. `toStudySessionResponse` projects the 12 contract keys (no `userId`/`resumedAt`).
- `apps/api/src/modules/study-sessions/study-sessions.controller.ts` — route prefix `study-sessions`; existing `@Get('current')`. No `GET :id`, so `confirmed-time` and the list root do not conflict.
- `apps/api/src/modules/availability/availability.service.ts` — `dtoErrors(dto, template)` re-validation pattern and `throwFieldErrors`; `apps/api/src/modules/assignments/assignments.service.ts` — `list` pattern (ownership gate on a referenced id, ISO-date parsing, `skip`/`take` not used there but the `count` + `findMany` split is the repo's list style); `apps/api/src/modules/assignments/dto/list-assignments-query.dto.ts` — `@Transform(({ obj, key }) => obj[key])` to preserve raw query values against implicit coercion, plus `@IsISO8601` + `ValidateBy` parseability.
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere`, `RESOURCE_NOT_FOUND`; the uniform 404. `assertAffected` is **not** used for the finish lost-race (it maps to 404); the service throws 409 directly, mirroring EP07A's divergence note.
- `apps/api/src/modules/assignments/assignments.controller.ts:50-52` — the `@Query()`-metatype pattern that makes the global `FieldValidationPipe` apply to query parameters.

### Decisions (settled by this refinement)

- **D07-B1 Finish transition.** Read the session scoped to the owner → uniform 404 when missing/foreign. If `status === COMPLETED` → 409 "This session is already completed." If the status is neither `ACTIVE` nor `PAUSED` → 409 "This session cannot be finished." Compute `now = new Date()` once. For an `ACTIVE` session, `segmentStart = resumedAt ?? startTime`, `added = max(0, floor((now - segmentStart) / 1000))`, `newElapsed = elapsedSeconds + added`. For a `PAUSED` session, `newElapsed = elapsedSeconds` (no running segment). `confirmed = (dto.confirmedMinutes != null) ? dto.confirmedMinutes : Math.round(newElapsed / 60)`. Then a status-guarded `updateMany({ where: { id, userId, status: <read status> }, data: { status: 'COMPLETED', endTime: now, durationMinutes: confirmed, elapsedSeconds: newElapsed, resumedAt: null } })`. A 0-row update → 409 "The session changed; reload and try again." (lost race), never a 404. Re-read and return the projection. Finish writes **only** `StudySession` fields — no `assignment`/`task` read or write (D07-2).
- **D07-B2 `confirmedMinutes` bounds.** `FinishStudySessionDto`: `@IsOptional() @IsInt() @Min(0) @Max(1440) confirmedMinutes?: number | null`. The service re-runs the DTO constraint set via `dtoErrors` (defense in depth) and throws the 400 field-level `errors` map. A `null` value is treated as omitted (defaults), matching the availability module convention.
- **D07-B3 Assignment untouched.** The finish path contains no `prisma.assignment.*` / `prisma.task.*` call — not even an ownership read — because the session row already carries `assignmentId`/`taskId` and finish does not need them. This is the mechanism behind AC-E07-07 and is asserted by the unit spec (mocked Prisma client receives no such call) and the e2e spec (assignment payload byte-identical before/after).
- **D07-B4 History query.** `ListStudySessionsQueryDto`:
  - `assignmentId?` (string, optional) — `@Transform` empty→undefined + `@IsOptional @IsString`.
  - `from?` / `to?` (string, optional) — `@Transform` preserve-raw + `@IsOptional @IsISO8601()` + a `ValidateBy` requiring `Number.isFinite(Date.parse(value))` (accepts date-only and datetime).
  - `limit?` (number, optional) — `@Transform` empty/undefined→undefined else `Number(v)` + `@IsOptional @IsInt @Min(1) @Max(100)`. Default 50 applied in the service.
  - `offset?` (number, optional) — same transform + `@IsOptional @IsInt @Min(0)`. Default 0 applied in the service.
  - Unknown query params → 400 via the global pipe (whitelist + `forbidNonWhitelisted`).
  Query: `where = { userId, status: 'COMPLETED', ...(assignmentId ? { assignmentId } : {}), ...(from/to ? { startTime: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) }`; `orderBy = [{ startTime: 'desc' }, { id: 'desc' }]`; `skip = offset`, `take = limit`; `total = prisma.studySession.count({ where })`. A given `assignmentId` is ownership-gated first (uniform 404 before any session query), mirroring the assignments list's `courseId` gate.
- **D07-B5 Confirmed-time aggregation.** `confirmedTime(userId, assignmentId?)`:
  - If `assignmentId` is given: ownership-check the assignment first (uniform 404 when missing/foreign); then aggregate the student's COMPLETED sessions with that `assignmentId` (`_sum.durationMinutes`, `_count`); return `{ assignmentId, confirmedMinutes: sum ?? 0, sessionCount: count }` (including `0`/`0` when none).
  - If omitted: `prisma.studySession.groupBy({ by: ['assignmentId'], where: { userId, status: 'COMPLETED', assignmentId: { not: null } }, _sum: { durationMinutes: true }, _count: { _all: true } })`; map each group to `{ assignmentId, confirmedMinutes: _sum.durationMinutes ?? 0, sessionCount: _count._all }`; sort by `assignmentId` asc; return `{ assignments: [...] }`. Sessions with a null `assignmentId` (unlinked or whose assignment was deleted) are excluded — they carry no assignment to attribute confirmed time to. `confirmedMinutes` is the sum of the **confirmed** `durationMinutes`, never `elapsedSeconds` (D07-2 / D07-7).
- **D07-B6 Defaults.** `limit` defaults to 50 and `offset` to 0 inside the service (`query.limit ?? 50`, `query.offset ?? 0`), so an omitted value passes validation and the default is applied exactly once. `from`/`to`/`assignmentId` absent → no corresponding filter.
- **D07-B7 Route ordering.** Declare `@Get('current')` (EP07A), `@Get('confirmed-time')`, then `@Get()` for the history list; and `@Post()` (start) before `@Post(':id/finish')`. Literal segments first so a future `GET :id` cannot shadow them. `finish` uses `@HttpCode(HttpStatus.OK)` (200, not the default 201).
- **D07-B8 Confirmed-time query input.** `GET /study-sessions/confirmed-time` reads `assignmentId` via `@Query('assignmentId')` (no query DTO, so unknown params are ignored and a malformed id flows to the ownership gate → uniform 404, matching the repo convention for `:id` path params). When provided and owned, the single entry is returned; an owned assignment with no completed sessions returns `0`/`0`.
- **D07-B9 No writes to `notes`/`rating`.** The finish body accepts `confirmedMinutes` only; `notes` and `rating` stay untouched (they are not part of this story's scope).

### Implementation notes (concrete)

1. **Controller.** Add to `StudySessionsController`:
   ```ts
   @Post(':id/finish')
   @HttpCode(HttpStatus.OK)
   finish(@CurrentUser() user, @Param('id') id, @Body() dto: FinishStudySessionDto) {
     return this.studySessionsService.finish(user.id, id, dto);
   }

   @Get('confirmed-time')
   confirmedTime(@CurrentUser() user, @Query('assignmentId') assignmentId?: string) {
     return this.studySessionsService.confirmedTime(user.id, assignmentId);
   }

   @Get()
   list(@CurrentUser() user, @Query() query: ListStudySessionsQueryDto) {
     return this.studySessionsService.list(user.id, query);
   }
   ```
   Keep `@Get('current')` declared before `@Get('confirmed-time')` and `@Get()`.
2. **Service `finish`.** Follow D07-B1; reuse `toStudySessionResponse` and `dtoErrors`/`throwFieldErrors`. No Prisma transaction needed — the single status-guarded `updateMany` is the atomic step (EP07A precedent). Do not read or write `assignment`/`task`.
3. **Service `list`.** Follow D07-B4. Reuse `toStudySessionResponse` for each row. Return `{ items, total }`.
4. **Service `confirmedTime`.** Follow D07-B5. Use `prisma.studySession.groupBy` for the unfiltered case.
5. **DTO re-validation.** Both new DTOs are re-validated in the service via `dtoErrors` (defense in depth for non-HTTP callers), mirroring `start`.
6. **No migration.** EP07A owns the schema. This story adds no Prisma changes.
7. **The `StudySession` web type** is not touched (no frontend writes in EP07B).

### Risks / open questions (none blocking)

- **Date filter semantics.** `from`/`to` filter on `startTime` (D07-B4), with `to` applied as `startTime <= to`. A date-only `to` (e.g. `2026-10-30`) therefore means `startTime <= 2026-10-30T00:00:00Z`; callers wanting the whole day should pass a datetime or the next day's date. Recorded in the parent README's shared contract; changing it later is a contract change.
- **Confirmed-time list ordering.** Sorted by `assignmentId` asc for deterministic output; the parent contract does not specify an order. Cheap to change if EP06 prefers another.
- **History tie-break.** `startTime` desc then `id` desc for deterministic paging when two sessions share a `startTime`.
- **EP06's consumption shape.** Provisional (V-07-2): a list of entries so it can be reshaped without a schema change.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is rejected: unknown body fields and out-of-range / non-integer `confirmedMinutes` produce 400 with a field-level `errors` map; invalid query parameters produce 400.
3. Academic data is scoped to the authenticated student — the history and confirmed-time queries carry the `userId`, and missing and foreign records return the identical uniform 404.
4. API errors are actionable — 400 field errors, 409 with a human-readable reason, 404 with the uniform `Resource not found`.
5. Not applicable — no frontend async states in this story.
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests: the "finishing never completes the assignment" invariant, the confirm/adjust bounds, the double-finish 409, the history list's filter/order/page behavior and the confirmed-time aggregation.
9. API changes are documented in the parent README's shared API/data contract section; the migration documentation is EP07A's.
10. Integrated review — the combined EP07 parent review.
11. Reviewer walkthrough — the combined EP07 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** a session can be finished with a confirmed (or bounded-adjusted) number of minutes without touching the assignment, and the student — and later EP06 — can read the study history and the per-assignment confirmed time.
- **Request/token estimate:** 1–2 requests/tokens — three endpoints on an existing module (one write, two reads), two new DTOs, the status-guarded finish transition, and the groupBy aggregation over an established schema. Low uncertainty: the module, the projection and the transition guard all exist by the time this story starts (EP07A).
- **Model recommendation:** 3 — the endpoint work is ordinary, but the "finish never completes the assignment" invariant and the confirmed-time aggregation have to be exactly right, and the 400/404/409 distinctions are easy to get subtly wrong. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/api/src/modules/study-sessions/study-sessions.controller.ts` (modify — add three endpoints);
  - `apps/api/src/modules/study-sessions/study-sessions.service.ts` (modify — add `finish`, `list`, `confirmedTime`);
  - `apps/api/src/modules/study-sessions/dto/finish-study-session.dto.ts` (new);
  - `apps/api/src/modules/study-sessions/dto/list-study-sessions-query.dto.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.service.spec.ts` (modify);
  - `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (modify);
  - `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (modify);
  - `apps/api/src/modules/assignments/assignments.service.spec.ts` (regression check only).
- **Start context:** this story file; the parent README's shared API/data contract + decision register (D07-1, D07-2, D07-7) + code baseline; EP07A's story file and its implementation record `./artifacts/EP07A/implementation.md` (the transition guard, the projection and the DTO re-validation pattern); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/availability/availability.service.ts`; `apps/api/src/modules/assignments/dto/list-assignments-query.dto.ts`; `apps/api/src/modules/assignments/assignments.service.ts` (`list` pattern). Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- study-sessions` (unit + data-scoping); `pnpm --filter api test -- assignments` (no regression); `pnpm --filter api test` (full API suite); `pnpm --filter api typecheck`; `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP07A implemented. Excludes start/pause/resume/current (EP07A), all frontend work (EP07C/D/E), the cross-layer E2E suite and the parent index (EP07F), writes to `notes`/`rating`, session editing/deletion, and EP06's own remaining-work calculation and screen.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The `ui-refiner` pass is not required for EP07B.