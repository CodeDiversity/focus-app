# SP-120I: Subtask API

**Story ID:** SP-120I
**Title:** Backend: nested subtask routes under assignments + course-detail projection
**Parent:** [SP-120](./SP-120-assignment-subtasks.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Implemented — awaiting parent review (2026-10-25); artifact: `./artifacts/SP-120I/implementation.md`
**Dependencies:** SP-113A, SP-114D, SP-115G implemented (all reviewed 2026-10-24/25). No open blocker.
**Jira key:** Pending creation

## Summary

Add a nested subtask API under assignments. A student can list, create,
update (title, completion status, order), and delete the ordered subtasks
of their own assignment. The course-detail projection gains the subtasks
so the existing one-fetch pattern (D112B-13) carries them. Subtasks are
the existing `Task` rows linked by `assignmentId` (D120-1 — no migration).

## Bounded scope

In: four nested routes in the assignments module (`GET/POST
/assignments/:id/subtasks`, `PATCH/DELETE /assignments/:id/subtasks/:subtaskId`),
two DTOs, service methods with ownership gates, the `GET /courses/:id`
projection change, and the tests those changes force (unit, data-scoping,
e2e, course projection key assertions).

Out: the subtask checklist UI ([SP-120J](./SP-120J-subtask-ui.md)).
Standalone tasks (no assignment). Subtask descriptions, due dates,
estimated/actual minutes, priority (D120-3). Status values beyond
PENDING/COMPLETED (D120-4). Orphaned-subtask surfacing (D120-6).

## Source requirement references

- **AC-E03-03** — "Assignments can contain ordered, independently
  completable subtasks." This child owns the API half: ordered list,
  create, toggle completion, reorder, delete.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1–4, 8, and 9. Items 5–7 and 10 are the frontend child's. Item 11 is
  the final reviewer walkthrough for the parent, not this child's deliverable.
- Contract and D120-1…8 in the [SP-120 README](./README.md).

## Acceptance criteria

1. **Routes.** The assignments controller exposes `GET
   /assignments/:id/subtasks` (200, ordered list), `POST
   /assignments/:id/subtasks` (201), `PATCH
   /assignments/:id/subtasks/:subtaskId` (200), `DELETE
   /assignments/:id/subtasks/:subtaskId` (204). All require auth (global
   APP_GUARD).
2. **Ownership.** Every route first verifies the assignment belongs to the
   requesting student (`ownedWhere(userId, id)` → uniform 404). Subtask
   reads/writes additionally scope by `userId` and `assignmentId`. A
   missing/foreign/malformed assignment id, a missing/foreign subtask id,
   or a subtask belonging to a different assignment → the same uniform 404
   `Resource not found`. No existence oracle.
3. **Create.** `POST` accepts `title` (required, non-whitespace, ≤ 200)
   and optional `orderIndex` (integer ≥ 0). Omitted `orderIndex` appends at
   the end (max existing + 1, or 0 for the first subtask). Unknown fields
   (description, dueDate, estimatedMinutes, actualMinutes, priority,
   status, userId, assignmentId) → 400. 201 returns the 6-key Subtask
   projection.
4. **Update.** `PATCH` accepts `title`, `status` (`PENDING` | `COMPLETED`
   only, D120-4), `orderIndex` (integer ≥ 0) — partial merge, at least one
   field (empty body → 400), validation on merged values. Unknown fields →
   400. 200 returns the 6-key Subtask projection.
5. **Delete.** `DELETE` removes the subtask (scoped by userId +
   assignmentId). 204 No Content. The assignment is untouched.
6. **Course projection.** `GET /courses/:id` assignments gain `subtasks:
   Subtask[]` (6-key projections, ordered `orderIndex` asc, then
   `createdAt` asc). The assignment's other 11 keys are unchanged. An
   assignment with no subtasks returns `subtasks: []`.

## Tests

- **Unit** (`assignments.service.spec.ts` or a new `subtasks.service.spec.ts`):
  create appends at end; create with explicit orderIndex; create
  validation (empty title, > 200, numeric title, unknown fields); list
  ordering; patch title/status/orderIndex; patch empty body → 400; patch
  merged-value validation; delete; ownership gates (cross-student
  assignment, cross-student subtask, subtask from a different assignment).
- **Course projection** (`courses.service.spec.ts`): assignment fixtures
  include `tasks`; the detail expectation includes `subtasks`; an
  assignment with no tasks asserts `subtasks: []`; key assertions (6-key
  subtask shape, no userId/assignmentId).
- **Data scoping** (`assignments-data-scoping.spec.ts`): cross-student
  assignment id on every route → uniform 404; cross-student subtask id →
  uniform 404; subtask belonging to a different assignment → uniform 404;
  the target row is unchanged.
- **E2E** (`assignments-e2e.spec.ts` or a new `subtasks-e2e.spec.ts`):
  full round-trip — create subtasks, list ordered, toggle status, reorder,
  delete; read back from `GET /courses/:id` with the `subtasks` key;
  cross-student matrix; 400/404/401 cases. These e2e extensions are this
  child's tests, not a separate story.
- **Negative:** numeric title, empty string title, `status: "ARCHIVED"`,
  `priority: "HIGH"`, forged `userId`, forged `assignmentId` → 400 or 404
  as the rules require, with no write on the rejected request.

E2E and data-scoping self-skip without `DATABASE_URL`. Do not claim them
passed when skipped.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/api/prisma/schema.prisma` — `Task` model (237–257):
  `assignmentId String?` relation (Prisma default `SetNull`),
  `orderIndex Int @default(0)`, `status TaskStatus @default(PENDING)`,
  `priority TaskPriority @default(MEDIUM)`. Enums `TaskStatus` (259–264),
  `TaskPriority` (266–270). **No migration needed** (D120-1).
- `apps/api/src/modules/assignments/assignments.controller.ts` —
  POST/PATCH/DELETE `/assignments`. Add the four nested routes here
  (D120-8).
- `apps/api/src/modules/assignments/assignments.service.ts` —
  create/update/delete + 11-key `toAssignmentResponse`. Add subtask methods
  + 6-key `toSubtaskResponse`. The delete method already documents D114-4
  (SetNull).
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` /
  `update-assignment.dto.ts` — the DTO validation pattern (`@Transform`,
  `@IsString`, `@Matches`, `@MaxLength`, `@IsOptional`, `@IsIn`,
  `@IsNumber`, `@IsPositive`, `@Max`). New `CreateSubtaskDto` /
  `UpdateSubtaskDto` follow it.
- `apps/api/src/modules/courses/courses.service.ts` — `get()` (265–282)
  includes `assignments: { where: { userId }, orderBy: [...] }`. Add
  `tasks: { where: { userId }, orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] }`
  to the include, and map `subtasks` in the response. Update `AssignmentRow`
  type and `toAssignmentResponse` (lines 43–77).
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere` /
  `RESOURCE_NOT_FOUND`. `Task` is in the user-scoped model list (line 26).
- `apps/api/src/common/pipes/validation.pipe.ts` — global whitelist +
  `forbidNonWhitelisted`.
- Tests: `assignments.service.spec.ts`, `assignments-data-scoping.spec.ts`,
  `assignments-e2e.spec.ts`, `courses.service.spec.ts`,
  `courses-meetings-e2e.spec.ts` — key-list assertions to update.
- Generated client import is `apps/api/src/generated/prisma/client`. No
  regeneration needed (no schema change).

### Contract notes

Follow the [SP-120 README](./README.md) contract. `title` rules mirror the
assignment title (D113-5). `status` is `@IsIn(['PENDING', 'COMPLETED'])`
(D120-4). `orderIndex` is `@IsInt() @Min(0)`. Create with omitted
`orderIndex` → `max(orderIndex) + 1` over the assignment's subtasks (or 0).
Update is a partial merge with merged-value validation (the D114-1
pattern). Every route verifies the assignment first, then scopes subtasks
by `{ userId, assignmentId }`.

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D120-1 | Use the existing `Task` model — no migration. | The relation exists; D114-4 decided the orphan behavior; the code calls them subtasks. |
| D120-2 | Nested under `/assignments/:id/subtasks`. | The D112-2 meetings precedent. |
| D120-3 | 6-key projection; DTOs accept only title/status/orderIndex. | The MVP checklist needs only these. |
| D120-4 | Status: PENDING/COMPLETED only. | A checkbox needs two states. |
| D120-8 | Routes in the assignments module. | Nested routes belong to the parent resource's module. |

## Definition of Done

- The six acceptance criteria pass.
- Invalid input is a field-level 400; nothing is written (DoD 2, 4).
- Every subtask read/write is scoped by the authenticated `userId`;
  cross-student access stays a uniform 404 (DoD 3).
- Automated tests cover the routes, ordering, projection keys, and the
  ownership counterexamples (DoD 8).
- The contract in the SP-120 README is the API documentation (DoD 9). No
  migration (D120-1).
- Loading, empty, keyboard, responsive, and integrated browser review are
  not this child. Do not mark the parent reviewed.

## Sizing

- **Outcome:** An assignment's ordered subtasks can be listed, created,
  toggled, reordered, and deleted through a nested API scoped to the
  owning student, and the course-detail projection carries them.
- **Time estimate:** 2.5–3 hours, including four routes, two DTOs,
  service methods, the course projection change, and the forced key-list
  updates. Uncertainty is the number of projection key assertions, not the
  route logic.
- **Files:** `apps/api/src/modules/assignments/assignments.controller.ts`;
  `assignments.service.ts`; new `dto/create-subtask.dto.ts`; new
  `dto/update-subtask.dto.ts`; `apps/api/src/modules/courses/courses.service.ts`;
  `assignments.service.spec.ts` (or new `subtasks.service.spec.ts`);
  `assignments-data-scoping.spec.ts`; `assignments-e2e.spec.ts` (or new
  `subtasks-e2e.spec.ts`); `courses.service.spec.ts`;
  `courses-meetings-e2e.spec.ts`. No new production module, no migration.
- **Start context:** this file, AC-E03-03, the SP-120 README contract and
  D120-1…8, and the inspected paths above. Do not read stories 5–7.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts` passes without a database. With `DATABASE_URL`, `pnpm --filter @studypilot/api exec jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts courses-meetings-e2e.spec.ts` passes and is not skipped. Then `pnpm --filter @studypilot/api typecheck`. Pass means the new subtask cases pass and the updated key-list assertions hold.
- **Dependencies / exclusions:** Requires the existing assignments module
  and course projection. Excludes the UI
  ([SP-120J](./SP-120J-subtask-ui.md)) and stories 5–7. Every excluded
  epic AC stays owned in the [EP03 README](../README.md).
