# SP-120 Breakdown — Assignment Subtasks

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-120](./SP-120-assignment-subtasks.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Implemented — awaiting parent review (2026-10-25). I and J are implemented. Combined review has not happened.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-120/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-120/` (parent index written by J; review and walkthrough by the reviewer)

**Active substory:** None (SP-120I and SP-120J implemented; awaiting the combined parent review).

**Next substory:** None — final parent review next. Index: [./artifacts/SP-120/implementation.md](./artifacts/SP-120/implementation.md). The user reported the DoD-10 browser walkthrough **passed** on 2026-10-26 (IR-120-1 attestation below). That is not reviewer closure and not `Reviewed`. IR-120-2 (independent automated gates) is still open.

**Implementation owner:** `implementer`, sequential across layers. Backend and frontend are scope labels, not concurrent writers.

**Final review:** One combined SP-120 review after I and J are implemented, including J's integration note. No per-child review gate. Final artifacts: `./artifacts/SP-120/review.md` and `./artifacts/SP-120/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [I](./SP-120I-subtask-api.md) | Implemented — awaiting parent review | SP-113/SP-114/SP-115 reviewed (satisfied 2026-10-25) | None (blocked on the combined parent review) | [implementation record](./artifacts/SP-120I/implementation.md) · [checkpoint](./artifacts/SP-120I/checkpoint.md) |
| [J](./SP-120J-subtask-ui.md) | Implemented — awaiting parent review | I **implemented** (2026-10-25). UI/UX settled in the story file 2026-10-25. User reported the DoD-10 browser walkthrough passed 2026-10-26 (IR-120-1; not reviewer-verified) | None (blocked on the combined parent review; IR-120-2 still open) | [implementation record](./artifacts/SP-120J/implementation.md) · [checkpoint](./artifacts/SP-120J/checkpoint.md) |

Sequence: I → J, one writer. J owns the parent index and the DoD-10 browser note. There is no third integration story.

### Split rationale

One slice would mix a new nested API surface (four routes + two DTOs +
ownership gates + a course-projection change) with checklist UI work
(expand/collapse, checkbox, reorder controls, accessibility). Those are
independently testable, and the UI cannot be verified against a live
contract until the API exists.

- **I** has the four nested routes, the DTOs, the ownership gates, the
  course projection change, and the unit/data-scoping/e2e tests (about
  2.5–3 hours).
- **J** has the checklist component, the client functions, component
  tests, the browser note, and the parent index (about 2.5–3 hours). A
  third child would only rerun checks and write that index.

## Code baseline (2026-10-25)

- `Task` model (`apps/api/prisma/schema.prisma` 237–257): id, `userId`
  (cascade), **`assignmentId String?`** (optional relation to `Assignment`;
  Prisma default `SetNull` on assignment deletion — D114-4), title,
  description?, dueDate? (nullable), estimatedMinutes?, actualMinutes?,
  status @default(PENDING), priority @default(MEDIUM), **`orderIndex
  Int @default(0)`**, timestamps, `scheduledTasks ScheduledTask[]` (EP06).
- Enums: `TaskStatus` (PENDING/IN_PROGRESS/COMPLETED/ARCHIVED),
  `TaskPriority` (LOW/MEDIUM/HIGH).
- **No tasks API module** (`apps/api/src/modules/` = assignments, auth,
  courses, email, onboarding, prisma, semesters, users). The subtask routes
  extend the **assignments** module (nested under
  `/assignments/:id/subtasks` — the D112-2 meetings precedent, D120-8).
- Assignments module: `assignments.controller.ts` (POST/PATCH/DELETE
  `/assignments`), `assignments.service.ts` (create/update/delete + 11-key
  `toAssignmentResponse`), DTOs, module. The delete method documents D114-4
  (SetNull) and notes "story 4 owns orphaned-task UX."
- Ownership: `ownedWhere` / uniform 404 `Resource not found`
  (`apps/api/src/common/ownership/ownership.ts`). `Task` is already in the
  user-scoped model list (line 26).
- Course detail projection: `courses.service.ts` `get()` (lines 265–282)
  includes `assignments: { where: { userId }, orderBy: [{ dueDate: 'asc' },
  { title: 'asc' }] }` — no `tasks` include yet. `toAssignmentResponse`
  (lines 63–77) returns the 11-key shape.
- Global `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`) — DTO +
  service re-check pattern.
