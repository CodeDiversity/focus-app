# SP-122A: Assignment List API

**Story ID:** SP-122A
**Title:** Backend: `GET /assignments` with filters, search, and sort
**Parent:** [SP-122](./SP-122-assignment-search-sorting-and-filters.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready (planning complete 2026-10-26)
**Dependencies:** SP-113A, SP-114D, SP-115G, SP-120I, SP-121A implemented (all reviewed). No open blocker.
**Jira key:** Pending creation

## Summary

Add the first top-level read route on the assignments resource:
`GET /assignments`, returning the authenticated student's assignments across
courses, filtered by `courseId`, `status`, `priority`, `type`, `dueFrom`/`dueTo`,
and `q`, and ordered by `sort`/`order`. Each row carries its course context and
its subtasks. No schema change.

## Bounded scope

In: the `GET /assignments` controller handler, a `ListAssignmentsQueryDto`,
the `AssignmentsService.list(userId, query)` method (filtering, search, sort,
course-context join, subtask projection), and the unit + data-scoping coverage.

Out: the list page and controls ([SP-122B](./SP-122B-assignment-list-ui.md)).
The cross-layer proof ([SP-122C](./SP-122C-assignment-list-integration.md)).
`POST`/`PATCH`/`DELETE /assignments` and the subtask routes (unchanged). The
course-detail projection (unchanged, D122-1). Pagination (deferred, D122-7).
Overdue/completed views (story 7).

## Source requirement references

- **AC-E03-07** — "Assignment lists support course, date, and status
  filtering." This child owns the API half: the endpoint and the `courseId`,
  `dueFrom`/`dueTo`, and `status` filters (plus `priority`, `type`, `q`,
  sort/order).
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1–4, 8, and 9. Items 5–7 and 10 are the frontend/integration children's.
  Item 11 is the final reviewer walkthrough for the parent.
- Contract and D122-1…7 in the [SP-122 README](./README.md).

## Acceptance criteria

1. **List.** `GET /assignments` → 200 and an array of `AssignmentListItem`
   (the 11 assignment keys + `course` + `subtasks`), scoped to the
   authenticated student. Empty result → `[]` with 200.
2. **Course filter.** `?courseId=<id>` returns only that course's
   assignments. A missing/foreign/malformed `courseId` → uniform 404
   `Resource not found` with no list query executed. An omitted `courseId`
   returns assignments across all courses (including course-less ones).
3. **Status filter.** `?status=<enum>` returns only assignments with that
   status. An invalid value → 400 field error on `status`.
4. **Priority/type filters.** `?priority=<enum>` and `?type=<enum>` filter
   likewise; invalid values → 400.
5. **Date range.** `?dueFrom`/`?dueTo` (ISO datetimes) apply inclusive
   bounds to `dueDate`. Rows with a null `dueDate` are excluded whenever
   either bound is present. An invalid ISO value → 400.
6. **Search.** `?q=<text>` returns rows whose `title` (or `description`)
   contains the text, case-insensitively. Whitespace-only/empty `q` is
   treated as absent. Over-long `q` (> 200) → 400.
7. **Sort.** `?sort`/`?order` select the ordering. Unknown values → 400. The
   default is `dueDate asc` (nulls last), then `title asc`, then `id asc`.
   Every supported sort is stable and deterministic.
8. **Ownership.** The response contains only rows whose `userId` is the
   principal. No query parameter can override or widen the scope
   (`userId` is not a query field → 400 unknown param).
9. **Unknown params.** Any query parameter not in the contract → 400 field
   error. No write occurs.
10. **Auth.** Unauthenticated → 401 (global guard).
11. **Projection.** Each item's key set is exactly the contract's
    `AssignmentListItem` keys; `course` is `{ id, name, code, color } | null`;
    `subtasks` is the 6-key projection ordered `orderIndex asc, createdAt asc`.
12. **No regression.** `POST`/`PATCH`/`DELETE /assignments`, the subtask
    routes, and `GET /courses/:id` (projection + ordering) are unchanged.

## Tests

- **Unit** (`assignments.service.spec.ts`):
  - `list()` returns only the principal's rows; filters (courseId, status,
    priority, type, dueFrom, dueTo, q) each narrow the result; invalid
    combinations are rejected at the DTO layer (controller-level).
  - Sort/order variants produce the documented ordering, including nulls-last
    for `dueDate asc` and the `title`/`id` tie-break.
  - `course` is joined from the course row (null for course-less assignments);
    `subtasks` are the 6-key projection in order.
  - Search is case-insensitive on title and description; empty/whitespace `q`
    is a no-op.
- **Data scoping** (`assignments-data-scoping.spec.ts`):
  - Student B's `GET /assignments` (with and without filters) never contains
    A's rows.
  - `?courseId=<A's course>` by B → uniform 404; B's data unchanged.
  - `?userId=<anything>` → 400 unknown param; no read leak.
  - Cross-student rows remain invisible even when filters match their values.
- **Negative:** as listed — invalid enums/dates/sort/order/q-length/unknown
  params → 400; foreign courseId → 404; unauthenticated → 401.
