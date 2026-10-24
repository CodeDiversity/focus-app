# SP-114D: Assignment Update and Delete API

**Story ID:** SP-114D
**Title:** Backend: PATCH + DELETE assignments endpoints
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Plan Ready
**Dependencies:** SP-113A (POST /assignments module + Assignment model + ownership conventions)
**Jira key:** Pending creation

## Summary

Add `PATCH /assignments/:id` and `DELETE /assignments/:id` to the existing
`AssignmentsController` / `AssignmentsService`. Both enforce student ownership
(404 uniform for missing/foreign), validate partial-update fields against the
same rules as creation (except status and actualHours), and return the updated
10-key projection on success.

## Source requirement references

- **AC-E03-01** (create) — the same assignment resource; editing/deletion extend
  the resource created by SP-113A.
- **AC-E03-02** (optional fields: due date, estimated duration, priority) — these
  fields are editable via PATCH.
- **DoD 1** (functional criteria) — update/delete behavior.
- **DoD 2** (invalid-input validation) — partial-update DTO validation.
- **DoD 3** (student data scoping) — ownership check; uniform 404.
- **DoD 4** (actionable API errors) — field-level 400, uniform 404.
- **DoD 8** (automated business-rule tests) — unit + data-scoping + e2e.
- **DoD 9** (API documentation) — contract in this README.
- **DoD 10** (integrated review) — SP-114F.

## Acceptance criteria

