# SP-124 Breakdown — Assignment List Cohesion

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-26 (Draft). Children A/B/C are `Needs refinement` for UI/UX (ui-refiner handoff). No implementation evidence. Plan Ready pending the quality gate below.
**Jira key:** Pending creation (parent coordination record — no Jira issue; children carry tracker keys)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-124/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-124/` (parent index written by C; review and walkthrough by the reviewer)

**Active substory:** None.

**Next substory:** None yet — children are `Needs refinement` for UI/UX; ui-refiner must settle placement/copy before any child is Ready. After ui-refinement, first eligible child is [SP-124A](./SP-124A-list-row-actions.md) (row actions), then B (subtasks), then C (create).

**Implementation owner:** `implementer`, sequential across the single frontend writer. All three children are frontend scope; no backend writer is needed.

**Final review:** One combined SP-124 review after A, B, and C are implemented, including C's parent index and DoD-10 browser note. No per-child review gate. Final artifacts: `./artifacts/SP-124/review.md` and `./artifacts/SP-124/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-124A-list-row-actions.md) | Needs refinement | SP-114 (edit/delete) and SP-121 (status) reviewed — satisfied. SP-122B list page reviewed — satisfied. | UI refinement (ui-refiner) before Ready; then implement | (none yet) |
| [B](./SP-124B-list-subtasks.md) | Needs refinement | SP-120 (subtasks) and SP-122B reviewed — satisfied. Benefits from A landing first (shared row-action layout). | UI refinement; implement after A | (none yet) |
| [C](./SP-124C-list-create.md) | Needs refinement | SP-113 (create) and SP-122B reviewed — satisfied. Benefits from A landing first (form placement). | UI refinement; implement after B | (none yet) |

Sequence: A → B → C, one writer, in child-letter order. C owns the parent index and the DoD-10 browser note.

### Split rationale

One slice would mix three independently testable concerns on the list page: row-level edit/delete/status (reusing the course-page form/dialog), subtask checklist wiring (reusing `SubtaskChecklist`), and cross-course create (new course selector). Each has its own substantial test surface and its own unsettled UI/UX (row action layout, expand/collapse affordance, course picker), so they split into three children. Backend is untouched; layer labels alone would not justify a split, but the independent test surfaces and UI/UX decisions do.

- **A** — row actions, status Select, title→edit, "View course" link, refetch, component tests (about 2–2.5 hours).
- **B** — subtask toggle/expand on list rows, busy state, refetch, component tests (about 1.5–2 hours).
- **C** — in-place create with course selector, empty-state CTA, refetch, parent index, DoD-10 browser note (about 2–2.5 hours).

No README-only, status-only, or evidence-only child.

## Code baseline (2026-10-26)

