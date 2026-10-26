# SP-121A: Assignment Status API

**Story ID:** SP-121A
**Title:** Backend: `PATCH /assignments/:id` accepts `status`
**Parent:** [SP-121](./SP-121-completion-and-status-tracking.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready
**Dependencies:** SP-113A, SP-114D, SP-115G implemented (all reviewed 2026-10-24/25). SP-120 is implemented but is not a dependency (its open review findings are execution evidence, no code defect). No open blocker.
**Jira key:** Pending creation

## Summary

`PATCH /assignments/:id` accepts `status` — the closed five-value
`AssignmentStatus` enum — so a student can move an assignment through its
lifecycle (Pending → In progress → Completed → Submitted → Graded).
Create stays unchanged: a new assignment always starts `PENDING` (D121-1).
No migration — the column and enum already exist.

## Bounded scope

In: the `status` field on `UpdateAssignmentDto`, the service merge line
and `has()`/merged-validation updates, the controller doc-comment update,
and the test updates those changes force — including retiring the four
update-path rejection cases that D121-2 supersedes (unit ×2, data-scoping
×1, e2e ×1) and adding acceptance coverage.

Out: the status control and the unfinished-only view
([SP-121B](./SP-121B-assignment-status-ui.md)). Status on create (D121-1).
`actualHours` (stays rejected, D114-2 — time tracking is EP07). Overdue
identification and completed/overdue views (story 7). Search/sort/filters
(story 6). Any change to `GET /courses/:id` (D121-5 — the projection is
unchanged).

## Source requirement references

- **AC-E03-04** — "Students can update assignment status." This child
  owns the API half: accept, validate, and store the transition.
- **AC-E03-05** — "Completing an assignment removes it from
  unfinished-work views without deleting it." This child owns the
  transition half: a status change is a PATCH — no delete path is
  involved, and the record persists. The view half is SP-121B; the
  completed view is story 7.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1–4, 8, and 9. Items 5–7 and 10 are the frontend child's. Item 11
  is the final reviewer walkthrough for the parent, not this child's
  deliverable.
- Contract and D121-1…3 in the [SP-121 README](./README.md).

## Acceptance criteria

1. **Accept.** `PATCH /assignments/:id` with `status` set to any of
   `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SUBMITTED`, `GRADED` → 200, and
   the 11-key projection's `status` reflects the new value; the stored row
   is updated.
2. **Null semantics.** Omitted or explicit `null` keeps the stored status
   (D121-3). A status-only body satisfies "at least one field"; an empty
   body still 400s with "At least one field must be provided".
3. **Invalid values.** Any other JSON value — `DONE`, `completed`
   (lowercase), `1`, `true` — → 400 with a field-level `errors.status` and
   no query or write after validation fails. Validation runs on the merged
   values (the D114-1 pattern).
4. **Create unchanged.** `POST /assignments` with `status` → 400 unknown
   field (D121-1); the created row is `PENDING`.
5. **Ownership.** A missing, foreign, or malformed assignment id → the
   uniform 404 `Resource not found`; the target's status is unchanged. The
   write stays scoped `ownedWhere(userId, id)` with the P2025 → uniform-404
   normalization.
6. **Locked fields stay locked.** `actualHours`, `courseId`, and `userId`
   remain rejected unknown fields on update (400), alone or combined with
   a valid `status`.
7. **Projection unchanged.** `GET /courses/:id` still returns assignments
   of every status with the same 11 keys plus `subtasks`, ordered
   `dueDate` asc (nulls last), then `title` asc (D121-5). The existing
   key-list assertions hold unmodified.

## Tests

Update the cases that encode today's rejection, then add acceptance
coverage. The create-path rejection cases stay (D121-1).

- **Unit** (`assignments.service.spec.ts`):
  - Remove `['status', 'COMPLETED']` from the update-path service-level
    "rejects unknown %s=%p…" `it.each` (~line 349) and from the
    update-path pipe-level "rejects %s=%p at pipe level" `it.each`
    (~line 480). The create-path `it.each` (~line 183) keeps it.
  - Add: each of the five values patches successfully (200, the projection
    `status` matches, the stored row is updated); `status: null` keeps
    the stored value; a status-only body is accepted; invalid values
    (`DONE`, `completed`, `1`, `true`) → field-level 400 with no
    `findFirst`/`update` call; `status` + `actualHours` together → 400 on
    `actualHours`, no write.
  - Add: the merged-value re-check covers `status` (a valid status patch
    keeps the stored title, so the merged DTO re-check passes).
- **Data scoping** (`assignments-data-scoping.spec.ts`):
  - Remove `['status', 'COMPLETED']` from the unknown-fields loop in
    "PATCH '' clears the stored description; empty body and unknown fields
    400 without writes" (~line 268). The create-path `it.each` (~line
    205) keeps it.
  - Add: student B PATCHes student A's assignment with
    `status: "COMPLETED"` → uniform 404; A's row is unchanged (a body
    value never bypasses ownership — the line-610 subtask precedent).
  - Add: a `PATCH { status: "GRADED" }` round-trip persists (read the row
    back: `status` stays `"GRADED"`).
