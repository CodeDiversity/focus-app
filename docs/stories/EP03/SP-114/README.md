# SP-114 Breakdown — Assignment Editing and Deletion

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-24, **Plan Ready**.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-114/`
**Artifact root:** `./artifacts/` (stable story IDs)
**Parent artifacts:** `./artifacts/SP-114/` (parent index written by F; review and walkthrough by reviewer)
**Active substory:** None — review-fix pass for IR-114-01 through IR-114-05 is implemented.
**Next substory:** None — combined SP-114 parent re-review is next. Do not mark Reviewed until that passing review and its walkthrough exist.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [D](./SP-114D-assignment-update-delete-api.md) | **Implemented — awaiting parent review** | IR-114-04 fixture reads scoped 2026-10-24 | None — awaits the combined SP-114 re-review | [implementation](./artifacts/SP-114D/implementation.md) · [checkpoint](./artifacts/SP-114D/checkpoint.md) |
| [E](./SP-114E-assignment-edit-delete-ui.md) | **Implemented — awaiting parent review** | Review pass 1 IR-114-01/02 fixed 2026-10-24 | None — awaits the combined SP-114 re-review | [implementation](./artifacts/SP-114E/implementation.md) · [checkpoint](./artifacts/SP-114E/checkpoint.md) |
| [F](./SP-114F-assignment-edit-delete-integration.md) | **Implemented — awaiting parent review** | IR-114-03/04/05 fixed 2026-10-24 | None — awaits the combined SP-114 re-review | [implementation](./artifacts/SP-114F/implementation.md) · [browser evidence](./artifacts/SP-114F/browser-error-retry.md) |

Sequence: SP-114 (D → E → F), one sequential writer. E requires a `ui-refiner` pass before implementation (see UI/UX gaps in E's ticket).

Rationale: D creates the API contract (PATCH + DELETE); E builds the UI on the
existing `AssignmentsSection` + `AssignmentForm` (the natural home — the student
is already viewing the course's assignments); F is the named integration owner
(e2e + DoD-10 sign-off + parent index), following the SP-113C precedent.

## Code baseline (2026-10-24)

- `Assignment` model (`apps/api/prisma/schema.prisma` 187–207): id, `userId`
  (cascade), `courseId?` (nullable), title, description?, dueDate? (nullable
  after D113-1), estimatedHours?, actualHours?, status @default(PENDING),
  priority @default(MEDIUM), timestamps, `tasks Task[]` (no explicit `onDelete`
  → Prisma default `SetNull` on the optional relation).
- **Assignments API module exists** (`apps/api/src/modules/assignments/`):
  `assignments.controller.ts` (SP-113A: `POST` only), `assignments.service.ts`
  (SP-113A: `create()`), `dto/create-assignment.dto.ts` (field rules),
  `assignments.module.ts` (module registration), `assignments.service.spec.ts`,
  `assignments-data-scoping.spec.ts`, `assignments-e2e.spec.ts` (all from
  SP-113A).
- **No PATCH or DELETE endpoints** — the controller only has `@Post()` (SP-113A).
- **Ownership convention:** `apps/api/src/common/ownership/ownership.ts`
  (`ownedWhere`/`assertOwned`/`assertAffected`; uniform 404
  `RESOURCE_NOT_FOUND` via `all-exceptions.filter.ts`); `Assignment` is in the
  scope-by-`userId` model list.
- **Global `FieldValidationPipe`** (`apps/api/src/common/validation.pipe.ts`) —
  DTO + service re-check pattern per the courses module (SP-107B/SP-111A/SP-112A).
- **Frontend:** `entities/assignment/api/assignmentApi.ts` (SP-113A:
  `createAssignment` — axios POST), `features/courses/ui/AssignmentsSection.tsx`
  (SP-113B: read-only rows, no per-row controls — test at line 117–125 confirms
  this), `features/courses/ui/AssignmentForm.tsx` (SP-113B: creation-only form),
  `shared/types/academic.ts` (`CourseAssignment` — 10-key projection).
- **E2E harness:** `apps/api/src/test/test-http.ts` (`createIntegrationApp` —
  real HTTP, main.ts module parity, real Postgres, self-skips without
  `DATABASE_URL`).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D114-1 | **PATCH, not PUT** — partial updates via `@Patch()` with all fields optional. | Partial-update semantics of the epic; avoids requiring all fields on every update. |
| D114-2 | **`UpdateAssignmentDto` is a new DTO** (not extending `CreateAssignmentDto`). Same fields (title, description, dueDate, estimatedHours, priority), all optional. `status`, `actualHours`, `courseId` excluded. | `status` owned by story 5 (D113-3); `actualHours` tracked by story 5; `courseId` is the association. |
| D114-3 | **`DELETE` returns 204 No Content.** | Standard REST convention for deletion. |
| D114-4 | **Assignment deletion sets `Task.assignmentId` to NULL** (Prisma default `SetNull`). Tasks persist independently. | Current model schema; story 4 handles orphaned tasks. No migration needed. |
| D114E-1 | **Form reuse:** The existing `AssignmentForm` is extended with an optional `assignmentId` prop. Edit mode: different title, submit text, API call. | Minimizes new code; the form already handles keyboard, validation, error handling, and in-flight states. |
| D114E-2 | **`description` is editable but not in the create form.** The create form omits description for brevity (quick creation). Editing exposes all editable fields. | The assignment model has a description field; students may want to add or update it after creation. |
| D114E-3 | **Status and actualHours are NOT editable.** Excluded in edit mode (read-only display if present). | Consistent with D113-3 (status not in create DTO); actualHours tracked by focus sessions (story 5). |

## Shared API contract

Fixed cross-child contract. D implements; E consumes; F verifies end-to-end.

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

### Frontend API client (E)

```text
updateAssignment(assignmentId: string, data: UpdateAssignmentRequest): Promise<CourseAssignment>
  → PATCH /assignments/:id with the assignment's ID and updated fields

