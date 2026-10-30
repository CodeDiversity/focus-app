# EP07B: Completion, Confirmed-Time Log & Read APIs

**Story ID:** EP07B
**Title:** Backend — finish a session with a bounded confirm/adjust, expose the study history and the per-assignment confirmed-time read API
**Parent epic:** [EP07: Focus Sessions & Time Tracking](../../epics/EP07-focus-sessions-and-time-tracking.md) (Jira STUDY-13)
**Parent:** [EP07 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Queued
**Dependencies:** **EP07A** — the `StudySession` lifecycle, the module and the projection must be implemented before the finish and read endpoints exist. Decisions D07-1…D07-8 recorded in the parent README.
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

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
  - an out-of-range / non-integer / unknown-field body → a 400 field-level error map;
  - finish on a COMPLETED session → 409; a status-guarded update that affects 0 rows → 409 (lost race);
  - the service issues **no** write against `assignment` or `task` — asserted by the mocked Prisma client receiving no `assignment.update` / `task.update` call.
- `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (extend):
  - the history query and the confirmed-time query both carry the authenticated `userId`;
  - another student's session id, assignment id and session rows are unreachable, and the responses are the identical uniform 404;
  - `confirmed-time` never aggregates another student's sessions.
- `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (extend):
  - 200 on finish with the completed projection; 400 with a field-level `errors` map on an out-of-range `confirmedMinutes`; 409 on a double finish; 404 uniform on a foreign session;
  - 200 on `GET /study-sessions` with `{ items, total }` and the documented order;
  - 200 on `GET /study-sessions/confirmed-time` in both shapes;
  - a full "the assignment did not change" check: read the assignment before and after the finish and compare the two payloads field-for-field.
- `apps/api/src/modules/assignments/assignments.service.spec.ts` (regression check only — no change expected): finishing a session must not alter any assignment behaviour.

## Technical notes

### Verified baseline (inspected 2026-10-29 at HEAD `8e31c0d`)

- `apps/api/prisma/schema.prisma:276-290` — `StudySession` has no status, no assignment/task link and a required `endTime`; after EP07A it carries `status`, `assignmentId`, `taskId`, `elapsedSeconds`, `durationMinutes`, `plannedMinutes`, `resumedAt` and a nullable `endTime`.
- `apps/api/prisma/schema.prisma:187-210` — `Assignment.actualHours Float?` and `Assignment.status AssignmentStatus` exist but are never written by an EP07 endpoint. `apps/api/src/modules/assignments/dto/update-assignment.dto.ts:19-25` documents that the global validation pipe rejects `actualHours` as a lifecycle field on `PATCH /assignments` — there is no API path that writes it today.
- `apps/api/prisma/schema.prisma:237-257` — `Task.actualMinutes Int?` is likewise never written by any endpoint.
- `apps/api/src/common/ownership/ownership.ts` — the uniform-404 helpers this story relies on.
- `apps/api/src/modules/availability/availability.service.ts` — the `dtoErrors(dto, template)` re-validation pattern (non-HTTP callers) and the `ConflictException` precedent; `apps/api/src/modules/assignments/dto/list-assignments-query.dto.ts` is the query-DTO precedent for the history list (whitelist + transform + `forbidNonWhitelisted` through the global pipe).
- `apps/api/src/modules/assignments/assignments.controller.ts:50-52` — the `@Query()`-metatype pattern that makes the global `FieldValidationPipe` apply to query parameters.
- `apps/api/src/modules/calendar/calendar.service.ts` reads `StudySession` but never writes it — no calendar-side change is needed here (EP07A owns the null-`endTime` compatibility).

### Implementation notes (concrete)

1. **Route ordering.** `GET /study-sessions/current` (EP07A) and `GET /study-sessions/confirmed-time` (this story) are literal path segments, and there is **no** `GET /study-sessions/:id` route, so there is no path conflict. Declare the literal routes before any parameterised sibling anyway, to stay safe if a `:id` read is ever added.
2. **Finish.** Reuse EP07A's transition guard: read the session scoped to the owner → uniform 404 when missing or foreign; validate `status ∈ { ACTIVE, PAUSED }` → 409 otherwise; compute the confirmed minutes; then apply a status-guarded `updateMany({ where: { id, userId, status: <read status> }, data: { status: 'COMPLETED', endTime: now, durationMinutes: confirmed, elapsedSeconds: newTotal, resumedAt: null } })`. A 0-row update → 409 (lost race), not 404.
3. **Confirm/adjust bounds.** `confirmedMinutes`: `@IsInt()`, `@Min(0)`, `@Max(1440)`, `@IsOptional()`. The service re-runs the DTO constraint set for non-HTTP callers (the `availability.service.ts` pattern) and returns a 400 with a field-level `errors` map.
4. **History query.** `ListStudySessionsQueryDto` with `assignmentId?` (string), `from?` / `to?` (ISO date/datetime), `limit?` (`@Min(1) @Max(100)`, default 50), `offset?` (`@Min(0)`, default 0). The query is `where: { userId, status: 'COMPLETED', …(assignmentId ? { assignmentId } : {}), …(from/to ? { startTime: { gte/lte } } : {}) }`, `orderBy: { startTime: 'desc' }`, with `skip: offset, take: limit`; `total` is a `count` over the same filter without the pagination.
5. **Confirmed-time aggregation.** `confirmedMinutes` = `sum(durationMinutes)` over the student's COMPLETED sessions grouped by `assignmentId`; `sessionCount` = the number of those sessions. With `assignmentId` given, the single entry must still be returned when the assignment has no completed session (`confirmedMinutes: 0`, `sessionCount: 0`) — the assignment itself is ownership-checked first (uniform 404).
6. **The "no denormalized copy" rule.** No `assignment.update` / `task.update` call appears anywhere in this story's service. The only writes are `studySession` writes. This is also the mechanism EP06 relies on (V-07-2).
7. **No writes to `notes` / `rating`.** The finish body accepts `confirmedMinutes` only; `notes` and `rating` stay untouched.

### Risks / open questions (none blocking)

- **Adjustment semantics.** The student may adjust the confirmed time to any value inside the bounds, including a value larger than the server-measured elapsed time (for example, they studied while the tab was closed). The epic says "confirm or adjust", so this is intended; the confirmed value is what the log stores, and the raw `elapsedSeconds` is preserved alongside it. No product question is open here.
- **The history list's date filter semantics.** `from`/`to` filter on `startTime`. Filtering on the session's date rather than its end date is the simpler contract; it is recorded in the parent README's shared contract.
- **Pagination style.** `limit`/`offset` with a `total` count matches the repo's existing list style (the assignments list uses filter/sort; the calendar uses ranges). If the reviewer prefers cursor pagination, that is a contract change to make before implementation — it is cheap now and expensive later.
- **EP06's consumption shape.** EP06 is not broken down, so the exact shape EP06 wants (`{ assignments: [...] }` versus a map) is provisional (V-07-2). The endpoint returns a list of entries so it can be reshaped without a schema change.

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
- **Request/token estimate:** 1–2 requests/tokens — three endpoints on an existing module (one write, two reads), two DTOs, and the aggregation/ordering logic over an established schema. Low uncertainty: the module, the projection and the transition guard all exist by the time this story starts (EP07A).
- **Model recommendation:** 3 — the endpoint work is ordinary, but the "finish never completes the assignment" invariant and the confirmed-time aggregation have to be exactly right, and the 400/404/409 distinctions are easy to get subtly wrong. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/api/src/modules/study-sessions/study-sessions.controller.ts` (modify — add three endpoints);
  - `apps/api/src/modules/study-sessions/study-sessions.service.ts` (modify);
  - `apps/api/src/modules/study-sessions/dto/finish-study-session.dto.ts` (new);
  - `apps/api/src/modules/study-sessions/dto/list-study-sessions-query.dto.ts` (new);
  - `apps/api/src/modules/study-sessions/study-sessions.service.spec.ts` (modify);
  - `apps/api/src/modules/study-sessions/study-sessions-data-scoping.spec.ts` (modify);
  - `apps/api/src/modules/study-sessions/study-sessions-e2e.spec.ts` (modify);
  - `apps/api/src/modules/assignments/assignments.service.spec.ts` (regression check only).
- **Start context:** this story file; the parent README's shared API/data contract + decision register (D07-1, D07-2, D07-7) + code baseline; EP07A's story file and its implementation record `./artifacts/EP07A/implementation.md` (the transition guard, the projection and the DTO re-validation pattern); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/availability/availability.service.ts`; `apps/api/src/modules/assignments/dto/list-assignments-query.dto.ts`. Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- study-sessions` (unit + data-scoping); `pnpm --filter api test -- assignments` (no regression); `pnpm --filter api test` (full API suite); `pnpm --filter api typecheck`; `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP07A implemented. Excludes start/pause/resume/current (EP07A), all frontend work (EP07C/D/E), the cross-layer E2E suite and the parent index (EP07F), writes to `notes`/`rating`, session editing/deletion, and EP06's own remaining-work calculation and screen.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The `ui-refiner` pass is not required for EP07B.
