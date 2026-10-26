# SP-122 Breakdown — Assignment Search, Sorting & Filters

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-122](./SP-122-assignment-search-sorting-and-filters.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-26 — covers EP03 proposed story **6 (implement assignment search, sorting, and filters)**. **Plan Ready** (gate below). Implementation not blocked (SP-113/SP-114/SP-115/SP-120/SP-121 reviewed). No Jira sync authorized; keys are `Pending creation`.
**Jira key:** Pending creation (no sync authorized)

## Autopilot

- **Scope and entry:** SP-122 parent review unit (children SP-122A/B/C). Entry hint: implement SP-122A. No explicit narrower limit; continue through final parent review.
- **Coordinator:** workspace `/Users/michael/Documents/GitHub/focus-app`, branch `main`, baseline commit `e0a1722` (SP-122 plan). Retain this baseline until the parent implementation index owns the combined scope.
- **Stage:** implement
- **Active dispatch:** None (about to dispatch SP-122A).
- **Last result / retry state:** Plan Ready 2026-10-26 (gate table in this README). No implementation yet. No correction cycles.
- **Resume:** Dispatch a fresh implementer for SP-122A (backend `GET /assignments`). Then ui-refine SP-122B, implement B, implement C, then one combined parent review. Current next action: **SP-122A — implement**.

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-122/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-122/` (parent index written by C; review and walkthrough by the reviewer)

**Active substory:** None (SP-122A implemented).

**Next substory:** **SP-122B** — refine (`Needs refinement`). A implemented; B waits on ui-refiner. C waits on A and B.

**Implementation owner:** `implementer`, sequential across layers. Backend and frontend are scope labels, not concurrent writers.

**Final review:** One combined SP-122 review after A, B, and C are implemented, including C's integration note. No per-child review gate. Final artifacts: `./artifacts/SP-122/review.md` and `./artifacts/SP-122/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-122A-assignment-list-api.md) | Implemented — awaiting parent review | SP-113A/SP-114D/SP-115G reviewed (satisfied 2026-10-24/25); SP-121 reviewed (satisfied 2026-10-26) | Parent review after B/C | checkpoint: `./artifacts/SP-122A/checkpoint.md`; implementation: `./artifacts/SP-122A/implementation.md` |
| [B](./SP-122B-assignment-list-ui.md) | Needs refinement | A implemented (contract fixed in this README); UI/UX gaps unsettled (ui-refiner handoff) | Refine UI, then implement after A | — |
| [C](./SP-122C-assignment-list-integration.md) | Queued | A and B implemented | Implement after B | — |

Sequence: A → B → C, one writer, in child-letter order. B owns the assignments list page and the entity API function. C is the named integration owner (e2e + DoD-10 browser note + parent index).

### Split rationale

One slice would mix a new cross-course read endpoint with query validation and
filtering/sort logic (backend) with a new list page, search/filter/sort controls,
and client-side wiring (frontend), plus end-to-end proof of filter combinations
and ownership. Those are independently testable, and the UI cannot be verified
against a live contract until the endpoint exists.

- **A** has the `GET /assignments` route, the query DTO, the service-level
  filtering/sort logic, the course-context join, and the unit/data-scoping
  coverage (about 2–2.5 hours).
- **B** has the `listAssignments` client function and types, the `/assignments`
  page, the search/filter/sort controls, the course picker, component tests, and
  the nav entry (about 2.5–3 hours). UI/UX is deliberately left to ui-refiner.
- **C** has the cross-layer e2e spec (filter combinations, sort order, search,
  ownership, malformed/foreign params), the parent index, and the DoD-10 browser
  note (about 1.5–2 hours). A third child is justified because the filter
  matrix and ownership proof are a substantial verification outcome, not a
  status child.

## Code baseline (2026-10-26)

- `Assignment` model (`apps/api/prisma/schema.prisma`): `id`, `userId` (cascade),
  `courseId?` (nullable, `SetNull` on course delete), `title`, `description?`,
  `dueDate DateTime?` (nullable since D113-1), `estimatedHours?`, `actualHours?`,
  `status AssignmentStatus @default(PENDING)`, `priority AssignmentPriority
  @default(MEDIUM)`, `type AssignmentType?` (nullable since SP-115), timestamps,
  `tasks Task[]`, `@@map("assignments")`. No schema change is needed for story 6.