- **E2E** (`assignments-e2e.spec.ts`):
  - Remove `['status', 'COMPLETED']` from the update-path "rejects
    invalid edit %s=%p…" `it.each` (~line 418). The create-path `it.each`
    (~line 211) keeps it.
  - Add: full round-trip — create (PENDING) → PATCH
    `status: "IN_PROGRESS"` → PATCH `status: "COMPLETED"` → the 200
    projections match each step; read back from `GET /courses/:id` — the
    assignment is still present with the final status and the unchanged
    key set (D121-5).
  - Add: `PATCH { status: "SUBMITTED" }` on a foreign id → uniform 404.
- **Negative:** as listed — no write on any rejected request; the
  projection key list is unchanged.

E2E and data-scoping self-skip without `DATABASE_URL`. Do not claim them
passed when skipped.

## Technical notes

### Inspected paths (2026-10-26)

- `apps/api/prisma/schema.prisma` — `Assignment.status`
  `AssignmentStatus @default(PENDING)` (198); enum `AssignmentStatus`
  (212–218): five values. **No migration.**
- `apps/api/src/modules/assignments/dto/update-assignment.dto.ts` — the
  whitelist: title, description, dueDate, estimatedHours, priority, type.
  Add `status` with `@IsOptional() @IsIn([...five values])` and the
  `'…' | null` union type, mirroring `priority`/`type`. The class comment
  ("unknown fields — `status`, `actualHours`, `courseId`, `userId`") must
  be updated.
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` —
  unchanged (D121-1).
- `apps/api/src/modules/assignments/assignments.service.ts` — `update()`
  (120–207): add `status` to the `has()` non-empty check, the merged
  object, and the `data` write; extend the `data` type union. The method
  doc comment's unknown-fields list must drop `status`.
- `apps/api/src/modules/assignments/assignments.controller.ts` — the
  PATCH doc comment (~42–51) lists the accepted fields; add `status`.
- `apps/api/src/modules/courses/courses.service.ts` — `get()` and
  `toAssignmentResponse`: unchanged (D121-5).
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere` /
  `RESOURCE_NOT_FOUND`. `Assignment` is already in the user-scoped model
  list.
- `apps/api/src/common/pipes/validation.pipe.ts` — global whitelist +
  `forbidNonWhitelisted`.
- Tests: `assignments.service.spec.ts` (1050 lines),
  `assignments-data-scoping.spec.ts` (653), `assignments-e2e.spec.ts`
  (517) — the named cases above. The generated Prisma client import is
  `apps/api/src/generated/prisma/client`; no regeneration is needed (no
  schema change).

### Contract notes

Follow the [SP-121 README](./README.md) contract. The `status` DTO field
mirrors `priority`/`type`: `@IsOptional() @IsIn([...])`, a `| null`
union, keep-on-null via the service's `has()` (D121-3). Merged-value
validation is unchanged in shape — the merged object gains
`status: has(dto.status) ? dto.status! : existing.status`.

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D121-1 | Status is PATCH-only; create starts PENDING. | Existing create default + the D120-4 precedent. |
| D121-2 | PATCH accepts the full five-value enum. | Closed schema enum; the UI already renders all five labels. |
| D121-3 | Null/omit keeps the stored status; status-only is non-empty. | The D114-5 / D115-3 pattern. |

## Definition of Done

- The seven acceptance criteria pass.
- Invalid input is a field-level 400; nothing is written (DoD 2, 4).
- Every read/write is scoped by the authenticated `userId`; cross-student
  access stays a uniform 404 (DoD 3).
- Automated tests cover the transition, the five values, null semantics,
  the retired rejection cases, and the ownership counterexamples (DoD 8).
- The contract in the SP-121 README is the API documentation (DoD 9). No
  migration.
- Loading, empty, keyboard, responsive, and integrated browser review are
  not this child. Do not mark the parent reviewed.

## Sizing

- **Outcome:** The API accepts, validates, and stores an assignment
  status transition (five-value lifecycle enum) on PATCH, with create
  unchanged and every rejection case updated to match.
- **Time estimate:** 1–1.5 hours, including the DTO field, the service
  merge, the controller/doc-comment updates, and the forced test updates
  across three spec files. Uncertainty is the number of rejection cases to
  retire (four), not the transition logic.
- **Files:** `apps/api/src/modules/assignments/dto/update-assignment.dto.ts`;
  `assignments.service.ts`; `assignments.controller.ts` (doc comment);
  `assignments.service.spec.ts`; `assignments-data-scoping.spec.ts`;
  `assignments-e2e.spec.ts`. No new production module, no migration, no
  create-DTO change.
- **Start context:** this file, AC-E03-04 and the AC-E03-05 transition
  half, the SP-121 README contract and D121-1…3, and the inspected paths
  above. Do not read stories 6–7.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts` passes without a database. With `DATABASE_URL`, `pnpm --filter @studypilot/api exec jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts` passes and is not skipped. Then `pnpm --filter @studypilot/api typecheck`. Pass means the new status cases pass, the retired rejection cases are gone, and the unchanged key-list assertions hold.
- **Dependencies / exclusions:** Requires the reviewed
  SP-113/SP-114/SP-115 assignments API. Excludes the UI
  ([SP-121B](./SP-121B-assignment-status-ui.md)), status on create
  (D121-1), and stories 6–7. Every excluded epic AC stays owned in the
  [EP03 README](../README.md).