- Frontend: `shared/types/academic.ts` has the full `Task` type (id, title,
  description, dueDate, estimatedMinutes, actualMinutes, status, priority,
  orderIndex, assignment, timestamps) and `CourseAssignment =
  Omit<Assignment, 'course'>` (11 keys). No `Subtask` type yet.
- `entities/assignment/api/assignmentApi.ts` — plain axios
  (createAssignment, updateAssignment, deleteAssignment). No subtask
  functions.
- `features/courses/ui/AssignmentsSection.tsx` — renders
  `CourseAssignment[]` rows with badges + Edit/Delete. No subtask UI.
- `pages/courses/ui/CourseDetailPage.tsx` — single `getCourse` fetch
  (D112B-13); `onAssignmentChanged` → background refetch (D112B-10).
- E2E harness: `apps/api/src/test/test-http.ts` (`createIntegrationApp` —
  real HTTP, main.ts module parity, real Postgres, self-skips without
  `DATABASE_URL`).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D120-1 | **Use the existing `Task` model as subtasks — no new `Subtask` model, no migration.** | The `Task.assignmentId` relation already exists (schema 241–242); D114-4 already decided the SetNull orphan behavior; the assignments service comments call them "subtasks" (delete method); the ownership list already includes `Task`; the frontend already has the `Task` type. The epic's "Create `Assignment` and `Subtask` Prisma models" note predates the schema. Reversible: no subtask data exists yet. |
| D120-2 | **Nested routes under assignments** (`/assignments/:id/subtasks`), not top-level `/tasks`. | The D112-2 meetings precedent (nested under the parent resource). Story 4's scope is assignment subtasks only; standalone tasks (EP06) can add top-level routes later. The ownership chain is clear: verify the assignment belongs to the student, then scope subtasks through it. |
| D120-3 | **Subtask projection: 6 keys** — `{ id, title, status, orderIndex, createdAt, updatedAt }`. Omits `userId`, `assignmentId` (never exposed), and the unused Task fields (`description`, `dueDate`, `estimatedMinutes`, `actualMinutes`, `priority`). | The MVP checklist needs only these fields. The create/update DTOs accept only `title`, `status`, `orderIndex`. The other model fields stay at their schema defaults (null / PENDING / MEDIUM). |
| D120-4 | **Subtask status: `PENDING` ↔ `COMPLETED` only.** The PATCH DTO accepts `@IsIn(['PENDING', 'COMPLETED'])`. `IN_PROGRESS` and `ARCHIVED` are not exposed. | The epic AC says "independently completable" — a checkbox needs exactly two states. IN_PROGRESS/ARCHIVED are lifecycle states for standalone tasks (EP06). |
| D120-5 | **Subtasks join the course-detail projection.** `GET /courses/:id` assignments gain a `subtasks` key (array of 6-key projections, ordered `orderIndex` asc, then `createdAt` asc). | Keeps the one-fetch pattern (D112B-13) and the background refetch (D112B-10): after any subtask mutation the page re-runs `getCourse` and the checklist re-renders. Additive contract change (one new key per assignment). |
| D120-6 | **Orphaned subtasks persist but are not surfaced.** After assignment deletion (D114-4, SetNull), subtasks with `assignmentId: null` are not listed in any assignment's checklist and have no story-4 UI. | D114-4 already decided persistence. Story 4 owns the orphaned-task UX decision: hide them (a standalone-task view belongs to EP06 or a later EP03 story). |
| D120-7 | **Order semantics: append-on-create, explicit reorder.** Create with omitted `orderIndex` appends at the end (max + 1). Reorder = PATCH `orderIndex`; the frontend swaps values between adjacent subtasks. No automatic shifting on insert/delete. | The `orderIndex` column exists (default 0). The MVP reorder UX (up/down buttons) swaps two values — two PATCH calls. Automatic shifting would need a reorder endpoint; deferred (not needed for MVP). |
| D120-8 | **Subtask routes live in the assignments module** (controller + service extended), not a new tasks module. | The routes are nested under `/assignments/:id/subtasks` — the assignments module is their natural home (the meetings precedent puts nested routes in the courses module). A standalone tasks module belongs to EP06. |