1. **PATCH /assignments/:id** accepts partial body `{ title?, description?, dueDate?, estimatedHours?, priority? }` and updates only the provided fields. Unknown fields (status, actualHours, courseId, userId) produce a 400 error.
2. **PATCH ownership:** The assignment must belong to the authenticated student. A missing or foreign assignment returns uniform 404 (`RESOURCE_NOT_FOUND`).
3. **PATCH response:** Returns the updated assignment as the 10-key `CourseAssignment` projection (same shape as SP-113A response).
4. **DELETE /assignments/:id** removes the assignment by ID. Ownership is enforced (uniform 404 for missing/foreign). The cascade on `Task.assignmentId` sets orphaned task `assignmentId` to NULL (Prisma default `SetNull` — tasks persist independently).
5. **DELETE response:** Returns 204 No Content (no body).
6. **Validation:** Same field rules as the create DTO (D114-1), but all fields are optional (partial update). `title` is validated only when present.
7. **Data scoping tests:** Two-student matrix (student B cannot update/delete student A's assignment; uniform 404).

## Tests

- **Unit tests** (`assignments.service.spec.ts`):
  - `PATCH` — updates provided fields, preserves unprovided fields, returns 10-key projection.
  - `PATCH` — 400 on unknown fields (status, actualHours, courseId, userId).
  - `PATCH` — 404 when assignment missing or owned by another student.
  - `DELETE` — removes the assignment, sets orphaned task `assignmentId` to NULL.
  - `DELETE` — 404 when assignment missing or owned by another student.
  - `DELETE` — 204 with no body on success.
- **Data-scoping tests** (`assignments-data-scoping.spec.ts`):
  - Two-student matrix: student B attempts PATCH/DELETE on student A's assignment → 404.
- **E2E tests** (`assignments-e2e.spec.ts` — extended by SP-114F):
  - Full HTTP round-trip for PATCH and DELETE via the test harness.

## Technical notes

### Inspected code paths (verified)

- `apps/api/src/modules/assignments/assignments.controller.ts` — currently only `@Post()` (SP-113A).
- `apps/api/src/modules/assignments/assignments.service.ts` — `create()` with DTO validation + ownership gate + `toAssignmentResponse()`.
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` — field rules for create (D113-5).
- `apps/api/prisma/schema.prisma` 187–207 — `Assignment` model: `tasks Task[]` (no `onDelete` → Prisma default `SetNull` on the optional relation).
- `apps/api/src/common/ownership/ownership.ts` — `ownedWhere`, `assertOwned`, `assertAffected`, `RESOURCE_NOT_FOUND`.
- `apps/api/src/common/validation.pipe.ts` — `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`).
- `apps/api/src/modules/assignments/assignments.module.ts` — module registration (needs PATCH/DELETE routes registered).
- `apps/api/src/modules/assignments/assignments.service.spec.ts` — existing unit test file (extend).
- `apps/api/src/modules/assignments/assignments-data-scoping.spec.ts` — existing data-scoping test file (extend).
- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — existing e2e test file (extend).

### API contract

```text
PATCH /assignments/:id
  auth: required (enforced by global APP_GUARD)
  path: { id: string (UUID) }
  body: {
    title?: string (non-whitespace, ≤ 200) — validated only when present
    description?: string (≤ 2000) — validated only when present
    dueDate?: ISO-8601 datetime string (or null/omitted) — validated only when present
    estimatedHours?: number (0 < h ≤ 1000) — validated only when present
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" — validated only when present
  }
  200 → CourseAssignment (10-key projection, same as SP-113A response)
  400 → field-level errors (only for fields present in the body)
  404 → uniform "Resource not found" — assignment missing or owned by another student
  401 → unauthenticated

DELETE /assignments/:id
  auth: required (enforced by global APP_GUARD)
  path: { id: string (UUID) }
  204 → No Content
  404 → uniform "Resource not found" — assignment missing or owned by another student
  401 → unauthenticated
```

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D114-1 | **PATCH, not PUT** — partial updates via `@Patch()` with all fields optional. The epic does not require replacing the entire assignment; students edit individual fields. | Matches the partial-update semantics of the epic; avoids requiring all fields on every update. |
| D114-2 | **`UpdateAssignmentDto` is a new DTO** (not extending `CreateAssignmentDto`). It includes the same fields (title, description, dueDate, estimatedHours, priority) but all are optional. `status`, `actualHours`, and `courseId` are excluded. | `status` is owned by story 5 (D113-3); `actualHours` is tracked by story 5; `courseId` is the association, not a property to change mid-life. A separate DTO prevents accidentally exposing lifecycle fields. |
| D114-3 | **`DELETE` returns 204 No Content** (no body). | Standard REST convention for deletion; consistent with the absence of a response body. |
| D114-4 | **Assignment deletion sets `Task.assignmentId` to NULL** (Prisma default `SetNull` on the optional relation — no explicit `onDelete` on `Assignment → Task`). Tasks persist independently (they have their own `userId`). | The model's current schema; story 4 (subtasks) will handle orphaned tasks. No migration needed. |

## Definition of Done

All applicable shared DoD (see SP-114 parent). Backend-specific:

- PATCH and DELETE endpoints registered in `AssignmentsController`.
- `UpdateAssignmentDto` created with partial validation (all fields optional, same rules as create when present).
- Service methods `update(userId, id, dto)` and `delete(userId, id)` with ownership gates.
- `toAssignmentResponse()` reused for PATCH response (10-key projection).
- Unit tests for PATCH (update fields, 400 on unknown, 404 on missing/foreign).
- Unit tests for DELETE (removal, 204, 404 on missing/foreign).
- Data-scoping tests extended for two-student matrix.
- E2E tests extended (SP-114F owns the e2e integration).

## Sizing block

- **Outcome:** `PATCH /assignments/:id` and `DELETE /assignments/:id` endpoints with DTOs, service methods, ownership, and tests.
- **Time estimate:** ~2–2.5 hours.
- **Production files:** `assignments.controller.ts` (add PATCH/DELETE), `assignments.service.ts` (add update/delete), `dto/update-assignment.dto.ts` (new), `assignments.module.ts` (register new routes).
- **Test files:** `assignments.service.spec.ts` (extend), `assignments-data-scoping.spec.ts` (extend), `assignments-e2e.spec.ts` (extend — SP-114F).
- **Minimal start context:** Read `assignments.controller.ts`, `assignments.service.ts`, `dto/create-assignment.dto.ts`, `ownership.ts`.
- **Verification commands:** `pnpm test -- assignments.service.spec.ts`, `pnpm test -- assignments-data-scoping.spec.ts`, `pnpm test:e2e -- assignments-e2e.spec.ts`.
- **Dependencies:** SP-113A (POST module + Assignment model + ownership).
- **Exclusions:** Status updates, actualHours, courseId changes — owned by story 5 / future story.