- `AssignmentsPage` (`pages/assignments/ui/AssignmentsPage.tsx`) renders `AssignmentListItem[]` from `GET /assignments` with search/filter/sort/status badges, overdue pill, and (title) a `Link` to `/courses/:id`. It has **no** edit/delete/status/subtask/create affordance and **no** refetch-after-mutation helper beyond the initial load. `courses` are already loaded via `listCourses()` for the filter picker.
- `AssignmentsSection` (course page) is the reference implementation for edit/delete/status/subtask/create: `AssignmentForm`, `DeleteAssignmentDialog`, `SubtaskChecklist`, `openEdit`/`openDelete`/`handleStatusChange`/`handleDeleted`, `setBusyIds`, expanded-ids state, `onAssignmentChanged`/`onAssignmentStatusChanged`/`onSubtaskChanged`/`onSubtaskRefresh`/`onSubtaskPending`/`onAssignmentFormOpen`. The list page must mirror a subset.
- `AssignmentForm` takes `courseId: string` (required) and optional `assignment?: CourseAssignment`. It calls `createAssignment({ courseId })` in create mode and `updateAssignment(id, …)` in edit mode. For the list page, edit mode never needs `courseId` (update is by assignment id), and create mode needs a course selector.
- `DeleteAssignmentDialog` takes `assignment: CourseAssignment` and only reads `id` and `title`.
- `SubtaskChecklist` takes `assignmentId`, `assignmentTitle`, `subtasks`, `onChanged`, `onRefresh`, `onBusyChange`, `onPendingAnnouncement` — all compatible with `AssignmentListItem`.
- `AssignmentListItem` carries `id`, `title`, all editable fields, `course: { id, name, code, color } | null`, and `subtasks: Subtask[]`. It is structurally close to `CourseAssignment` but `course` is a narrower projection and the item has no top-level `course` of type `Course`.
- `GET /assignments` and `PATCH/DELETE /assignments/:id` and subtask endpoints already exist (SP-114/SP-120/SP-122); **no backend or schema change** is needed (D124-1).
- `updateAssignment` is already exported and used by the course page.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D124-1 | No backend or schema change. All mutations reuse `createAssignment`/`updateAssignment`/`deleteAssignment` and the subtask endpoints. The list page refetches via the existing `GET /assignments` with the current filter/sort params. | SP-113/SP-114/SP-120/SP-122 already shipped these endpoints. Reversible: a dedicated `GET /assignments/:id` (with subtasks) could be added later but is not required. |
| D124-2 | The course detail page keeps its existing assignment capabilities (edit/delete/status/subtask/create). The list page **adds** the same capabilities; it does not replace them. Two surfaces can edit the same assignment; both refetch their own data. | User direction 2026-10-26 ("keep both"). Avoids regression on the course page and preserves course context. |
| D124-3 | On the list page the assignment **title opens Edit in place** rather than routing to the course page. A separate, smaller "View course" affordance (the course code chip, or a secondary link) still routes to `/courses/:id` when a course exists. Assignments with no course show no course link. | User direction 2026-10-26 ("edits it there instead of routing"). Exact affordance (link vs. button, placement, icon) is left to ui-refiner (D124-7). |
| D124-4 | Status changes on the list page use the same `updateAssignment(id, { status })` path as the course page and trigger a refetch with the current params. Optimistic updates are **not** used; the refetch is the source of truth (matches the course page's `load({ background: true })`). | Consistency with SP-121/SP-122. Reversible. |
| D124-5 | Subtask expansion state on the list page is **local component state keyed by assignment id** and resets on refetch identity change (mirroring SP-123B's reveal/hide reset and SP-120J's expanded-ids pattern). Subtask mutations trigger the page's `onChanged` → refetch. | SP-120J / SP-123B precedent. Reversible. |
| D124-6 | Create on the list page needs a **course selector** (or "No course"). `AssignmentForm` is reused: in create mode with no fixed `courseId`, it renders a Select of the student's courses (already loaded) plus a "No course" option, and the selected value is passed to `createAssignment`. The form's `courseId` prop becomes optional for create mode. | D113-2 (course is optional at create) + the list page already loads courses. Reversible; a separate list-page create component is an alternative if the form grows too complex. |
| D124-7 | Row action layout (Edit/Delete placement, expand/collapse affordance, course picker placement, "View course" affordance, empty-state CTA, responsive stacking) is **left to ui-refiner**; the plan does not invent UI decisions. | Planner assessment per the UI/UX handoff. Children are `Needs refinement`. |
| D124-8 | Component-type widening: `AssignmentForm`'s `assignment` prop and `DeleteAssignmentDialog`'s `assignment` prop are widened to accept `AssignmentListItem` (or a shared structural interface) so the list page can reuse them without casting. No runtime behavior change. | Inspected: both components read only `id`/`title` (dialog) or the editable fields (form), all present on `AssignmentListItem`. |

## Shared contract

No API or schema change. Both children consume the existing surfaces:

- `GET /assignments` → `AssignmentListItem[]` (filters/sort/order per SP-122A) — unchanged; refetched after each mutation with the current params.
- `POST /assignments`, `PATCH /assignments/:id`, `DELETE /assignments/:id` — unchanged (SP-113/SP-114).
- `POST/PATCH/DELETE /assignments/:id/subtasks` — unchanged (SP-120).
- `entities/assignment/api/assignmentApi.ts` — reused; no new methods.
- `features/courses/ui/AssignmentForm.tsx`, `DeleteAssignmentDialog.tsx`, `SubtaskChecklist.tsx` — reused with type widening (D124-8).

## Source requirements and test traceability

This unit adds **no new epic acceptance criterion**; it adds a second editing surface for behavior already owned by SP-113/SP-114/SP-120/SP-121, so the epic's ACs stay with their original owners. It strengthens them by making them reachable from the cross-course list.

| Req | Requirement (original wording) | Owning children (this unit) |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | **SP-124C** (create on the list page, with course selector / "No course"). Original owner SP-113 keeps the course-page surface. |
| AC-E03-03 | Assignments can contain ordered, independently completable subtasks. | **SP-124B** (subtask checklist on list rows). Original owner SP-120 keeps the course-page surface. |
| AC-E03-04 | Students can update assignment status. | **SP-124A** (status Select on list rows). Original owner SP-121 keeps the course-page surface. |
| (SP-114 editing) | Assignment editing and deletion. | **SP-124A** (Edit/Delete on list rows). Original owner SP-114 keeps the course-page surface. |

AC-E03-02/05/06/07 stay with SP-113/SP-115/SP-121/SP-123/SP-122. The epic defines no test requirements. Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (row actions + status), B (subtasks), C (create) |
| 2 invalid-input validation | A (edit form reuses SP-114 validation), C (create form + course selector) |
| 3 student data scoping | Not applicable (no new read/write; existing endpoints remain principal-scoped) |
| 4 actionable API errors | A, B, C (reuse existing error handling; list-page toasts/alerts) |
| 5 loading/empty/error states | A, B, C (list page already has loading/error; add empty-state CTA in C; refetch error toasts) |
| 6 keyboard accessibility | A, B, C (dialogs, form trap, subtask controls, expand toggle) |
| 7 responsive layouts | A, B, C |
| 8 automated business-rule tests | A, B, C (component tests for each surface) |
| 9 API/migration documentation | Not applicable (no API or migration change) |
| 10 integrated development review | C (browser note) + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| List-page mutations cannot read or modify another student's assignment | Student B opens the list and edits/deletes/status-changes an assignment id owned by A | No new read/write surface; `PATCH/DELETE /assignments/:id` and subtask endpoints remain principal-scoped and return the uniform 404 (SP-114/SP-120). The list page only operates on rows returned by the principal-scoped `GET /assignments`. | A/B/C inherit SP-114/SP-120 ownership proof; A adds a component test that a 404 from edit shows the uniform "Resource not found" copy. |
| A refetch after a mutation cannot resurrect a deleted assignment | Delete succeeds, then the list refetches | The deleted id is absent from `GET /assignments`; the row does not reappear. | A component test (delete → refetch list excludes the id). |
| Subtask busy state cannot leak across rows | Two rows expanded; one subtask request in flight | `busyIds` is a `Set<string>` keyed by assignment id; only the row whose id is in the set disables its disclosure. | B component test. |

## Plan correction log

(First plan of this parent. Implementation review findings are appended here
with stable IDs and are never rewritten.)

## Quality gate (2026-10-26)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children. A, B, C each have a substantive independent outcome and a sizing block (2–2.5 h / 1.5–2 h / 2–2.5 h). Split rationale above. No README-only or status-only child. |
| 2. Original AC/TR coverage | Pass | AC-E03-01 (C), AC-E03-03 (B), AC-E03-04 + SP-114 editing (A) are strengthened on a second surface; original owners unchanged. No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Items 3 and 9 are not applicable and recorded. Item 10 is C's browser note plus the combined parent review. Item 11 is reviewer-owned. |
| 4. Contract consistency and integration ownership | Pass | No API contract. Shared components (`AssignmentForm`, `DeleteAssignmentDialog`, `SubtaskChecklist`) are the contract; widening is type-only (D124-8). C owns the parent index. |
| 5. Code paths inspected | Pass | `AssignmentsPage.tsx`, `AssignmentsSection.tsx`, `AssignmentForm.tsx`, `DeleteAssignmentDialog.tsx`, `SubtaskChecklist.tsx`, `assignmentApi.ts`, `academic.ts`. Unverified: exact refetch helper shape on the list page (to be designed in A). |
| 6. Feature-specific risks | Pass | Three counterexamples above. No migration. |
| 7. Dependency mapping | Pass | A → B → C, one writer. A needs SP-114/SP-121/SP-122B (all reviewed). B needs SP-120/SP-122B (reviewed) and benefits from A. C needs SP-113/SP-122B (reviewed) and benefits from A/B. |
| 8. Material decisions | Pass | D124-1…8 are planner-recorded. Row action layout, expand/collapse affordance, course picker placement, and "View course" affordance are deliberately left to ui-refiner (D124-7), not left undecided in the data model. No open material product question. |
| 9. Correction log | Pass | Empty at planning time; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready** (planning gates pass). Children are `Needs refinement` for UI/UX, so none is ready to code until ui-refiner settles D124-7. No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-124 — `docs/stories/EP03/SP-124/`
- **In scope:** SP-124A, SP-124B, SP-124C
- **Integration/index owner:** SP-124C (writes the parent index at `./artifacts/SP-124/implementation.md`)
- **Gate:** one combined SP-124 review after all three children are implemented (`./artifacts/SP-124/review.md` and `walkthrough.md`). Child completion does not sign off the parent.