## Shared API contract

Fixed cross-child contract. I implements it. J consumes it. I's e2e covers
the API round-trip, including `GET /courses/:id`. J's browser note covers
the visible checklist.

```text
Subtask = { id, title, status: "PENDING" | "COMPLETED", orderIndex: number,
            createdAt: ISO, updatedAt: ISO }   (6 keys; no userId/assignmentId)

GET /assignments/:id/subtasks
  auth: required (global APP_GUARD)
  200 → Subtask[] ordered by orderIndex asc, then createdAt asc
  404 → uniform "Resource not found" — assignment missing/foreign/malformed
  401 → unauthenticated

POST /assignments/:id/subtasks
  auth: required
  body: { title: string (required, non-whitespace, ≤ 200),
          orderIndex?: number (integer ≥ 0; omitted → append at end) }
  201 → Subtask
  400 → field-level errors (title/orderIndex; unknown fields incl.
        description/dueDate/estimatedMinutes/actualMinutes/priority/status/
        userId/assignmentId)
  404 → uniform — assignment missing/foreign/malformed
  401 → unauthenticated

PATCH /assignments/:id/subtasks/:subtaskId
  auth: required
  body: { title?: string (non-whitespace, ≤ 200),
          status?: "PENDING" | "COMPLETED" (D120-4),
          orderIndex?: number (integer ≥ 0) }
  partial merge; at least one field (empty body → 400)
  200 → Subtask
  400 → field-level errors (merged values; or empty body)
  404 → uniform — assignment missing/foreign, OR subtask missing/foreign/
        not belonging to the :id assignment
  401 → unauthenticated

DELETE /assignments/:id/subtasks/:subtaskId
  auth: required
  204 → No Content
  404 → uniform (same conditions as PATCH)
  401 → unauthenticated

GET /courses/:id
  assignments[] gains subtasks: Subtask[] (ordered orderIndex asc, then
  createdAt asc) — D120-5. The assignment's other 11 keys unchanged.

Ownership: every route verifies the assignment belongs to the requesting
student (uniform 404). Subtask reads/writes additionally scope by userId.
A cross-student assignment id → uniform 404; a cross-student subtask id →
uniform 404; a subtask belonging to a different assignment → uniform 404.
```

Validation stays backend-authoritative (`FieldValidationPipe` plus service
re-check). J must not tell the student that a blank title clears anything.

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-03 | Assignments can contain ordered, independently completable subtasks. | **SP-120I** (API: ordered list, create, toggle completion, reorder, delete) + **SP-120J** (UI: checklist with add/toggle/reorder/delete). |

