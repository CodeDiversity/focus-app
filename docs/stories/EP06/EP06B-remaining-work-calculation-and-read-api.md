# EP06B: Remaining-Work Calculation & Read API

**Story ID:** EP06B
**Title:** Backend — calculate each assignment's remaining work and expose `GET /study-plans/remaining-work`
**Parent epic:** [EP06: Study Planning & Scheduling](../../epics/EP06-study-planning-and-scheduling.md) (Jira STUDY-15)
**Parent:** [EP06 breakdown](./README.md)
**Milestone:** M3
**Layer:** Backend
**Status:** Implemented — awaiting parent review (implemented 2026-10-30; commit `f07a84b`). Artifacts: [checkpoint](./artifacts/EP06B/checkpoint.md) · [implementation record](./artifacts/EP06B/implementation.md)
**Dependencies:** EP06A implemented (the shared `StudyPreferences` type and the domain folder). EP03 complete (assignments exist). **No dependency on EP07** — EP06 reads the `StudySession` log itself (D06-6); the only EP07 coupling is the named, unobservable-until-EP07A seam **V-07-3** (D06-7).
**Jira key:** Pending creation
**Refined:** — (technical-refine pass not yet run; this file is the planner's breakdown)

## Summary

The epic's second acceptance criterion is that the system calculates remaining estimated work from assignment estimates and confirmed study time. This story owns that calculation as a pure domain function, the confirmed-time aggregation that feeds it, and the read endpoint that exposes the result: for each unfinished assignment, its estimate, its confirmed study time, what is left, and — when the assignment is missing the information needed to schedule it — the reason it was flagged instead of scheduled.

## Description & bounded scope

### In scope

1. **The pure remaining-work classification** in `apps/api/src/domain/study-planning/remaining-work.ts`:
   - the estimate → minutes conversion (`round(estimatedHours × 60)`);
   - the unfinished-status filter (`PENDING` and `IN_PROGRESS` are candidates; `COMPLETED`, `SUBMITTED` and `GRADED` are not);
   - the **flagging** rule (AC-E06-09, D06-25) — an assignment with no `estimatedHours` (or a non-positive one) is `MISSING_ESTIMATE`; an assignment with no `dueDate` is `MISSING_DUE_DATE`; `MISSING_ESTIMATE` takes precedence when both are missing. A flagged assignment is **never** a scheduling candidate;
   - the remaining-work arithmetic — `remainingMinutes = max(0, estimatedMinutes − confirmedMinutes)`.
2. **The confirmed-time aggregation** (D06-6) — EP06's own ownership-scoped read of the `StudySession` log, summing `durationMinutes` per assignment. **`Assignment.actualHours` and `Task.actualMinutes` are never read** (D07-2).
3. **The two-state behaviour of that aggregation** (D06-7, seam V-07-3):
   - **State A (today's schema):** `StudySession` has no `assignmentId` and no `status`, so confirmed minutes **cannot be attributed** to an assignment. EP06 sums the student's confirmed minutes and reports them as `unattributedConfirmedMinutes`; every assignment's `confirmedMinutes` is `0`. This is unobservable in practice, because **nothing writes `StudySession` today** (no API creates one; the only writes in the repo are calendar test fixtures).
   - **State B (after EP07A's migration):** the aggregation selects `assignmentId` and `status`, groups the `COMPLETED` sessions by `assignmentId`, and attributes their minutes to the matching assignment; sessions with a null `assignmentId` (including those whose assignment was deleted — EP07A uses `onDelete: SetNull`) stay unattributed. The upgrade is the named change below.
4. **`GET /study-plans/remaining-work`** — the read endpoint: `{ items: RemainingWorkItem[]; unattributedConfirmedMinutes: number }`. It never exposes `userId`; each item's `dueDate` is the **profile zone's civil date** (`YYYY-MM-DD | null`, D06-24) and the items are sorted by the engine's comparator (D06-22).
5. **Tests** — the domain unit tests, the service unit tests, the data-scoping spec and the e2e spec for the new endpoint.

### Out of scope

- The scheduling engine and the conflict rules — **EP06C**.
- The plan persistence, the preview, the save and the conflict re-check — **EP06D**.
- Any frontend work — **EP06G** renders this read.
- Changing `StudySession` — the `assignmentId` column and the session status belong to **EP07A** (seam V-07-3).
- Consuming EP07B's `GET /study-sessions/confirmed-time` — D06-6 keeps EP06 independent of it (seam V-07-2 stays EP07's own surface).
- Writing `Assignment.actualHours` or any denormalized copy of the confirmed time.

## Source requirement references

- **Epic AC-E06-02** ("The system calculates remaining estimated work from assignment estimates and confirmed study time") — this story's backend half.
- **Epic AC-E06-09** ("Assignments missing necessary scheduling information are flagged rather than silently scheduled") — the flagging half.
- **TR-E06-02** (this child's test obligations).
- **Shared DoD** — items 1, 2, 3, 4, 8, 9 apply; items 10/11 belong to the combined EP06 parent review.
- **Decisions:** D06-1 (assignments, not subtasks), D06-6 (EP06's own `StudySession` read), D06-7 (the two-state aggregation), D06-17 (the domain module's location), D06-22 (the one comparator the read and the engine share), D06-24 (the due date is a profile-zone civil date at every EP06 boundary), D06-25 (the flagging semantics); and the parent README's **Shared API and data contract** → *Endpoints*, *Rules* 3–5 and the `RemainingWorkItem` payload, plus *The window, the dates and the time representation*.

## Acceptance criteria

1. `GET /study-plans/remaining-work` returns one item per **unfinished** assignment (`PENDING` or `IN_PROGRESS`) — `COMPLETED`, `SUBMITTED` and `GRADED` assignments are absent — and each item carries the assignment's id, title, course code, due date (the **profile zone's civil date**, `YYYY-MM-DD | null` — D06-24), `estimatedMinutes`, `confirmedMinutes`, `remainingMinutes`, status and its `flagged` reason.
2. `estimatedMinutes` is `round(estimatedHours × 60)`; `remainingMinutes` is `max(0, estimatedMinutes − confirmedMinutes)`; an assignment with no estimate (or a non-positive one) has `estimatedMinutes: null` and `remainingMinutes: null`, and one with no due date keeps its estimate and its remaining minutes.
3. An assignment missing the estimate or the due date is flagged (`MISSING_ESTIMATE` / `MISSING_DUE_DATE`) and is **not** a scheduling candidate; `MISSING_ESTIMATE` wins when both are missing (D06-25).
4. The confirmed minutes come from the `StudySession` log through EP06's own ownership-scoped aggregation; `Assignment.actualHours` is never read, and no denormalized copy of the confirmed time is written anywhere.
5. The response carries `unattributedConfirmedMinutes`: the student's confirmed minutes that could not be attributed to an assignment. In state A (today's schema, before EP07A's `assignmentId` column) that is the student's entire confirmed total and every item's `confirmedMinutes` is `0`; the endpoint still reports the number rather than hiding it.
6. The read is ownership-scoped: a second student's sessions are invisible, the projection never exposes `userId`, and an unauthenticated request is rejected.
7. The items are ordered by **the engine's comparator** (D06-22): on-time assignments first (due date ascending), then overdue, then undated; within a group by priority descending, then `createdAt` ascending, then `id` ascending — the same order the plan places in, so the list and the plan never disagree about which work is "next".
8. Unit, data-scoping and e2e specs cover the status filter, the estimate conversion, the confirmed-minutes subtraction, the flagging matrix, the unattributed total, the ordering (the comparator, including the overdue-last and the `createdAt` tie-break), the civil-date conversion, the ownership scoping and the uniform 401/404 behaviour.

## Tests to add / update

- `apps/api/src/domain/study-planning/remaining-work.spec.ts` (new) — the pure-domain unit tests:
  - the estimate → minutes conversion, including a fractional estimate (rounding) and a zero/negative estimate (treated as missing);
  - the status filter (`PENDING`/`IN_PROGRESS` in; `COMPLETED`/`SUBMITTED`/`GRADED` out);
  - the flagging matrix (no estimate; no due date; neither → `MISSING_ESTIMATE`; a valid assignment → not flagged);
  - the remaining-work arithmetic, including `confirmedMinutes > estimatedMinutes` → `remainingMinutes: 0` (never negative).
- `apps/api/src/domain/study-planning/ordering.spec.ts` (new) — **the shared comparator** (D06-22): on-time before overdue before undated; due date ascending inside a group; priority descending; `createdAt` ascending; `id` ascending last — and the total order (no two distinct assignments compare equal).
- `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify) — the remaining-work read against a mocked Prisma service:
  - the items are built from the assignments and the aggregated confirmed minutes;
  - the aggregation queries `StudySession` with the authenticated `userId` in the `where` clause;
  - in state A, the total confirmed minutes land in `unattributedConfirmedMinutes` and no item carries confirmed minutes;
  - `Assignment.actualHours` is never selected or read (assert the query's `select` shape).
- `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify) — the remaining-work read carries the `userId`; a second student's assignment and session are both invisible; the projection never exposes `userId`.
- `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify) — HTTP level: 200 with the `{ items, unattributedConfirmedMinutes }` shape; the unfinished-only filter over a seeded mix of assignment statuses; a seeded session contributes to `unattributedConfirmedMinutes`; the items' order follows the comparator; 401 unauthenticated.

## Technical notes

### Verified baseline (inspected 2026-10-30 at HEAD `9b1ec19`)

- `apps/api/prisma/schema.prisma:187-210` — `Assignment`: `estimatedHours Float?`, `actualHours Float?`, `dueDate DateTime?`, `status AssignmentStatus`, `priority AssignmentPriority`, `courseId String?`.
- `apps/api/prisma/schema.prisma:212-218` — `enum AssignmentStatus { PENDING, IN_PROGRESS, COMPLETED, SUBMITTED, GRADED }`.
- `apps/api/prisma/schema.prisma:276-290` — `StudySession`: `userId`, `startTime DateTime`, `endTime DateTime` (**both required**), `durationMinutes Int @default(0)`, `notes`, `isFocusMode`, `rating` — **no `assignmentId`, no `status`**. `durationMinutes` carries the schema comment "Calculated" and is never written by any API today.
- **No API writes `StudySession`.** A repo-wide search finds `studySession.create` only in `apps/api/src/modules/calendar/calendar-data-scoping.spec.ts:52` and `apps/api/src/modules/calendar/calendar-e2e.spec.ts:108` — calendar test fixtures. There is no `study-sessions` module in `apps/api/src/modules/`.
- `apps/api/src/modules/assignments/` — the assignments API rejects `actualHours` as a lifecycle field on `PATCH /assignments` (EP07's D07-2 records this), so `actualHours` is not a live source of confirmed time.
- `apps/api/src/common/ownership/ownership.ts:37-62` — `ownedWhere`, `assertOwned`, `assertAffected`, `RESOURCE_NOT_FOUND`.
- `apps/api/src/modules/availability/availability.service.ts:35-45` — the projection precedent (never expose `userId`).

### Implementation notes (concrete)

1. **The domain function.** `apps/api/src/domain/study-planning/remaining-work.ts` exports a pure `classifyAssignments(assignments: AssignmentFacts[], confirmedByAssignment: Map<string, number>): { schedulable: SchedulableAssignment[]; flagged: FlaggedAssignment[] }`, where `AssignmentFacts` is `{ id, title, courseCode, dueDate: string | null, estimatedHours: number | null, status, priority, createdAt }`. **`dueDate` is the profile zone's civil date** (`YYYY-MM-DD`), not an instant (D06-24): the service converts the stored `DateTime` once, with the calendar's `zoneDateParts` arithmetic (`apps/api/src/modules/calendar/calendar.service.ts:47-66`), before calling the domain — so the domain stays zone-free and an assignment due `2026-11-01T00:30:00Z` is **31 October** for a student in `America/New_York`. The function returns the two lists the rest of EP06 uses: `schedulable` feeds the engine (EP06C); `flagged` is reported (AC-E06-09). The function takes the confirmed minutes as an **input** — it never reads a database — so it is fully unit-testable and reusable by EP08.
2. **The service's aggregation (state A).**
   ```ts
   const sessions = await this.prisma.studySession.findMany({
     where: { userId },                                   // ownership-scoped
     select: { id: true, durationMinutes: true },
   });
   const unattributedConfirmedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
   ```
   In state A every session is unattributed (there is no assignment link to attribute it by), so `confirmedByAssignment` is empty and every item's `confirmedMinutes` is `0`.
3. **The upgrade when EP07A lands (seam V-07-3, D06-7).** The aggregation's `select` becomes `{ id: true, durationMinutes: true, assignmentId: true, status: true }`, the rows are filtered to `status === 'COMPLETED'` (a session that is still `ACTIVE`/`PAUSED` is not confirmed time, and its `durationMinutes` is `0` anyway per EP07's D07-7), and the rows are grouped by `assignmentId`; rows with a null `assignmentId` stay in `unattributedConfirmedMinutes`. This is a **named, mechanical change in this file** — it is not a new story, and it is not a blocker for EP06's implementation (the value it changes is `0` in both states until EP07A creates sessions).
4. **The endpoint.** `GET /study-plans/remaining-work` on the module this story extends. The controller reads the principal with `@CurrentUser()`; the service re-runs the DTO rules for non-HTTP callers (there is no input, so there is nothing to re-validate — but the service still receives the principal explicitly, never from the body).
5. **Ordering — one comparator (D06-22).** The items are sorted by `compareAssignments(...)` from `apps/api/src/domain/study-planning/ordering.ts`: **on-time assignments first** (due date ascending), then **overdue**, then **undated** (a null due date); within a group by priority descending, then `createdAt` ascending, then `id` ascending. It is the **same comparator the engine places with** (D06-9), so the read and the plan always agree on which work is "next" — the read no longer sorts overdue work first and no longer omits the `createdAt` tie-break. The comparator compares the **civil** due dates (D06-24), and "on time" means "its civil due date ≥ today's civil date in the profile zone" — so the read needs the profile zone's `today` too, which the service reads with the user's `timeZone`.
6. **The projection.** `toRemainingWorkItem(row, confirmedMinutes)` returns exactly the documented keys; `userId` is never exposed.

### Risks / open questions (none blocking)

- **The attribution gap (D06-7, V-07-3).** Until EP07A lands, the endpoint reports `confirmedMinutes: 0` per assignment even if the student has logged time. This is a schema limitation, not a calculation error: without a session→assignment link there is nothing to attribute. The alternative — allocating the student's total confirmed time across their assignments proportionally — would be invented data, and it is rejected.
- **The estimate is in hours, the plan is in minutes.** `round(estimatedHours × 60)` can lose up to 30 seconds of precision per assignment. That is immaterial at session granularity and is recorded rather than hidden.
- **A negative or zero estimate is treated as missing** rather than as "no work left". Treating it as "no work left" would silently drop an assignment whose estimate was entered wrongly — the opposite of AC-E06-09 (D06-25).

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is handled — the endpoint takes no input; the service's DTO re-validation is in place for the module's other routes (EP06A/EP06D).
3. Academic data is scoped to the authenticated student — the assignment read and the session aggregation both carry the `userId`, and a second student's assignments and sessions are invisible.
4. API errors are actionable — the endpoint's 401 comes from the global guard; the 404 for a foreign id is the uniform `Resource not found`.
5. Not applicable — no frontend async states in this story (the read's states are EP06G's).
6. Not applicable — no UI in this story.
7. Not applicable — no UI in this story.
8. Business rules have automated tests — the domain unit tests (the status filter, the conversion, the flagging matrix, the arithmetic), the service unit tests (the aggregation), the data-scoping spec and the e2e spec.
9. API changes are documented — the endpoint and the `RemainingWorkItem` payload live in the parent README's shared API/data contract section; the two-state behaviour and its upgrade are recorded there (D06-7) and in seam V-07-3.
10. Integrated review — the combined EP06 parent review.
11. Reviewer walkthrough — the combined EP06 parent review.

## Tracker reference

Jira key: Pending creation. No sync was authorized for this planning task. (If the key is later created, tracker reconciliation is a planner/jira-sync action — this file stays the source of truth.)

## Sizing

- **Outcome:** every unfinished assignment has one authoritative remaining-work figure — estimate minus confirmed study time — with the assignments that cannot be scheduled flagged and explained, exposed through one ownership-scoped read.

- **Request/token estimate:** 1–2 requests/tokens — one pure classification module with its unit tests, one ownership-scoped aggregation in the existing service, one read endpoint, and the additions to three spec files. The uncertainty is in the two-state aggregation (state A now, the state-B upgrade later) and in the flagging matrix, which the unit tests pin.
- **Model recommendation:** 3 — the arithmetic is trivial, but the flagging rules, the status filter and the two-state aggregation are the places where a plausible mistake produces a wrong remaining-work number rather than a visible failure. A capable mid-tier model is appropriate.
- **Files:**
  - `apps/api/src/domain/study-planning/remaining-work.ts` (new);
  - `apps/api/src/domain/study-planning/remaining-work.spec.ts` (new);
  - `apps/api/src/domain/study-planning/ordering.ts` (new — **the shared comparator**, D06-22);
  - `apps/api/src/domain/study-planning/ordering.spec.ts` (new);
  - `apps/api/src/modules/study-plans/study-plans.service.ts` (modify — the aggregation, the civil-date conversion and the remaining-work read);
  - `apps/api/src/modules/study-plans/study-plans.controller.ts` (modify — the route);
  - `apps/api/src/modules/study-plans/study-plans.service.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-data-scoping.spec.ts` (modify);
  - `apps/api/src/modules/study-plans/study-plans-e2e.spec.ts` (modify).
- **Start context:** this story file; the parent README's shared API/data contract → *Endpoints*, *Rules* 3–5, the `RemainingWorkItem` payload, *The window, the dates and the time representation* and the *Cross-epic seams* row for V-07-3; the decision register (D06-1, D06-6, D06-7, D06-17, D06-22, D06-24, D06-25); EP06A's story file (the domain folder and the module it creates); `apps/api/prisma/schema.prisma:187-210` and `:276-290`; `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/calendar/calendar.service.ts:47-66` (the civil-date conversion). Do not read unrelated epic stories.
- **Verification:** `pnpm --filter api test -- study-plans` (the unit, data-scoping and e2e specs); `pnpm --filter api test -- remaining-work` (the domain unit tests); `pnpm --filter api test -- ordering` (the comparator's unit tests); `pnpm --filter api test` (the full API suite); `pnpm --filter api typecheck`; `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP06A implemented; EP03 complete. Excludes the engine (EP06C), the plan persistence and the plan API (EP06D), all frontend work (EP06G), any change to the `StudySession` schema (EP07A's), consuming EP07B's confirmed-time endpoint, and writing `Assignment.actualHours`.

## UI/UX gaps for the `ui-refiner`

None — this is a backend story (no user-facing surface). The remaining-work **surface** is EP06G's and needs its own `ui-refiner` pass; the row design and the flagged marker are part of that pass.