deleteAssignment(assignmentId: string): Promise<void>
  → DELETE /assignments/:id
```

## Source requirements and test traceability

Epic acceptance criteria (original wording in
[EP03](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria);
stable IDs per the [EP03 breakdown](../README.md)):

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | D (PATCH/DELETE on the same resource), E (edit/delete UI), F (integrated proof). |
| AC-E03-02 | Optional fields include due date, estimated duration, type, and priority. | D (PATCH validates editable optional fields), E (form exposes editable fields), F (integrated proof). The `type` field is owned by proposed story 3 (TBD — not yet broken down) and is **not** part of this parent. |

AC-E03-03…07 are owned by proposed stories 4–7 (not yet broken down — recorded
in the [EP03 README](../README.md), not silently dropped). The epic defines no
test requirements; story-level test obligations are owned per child below.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | D (API behavior), E (UI behavior), F (integrated) |
| 2 invalid-input validation | D (DTO + service re-checks), E (form client-side) |
| 3 student data scoping | D (principal-scoped update/delete; uniform 404), F (cross-student proof) |
| 4 actionable API errors | D (field-level 400, uniform 404), E (display) |
| 5 loading/empty/error states | E (form + section states), F (integrated) |
| 6 keyboard accessibility | E (buttons, confirmation dialog) |
| 7 responsive layouts | E (mobile + desktop) |
| 8 automated business-rule tests | D (unit + data-scoping), E (component), F (e2e) |
| 9 API/migration documentation | D (contract in this README; no migration needed) |
| 10 integrated development review | F (manual browser sign-off) + the combined parent review |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| No cross-student assignment update | Student B PATCHes student A's assignment | `assignment.findFirst({ where: { id, userId } })` → 404; nothing updated | D (unit + data-scoping), F (two-student matrix) |
| No cross-student assignment deletion | Student B DELETEs student A's assignment | Same ownership gate → 404; nothing deleted | D (unit + data-scoping), F (two-student matrix) |
| Partial update does not expose lifecycle fields | Client PATCHes with `status: "COMPLETED"` or `actualHours: 5` | `UpdateAssignmentDto` excludes status/actualHours/courseId → 400 on unknown fields | D (unit), F (e2e) |
| Deletion does not cascade-delete tasks | Student deletes an assignment that has subtasks | Prisma default `SetNull` on the optional `Task.assignmentId` relation — tasks persist with `assignmentId: null` | D (unit — delete test verifies orphaned task `assignmentId` is NULL) |

## Plan correction log

(Empty at planning time — first plan of this parent. Implementation review findings appended below with stable IDs; original findings are preserved.)

## Quality gate (2026-10-24)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children, each with a sizing block grounded in inspected code. D and E are substantial, independently testable outcomes in different layers (new API endpoints + DTOs + service methods + tests vs. per-row controls + form reuse + API client), each ~2–2.5 h within the 1–3 h target; F is a real verification outcome (new e2e spec + manual DoD-10 sign-off + parent index — the SP-110C/SP-111C/SP-112C/SP-113C precedent), not a status child. No README-only/status-only children. |
| 2. Original AC/TR coverage | Pass | AC-E03-01 owned by D/E/F (editing/deletion extend the same resource); AC-E03-02 owned by D/E/F for the editable optional fields (title, description, dueDate, estimatedHours, priority); the `type` remainder explicitly assigned to proposed story 3 (TBD) in the [EP03 README](../README.md). AC-E03-03…07 owned by stories 4–7 (TBD — recorded, not silently dropped). The epic defines no TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above: 1–8 owned by D/E/F as applicable, 9 by D (contract — no migration needed), 10 by F + the combined parent review. |
| 4. Contract consistency and integration ownership | Pass | One shared contract section (PATCH + DELETE); D implements, E consumes field-by-field against its ACs, F is the named integration owner with explicit dependencies on D + E. |
| 5. Code paths inspected | Pass | `apps/api/prisma/schema.prisma` (`Assignment` 187–207, enums 209–222), `apps/api/src/modules/assignments/` (controller, service, DTO, module, tests — all from SP-113A), `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/common/validation.pipe.ts`, `apps/web/src/entities/assignment/api/assignmentApi.ts`, `apps/web/src/features/courses/ui/AssignmentsSection.tsx`, `AssignmentForm.tsx`, `shared/types/academic.ts`, the SP-113 breakdown (D113-1…6). Unverified: none material. |
| 6. Feature-specific risks/counterexamples | Pass | Four invariants with concrete counterexamples, mechanisms, and owning tests (cross-student update, cross-student deletion, lifecycle-field lockout, task orphaning). |
| 7. Dependency mapping and sequencing | Pass | SP-113A → SP-114 (satisfied 2026-10-24); D → E → F within, one sequential writer; E additionally needs a `ui-refiner` pass (settled UI/UX before implementation). No other EP03 parent is started (user scope: story 2 only). |
| 8. Material decisions | Pass | D114-1…4 are grounded in the model schema and REST conventions; D114E-1…3 are grounded in the existing SP-113B code and the epic text. No open material question. |
| 9. Correction log | Pass | Empty — first plan of this parent; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized for this planning task. Parent + children are `Pending creation`; no duplicate keys, no tracker mutation. |

**Outcome:** **Plan Ready** — all applicable planning gate rows pass; no
unresolved material planning findings. Implementation not blocked (SP-113A
complete 2026-10-24). No implementation or passing tests are claimed; the plan
approves planning obligations only. Next actionable: **SP-114D** (execution
queue).

## Final implementation review unit

- **Parent:** SP-114 — `docs/stories/EP03/SP-114/`
- **In scope:** SP-114D, SP-114E, SP-114F (all children + integration)
- **Integration/index owner:** SP-114F (writes the parent index at
  `./artifacts/SP-114/implementation.md`)
- **Gate:** one combined SP-114 review after every child is implemented
  (`./artifacts/SP-114/review.md` + `walkthrough.md`); child implementation
  completion unblocks dependent work, but only the passing combined review
  establishes sign-off.