AC-E03-01/02 stay with SP-113/SP-114/SP-115. AC-E03-04…07 stay with
proposed stories 5–7 (not broken down). The epic defines no test
requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | I (API), J (UI) |
| 2 invalid-input validation | I (DTO + service re-check); J mirrors title rules |
| 3 student data scoping | I (existing gates; subtask routes scope through the assignment + userId). J shows the uniform 404. |
| 4 actionable API errors | I (field-level 400); J displays title errors |
| 5 loading/empty/error states | J (checklist empty state, in-flight) |
| 6 keyboard accessibility | J (checkbox, add input, reorder buttons) |
| 7 responsive layouts | J |
| 8 automated business-rule tests | I (unit, data-scoping, e2e); J (component) |
| 9 API/migration documentation | I (this contract; no migration — D120-1) |
| 10 integrated development review | J browser note + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Subtask does not bypass assignment ownership | Student B lists/creates subtasks on student A's assignment | Assignment ownership gate (`ownedWhere` → uniform 404) runs before any subtask query | I data-scoping and e2e |
| Subtask does not bypass student ownership | Student B patches/deletes student A's subtask through B's own assignment id | Subtask query scopes `{ id, userId, assignmentId }` — a subtask not matching all three → uniform 404 | I data-scoping and e2e |
| Subtask cannot escape its assignment | Student B patches a subtask that belongs to A's assignment, using B's assignment id in the path | The subtask query requires `assignmentId = :id` (B's) — A's subtask doesn't match → 404 | I data-scoping |
| Projection does not leak ownership | A created subtask is read from course detail | The subtask projection omits `userId`/`assignmentId`; the course detail include scopes `tasks: { where: { userId } }` | I course projection tests and e2e key assertion |
| Lifecycle fields stay locked | Client sends `status: "ARCHIVED"` or `priority: "HIGH"` on subtask create/patch | D120-3/D120-4: the DTO whitelist rejects them as unknown fields → 400 | I unit, data-scoping, e2e |

## Plan correction log

(Empty at planning time — first plan of this parent. Implementation review findings appended below with stable IDs; original findings are preserved.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| IR-120-1 | 2026-10-25 | Should-fix | [SP-120 review](./artifacts/SP-120/review.md) findings; J implementation DoD-10 note | The DoD-10 manual browser pass was not executed by the implementer or by the first combined review. Component tests are not a live browser pass. | 2026-10-26: the user reported the walkthrough **passed** ("SP-120 walkthru passed"). No environment, commit, or per-step observations were provided. J's implementation note still says the agent pass was not executed; that historical note is unchanged. | Not independently re-run here. Recorded as user-reported evidence only, same provenance class as SP-115 F-115H-1. Reviewer closure still requires the next review pass to accept this attestation against `a1ec584` (or a later commit). | User-reported — awaiting reviewer confirmation |
| IR-120-2 | 2026-10-25 | Should-fix | [SP-120 review](./artifacts/SP-120/review.md) findings | The first combined review could not run the automated gates (shell denied). Implementer-recorded green results were not treated as a pass. | None. A user walkthrough report does not execute unit, data-scoping, e2e, typecheck, or lint. | Not run in this planning session. | Open |

## Quality gate (2026-10-25)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Two children. I and J each have a sizing block and a substantive independent outcome (API surface + projection vs checklist UI). Split reason above. No README-only or integration-only child. Estimates 2.5–3 hours, not padded with agent overhead. |
| 2. Original AC/TR coverage | Pass | AC-E03-03 owned by I and J. AC-E03-01/02 stay with SP-113/SP-114/SP-115. AC-E03-04…07 stay assigned to stories 5–7 in the [EP03 README](../README.md). No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Item 10 is J's browser note plus the combined parent review. Item 11 is reviewer-owned and not pretended done. |
| 4. Contract consistency and integration ownership | Pass | One contract in this README. I implements it, including e2e. J consumes it and owns the parent index. No third child. |
| 5. Code paths inspected | Pass | Schema (Task model, enums), assignments module (controller, service, DTOs, module), courses service (get projection, toAssignmentResponse), ownership helper, validation pipe, `academic.ts`, `assignmentApi.ts`, `AssignmentsSection.tsx`, `CourseDetailPage.tsx`, `courseApi.ts`. Unverified: none material. Generated Prisma client was not treated as a source file. |
| 6. Feature-specific risks | Pass | Five counterexamples above. No migration (D120-1) — the Task model and relation already exist. |
| 7. Dependency mapping | Pass | SP-113/SP-114/SP-115 reviewed, so I can start. J waits on I's implementation and on ui-refiner. One writer, I then J. |
| 8. Material decisions | Pass | D120-1 grounded in the existing schema relation + D114-4 + code comments. D120-2 follows the D112-2 meetings precedent. D120-3/4 bound the MVP checklist. D120-5 keeps the one-fetch pattern. D120-6 records the orphan decision. D120-7 grounds order semantics. D120-8 places the routes. Display copy and layout are deliberately left to ui-refiner, not left undecided in the API. |
| 9. Correction log | Pass | Empty — first plan of this parent; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready.** Planning gates pass. J is `Needs refinement`
for UI/UX, so it is not ready to code. Implementation of I is not blocked.
No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-120 — `docs/stories/EP03/SP-120/`
- **In scope:** SP-120I and SP-120J
- **Integration/index owner:** SP-120J (`./artifacts/SP-120/implementation.md`)
- **Gate:** one combined review after both children are implemented (`./artifacts/SP-120/review.md` and `walkthrough.md`). Child completion does not sign off the parent.