- E2E and data-scoping self-skip without `DATABASE_URL`. Do not claim them
  passed when skipped.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/api/src/modules/assignments/assignments.controller.ts` — no `@Get()`
  handler; add one. The existing `@Get(':id/subtasks')` stays.
- `apps/api/src/modules/assignments/assignments.service.ts` — add `list()`.
  Reuse `ownedWhere`, `toAssignmentResponse` (extend for course + subtasks),
  and the Prisma `task.findMany` ordering precedent (D120-7).
- `apps/api/src/modules/assignments/dto/` — add `list-assignments-query.dto.ts`
  (or `list-assignments.dto.ts`). Mirror the enum validators on
  `priority`/`type`/`status`; date validators mirror `dueDate`; `q` is
  `@IsOptional @IsString @MaxLength(200)`; `sort`/`order` are `@IsIn`.
- `apps/api/src/modules/courses/courses.service.ts` — `get()` projection is
  the reference for ordering and the `subtasks` shape. The list endpoint may
  either join `course` in the assignment query or batch-load courses; prefer a
  single Prisma query with `include: { course: { select: { id, name, code, color } }, tasks: { orderBy: [...], select: {...} } }` scoped by `userId`.
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere`, `RESOURCE_NOT_FOUND`.
- `apps/api/prisma/schema.prisma` — `Assignment` (courseId nullable), `Course`
  (name, code, color), `Task` (orderIndex, status).
- Tests: `assignments.service.spec.ts`, `assignments-data-scoping.spec.ts`,
  `assignments-e2e.spec.ts` (pattern); a new e2e describe is C's.

### Contract notes

Follow the [SP-122 README](./README.md) contract exactly. The query DTO
must be a class (not an interface) so the global `FieldValidationPipe`
applies whitelist + `forbidNonWhitelisted` + transform. `dueFrom`/`dueTo`
use the same `@IsISO8601({ strict: true, strictSeparator: true })` +
`@Matches(/T\d{2}:\d{2}/)` + `persistableDatetime` `@ValidateBy` as
`dueDate` (D113-5). `q` is trimmed in the service (validation does not
trim). `courseId` is a plain string; ownership is checked in the service
before any assignment query, so a malformed id never reaches Prisma as a
filter.

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D122-1 | Top-level `GET /assignments`; no `GET /assignments/:id`. | D113-2 precedent; rows route to course detail. |
| D122-2 | All filter params optional and AND-combined; unknown params → 400. | AC-E03-07 + whitelist convention. |
| D122-3 | Inclusive date bounds; null `dueDate` excluded when a bound is present. | Nullable dueDate (D113-1). |
| D122-4 | Case-insensitive substring on title + description. | Cheap and useful. |
| D122-5 | Single sort key + documented tie-break; enum-string ordering for priority/status. | Keeps the contract simple. |
| D122-6 | Item projection adds `course` and `subtasks`. | Reuses existing projections. |
| D122-7 | No pagination. | Deferred to EP05. |

## Definition of Done

- The twelve acceptance criteria pass.
- Invalid input is a field-level 400; nothing is written and no list query
  runs on a foreign `courseId` (DoD 2, 4).
- Every read is scoped by the authenticated `userId`; cross-student access
  stays a uniform 404 (DoD 3).
- Automated tests cover the filters, sort/order, search, projection, and the
  ownership counterexamples (DoD 8).
- The contract in the SP-122 README is the API documentation (DoD 9). No
  migration.
- Loading, empty, keyboard, responsive, and integrated browser review are not
  this child. Do not mark the parent reviewed.

## Sizing

- **Outcome:** A principal-scoped `GET /assignments` endpoint with course,
  status, priority, type, date-range, and text filters, configurable sort/order,
  and a course-context + subtask projection, plus unit and data-scoping coverage.
- **Time estimate:** 2–2.5 hours, including the DTO, the service method, the
  controller handler, and the forced test updates. Uncertainty is the Prisma
  `include` shape and the nulls-last ordering, not the filter logic.
- **Files:** `apps/api/src/modules/assignments/assignments.controller.ts`;
  `assignments.service.ts`; new `dto/list-assignments-query.dto.ts`; unit and
  data-scoping spec files. No migration, no module registration change.
- **Start context:** this file, the SP-122 README contract and D122-1…7, and
  the inspected paths above. Do not read story 7.
- **Verification:** `pnpm --filter @studypilot/api exec tsc --noEmit` (or the
  project's typecheck script) passes. Without `DATABASE_URL`,
  `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts`
  passes and is not skipped. With `DATABASE_URL`,
  `pnpm --filter @studypilot/api exec jest --runInBand assignments-data-scoping.spec.ts`
  passes and is not skipped. Pass means the filter/sort/search cases and the
  ownership counterexamples pass and the projection key-list assertion holds.
- **Dependencies / exclusions:** Requires the reviewed SP-113/SP-114/SP-115/
  SP-120/SP-121 assignments API. Excludes the UI
  ([SP-122B](./SP-122B-assignment-list-ui.md)), the integration proof
  ([SP-122C](./SP-122C-assignment-list-integration.md)), pagination (D122-7),
  and story 7. Every excluded epic AC stays owned in the
  [EP03 README](../README.md).