- Enums: `AssignmentStatus` (PENDING/IN_PROGRESS/COMPLETED/SUBMITTED/GRADED),
  `AssignmentPriority` (LOW/MEDIUM/HIGH/URGENT), `AssignmentType`
  (HOMEWORK/PAPER/PROJECT/QUIZ/EXAM).
- `apps/api/src/modules/assignments/` exists: `POST`, `PATCH`, `DELETE
  /assignments`, plus nested subtask routes. **There is no `GET /assignments`
  or `GET /assignments/:id`** — the only read surface is the course-detail
  projection (`GET /courses/:id` → `assignments[]`). Story 6 adds the first
  top-level read route.
- `CoursesService.get()` projects `assignments` ordered `dueDate asc (nulls
  last), title asc` and includes `subtasks` (D120-5). The list endpoint reuses
  this ordering as its default and the same `subtasks` projection.
- Frontend: `entities/assignment/api/assignmentApi.ts` has create/patch/delete
  and subtask functions but no list function. `entities/course/api/courseApi.ts`
  has `listCourses` (the course picker source for the list page's filter).
  `shared/types/academic.ts` defines `Assignment` (with `subtasks?` on
  `CourseAssignment`), `AssignmentStatus`, `AssignmentPriority`,
  `AssignmentType`. No assignments list page or route exists (`App.tsx` has
  `/courses` and `/courses/:id` only).
- FSD convention (SP-109): the API client lives in `entities/assignment/`; the
  list page is a new `pages/assignments/` route screen; reusable filter UI may
  live in `features/assignments/` or `features/courses/`. The page is reached
  through `ProtectedRoute` and the standard `Layout`.
- E2E harness: `apps/api/src/test/test-http.ts` (`createIntegrationApp` — real
  HTTP, real Postgres, self-skips without `DATABASE_URL`). `assignments-e2e.spec.ts`
  is the pattern; a new `assignments-list-e2e.spec.ts` (or an appended describe
  block) is the natural home.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D122-1 | **`GET /assignments` is the cross-course list route** (top-level, consistent with D113-2). It returns the student's assignments across courses with an optional `courseId` filter. No `GET /assignments/:id` is added in this story — opening a row routes to its course detail (the existing surface); a dedicated detail page is out of scope (story 7 / EP05 may add deep links). | D113-2 precedent ("top-level resource … downstream consumers are cross-course: stories 6/7, EP05, EP06/EP07") + the epic AC-7 wording ("Assignment lists support course, date, and status filtering"). Reversible. |
| D122-2 | **Filter parameters (all optional, AND-combined):** `courseId`, `status`, `priority`, `type`, `dueFrom`, `dueTo` (ISO-8601 datetimes), and `q` (free-text search). Unknown query parameters → 400 (whitelist + `forbidNonWhitelisted`). `courseId`, when present, must be the student's own course — missing/foreign/malformed → uniform 404 before any list query. | AC-E03-07 names course, date, and status; priority/type/q are low-cost extensions that keep the list useful and are validated against the same enums. Reversible; documented as planner-recorded. |
| D122-3 | **Date range semantics:** `dueFrom`/`dueTo` are inclusive bounds applied to `dueDate`. Assignments with a null `dueDate` are excluded whenever either bound is present (a null date cannot be compared). With neither bound, null-dated assignments are included and sort last. | Grounded in the nullable `dueDate` (D113-1) and the existing nulls-last ordering. Reversible. |
| D122-4 | **Search (`q`):** case-insensitive substring match against `title` (and `description` when present). Trimmed; empty/whitespace-only `q` is treated as absent. Max 200 chars. | Planner-recorded, reversible. Keeps the search cheap (`contains` with `mode: 'insensitive'`). |
| D122-5 | **Sort:** `sort` ∈ { `dueDate` (default), `title`, `priority`, `status`, `createdAt`, `updatedAt` }; `order` ∈ { `asc` (default), `desc` }. Default ordering is `dueDate asc (nulls last), title asc`. Ties broken by `title asc`, then `id asc` for determinism. Priority/status sort by their stored enum string (not a severity rank) — documented as such. | Planner-recorded, reversible. Keeps the contract to one sort key plus a documented tie-break; a severity-ranked priority sort is deferred (not in the epic AC). |
| D122-6 | **List item projection:** the 11 assignment keys (`id`, `title`, `description`, `dueDate`, `estimatedHours`, `actualHours`, `status`, `priority`, `type`, `createdAt`, `updatedAt`) **plus** `course: { id, name, code, color } | null` and `subtasks: Subtask[]` (the 6-key projection, D120-3/D120-5). Null `course` covers assignments created without a course (D113 create path). | Reuses the existing projections so the list page can render course context and progress without a second fetch. Reversible. |
| D122-7 | **No pagination in MVP.** The endpoint returns all matching rows for the student. Sensible limits/links to full lists are EP05's concern (EP05 AC: "Dashboard sections have sensible limits and links to full lists"). | Planner-recorded, reversible; keeps the contract simple. |
| D122-8 | **Child lettering restarts at A for SP-122** (`SP-122A/B/C`), executed in alphabetical order A → B → C. Stable IDs remain unique regardless of the epic-wide lettering. | Continues the SP-121 precedent (D121-6) of per-parent lettering restart; recorded here because the planner's write scope is `docs/` only. |
| D122-9 | **B is `Needs refinement` for UI/UX.** The list page's layout, filter placement, search affordance, sort control, empty states, and responsive behavior are not settled by this plan; the ui-refiner settles them with the user before B is implemented. Backend (A) is not blocked. | Planner assessment per the skill's UI/UX handoff; do not invent UI decisions to avoid the handoff. |

## Shared API contract

Fixed cross-child contract. A implements it. B consumes it. C verifies it
end-to-end.

```text
GET /assignments
  query (all optional, AND-combined):
    courseId?        string (plain; missing/foreign/malformed → uniform 404)
    status?          AssignmentStatus (single value)
    priority?        AssignmentPriority (single value)
    type?            AssignmentType (single value)
    dueFrom?         ISO-8601 datetime (inclusive lower bound on dueDate)
    dueTo?           ISO-8601 datetime (inclusive upper bound on dueDate)
    q?               string, ≤ 200 chars (case-insensitive substring on title
                     and description; trimmed; empty → absent)
    sort?            dueDate (default) | title | priority | status |
                     createdAt | updatedAt
    order?           asc (default) | desc
  200 → [ AssignmentListItem ] ordered by the requested sort (default
         dueDate asc nulls-last, then title asc, then id asc)
  400 → field-level errors (unknown query param, invalid enum, malformed
         ISO date, over-long q, unknown sort/order)
  404 → uniform "Resource not found" — courseId present but missing/foreign/
         malformed (no existence oracle)
  401 → unauthenticated (global guard)

AssignmentListItem = {
  id, title, description, dueDate (ISO | null), estimatedHours, actualHours,
  status, priority, type, createdAt, updatedAt,
  course: { id, name, code, color } | null,
  subtasks: [ { id, title, status, orderIndex, createdAt, updatedAt } ]
}

POST /assignments, PATCH /assignments/:id, DELETE /assignments/:id, and the
nested subtask routes are unchanged by this story (D122-1). The course-detail
projection (GET /courses/:id) is unchanged.
```

Validation: backend `FieldValidationPipe` (whitelist + `forbidNonWhitelisted`,
`transform: true`) applies to the query DTO; the service re-checks ownership of
`courseId` and the date bounds. The frontend mirrors the enum/ISO rules in its
controls (B).

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-07 | Assignment lists support course, date, and status filtering. | **SP-122A** (the `GET /assignments` endpoint with `courseId`, `dueFrom`/`dueTo`, and `status` filters, plus search/sort), **SP-122B** (the list page with course/date/status controls), **SP-122C** (cross-layer proof of filter combinations and ownership). |

AC-E03-01/02 stay with SP-113/SP-114/SP-115. AC-E03-03 stays with SP-120.
AC-E03-04/05 stay with SP-121 (transition + unfinished view; completed view is
story 7). AC-E03-06 (overdue identification) stays with story 7 (not yet
broken down). The epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (endpoint + filters + sort), B (list page + controls), C (integrated) |
| 2 invalid-input validation | A (query DTO + service re-checks), B (controls mirror the rules) |
| 3 student data scoping | A (principal-scoped list; `courseId` ownership gate; uniform 404), C (cross-student proof) |
| 4 actionable API errors | A (field-level 400, uniform 404), B (display) |
| 5 loading/empty/error states | B (page states), C (integrated) |
| 6 keyboard accessibility | B (search, filters, sort, list) |
| 7 responsive layouts | B (mobile + desktop) |
| 8 automated business-rule tests | A (unit + data-scoping), B (component), C (e2e) |
| 9 API/migration documentation | A (contract in this README; no migration) |
| 10 integrated development review | C (manual browser sign-off) + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| The list never leaks another student's assignments | Student B calls `GET /assignments` and looks for A's rows | Every query carries `where: { userId }`; the projection is principal-scoped. | A (data-scoping), C (two-student HTTP matrix) |
| `courseId` cannot be used as an existence oracle | Student B filters by student A's `courseId` | `course.findFirst({ where: ownedWhere(userId, courseId) })` → uniform 404 before any assignment query; B cannot tell whether the course exists. | A (unit + data-scoping), C |
| Filters cannot bypass ownership | Student B sends `status=COMPLETED&q=…` hoping to read A's finished work | The `userId` predicate is always present and is not overridable by any query parameter (`forbidNonWhitelisted` rejects `userId`). | A (data-scoping), C |
| Search input is bounded | Client sends `q` of 10 000 chars or a non-string | `@MaxLength(200)` + `@IsString` → 400 field error; nothing queried. | A (unit) |
| Sort/order cannot inject | Client sends `sort=userId` or `order=sideways` | `@IsIn` on the closed enum → 400; the service never interpolates the value into a query. | A (unit) |

## Plan correction log

(First plan of this parent. Implementation review findings are appended here
with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| (none yet) | — | — | — | — | — | — | — |

## Quality gate (2026-10-26)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children. A, B, and C each have a substantive independent outcome and a sizing block (2–2.5 h / 2.5–3 h / 1.5–2 h). Split rationale above. No README-only or status-only child. |
| 2. Original AC/TR coverage | Pass | AC-E03-07 owned by A/B/C. AC-E03-01/02/03/04/05 stay with SP-113/114/115/SP-120/SP-121. AC-E03-06 stays with story 7 (not broken down). No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Item 10 is C's browser note plus the combined parent review. Item 11 is reviewer-owned and not pretended done. |
| 4. Contract consistency and integration ownership | Pass | One contract in this README. A implements it, including the projection. B consumes it field-by-field. C is the named integration owner with explicit dependencies on A + B. |
| 5. Code paths inspected | Pass | `apps/api/prisma/schema.prisma` (`Assignment`, the three enums), `apps/api/src/modules/assignments/*` (controller, service, DTOs, specs), `apps/api/src/modules/courses/courses.service.ts` (projection + ordering), `apps/api/src/common/ownership/ownership.ts`, `apps/api/src/common/pipes/validation.pipe.ts`, `apps/api/src/test/test-http.ts`, `apps/web/src/entities/assignment/api/assignmentApi.ts`, `apps/web/src/entities/course/api/courseApi.ts` (`listCourses`), `apps/web/src/shared/types/academic.ts`, `apps/web/src/app/App.tsx` (routes), the SP-113/SP-114/SP-115/SP-120/SP-121 breakdowns, the EP03 baseline. Unverified: none material. |
| 6. Feature-specific risks | Pass | Five counterexamples above. No migration — the schema already supports every filter field. |
| 7. Dependency mapping | Pass | SP-113/SP-114/SP-115/SP-120/SP-121 reviewed, so A can start. B waits on A's implementation and on ui-refiner (D122-9). C waits on A + B. One writer, A → B → C. |
| 8. Material decisions | Pass | D122-1…9 are planner-recorded and grounded in D113-2, the epic AC-7, and existing projections. D122-9 (B's UI/UX) is deliberately left to ui-refiner rather than settled here. No open material product question. |
| 9. Correction log | Pass | Empty at planning time; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready.** Planning gates pass. B is `Needs refinement` for
UI/UX, so it is not ready to code. Implementation of A is not blocked. No
application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-122 — `docs/stories/EP03/SP-122/`
- **In scope:** SP-122A, SP-122B, SP-122C
- **Integration/index owner:** SP-122C (writes the parent index at
  `./artifacts/SP-122/implementation.md`)
- **Gate:** one combined SP-122 review after all three children are
  implemented (`./artifacts/SP-122/review.md` and `walkthrough.md`). Child
  completion does not sign off the parent.