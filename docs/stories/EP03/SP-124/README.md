# SP-124 Breakdown — Assignment List Cohesion

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-124](./SP-124-assignment-list-cohesion.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Refined 2026-10-26. A implemented 2026-10-26 and awaiting the combined parent review. B and C are `Needs refinement` for list-only UI/UX.
**Jira key:** Pending creation (parent coordination record — no Jira issue; children carry tracker keys)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-124/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-124/` (parent index written by C; review and walkthrough by the reviewer)

**Active substory:** None.

**Next substory:** [SP-124B](./SP-124B-list-adopts-shared-interaction.md) — UI refinement (`ui-refiner`), then implement the list host. B and C stay `Needs refinement` until `ui-refiner` settles their list-only gaps. A is implemented and awaits the combined parent review.

**Implementation owner:** `implementer`, one frontend writer. No backend writer.

**Final review:** One combined SP-124 review after A, B, and C are implemented, including C's parent index and DoD-10 browser note. Final artifacts: `./artifacts/SP-124/review.md` and `./artifacts/SP-124/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-124A-shared-assignment-interaction.md) | Implemented — awaiting parent review | SP-114, SP-120, SP-121, SP-123 reviewed — satisfied. No backend dependency. | Parent review after B and C | [checkpoint](./artifacts/SP-124A/checkpoint.md), [implementation](./artifacts/SP-124A/implementation.md) |
| [B](./SP-124B-list-adopts-shared-interaction.md) | Needs refinement | A implemented. SP-122B reviewed — satisfied. | UI refinement, then implement | (none yet) |
| [C](./SP-124C-shared-create.md) | Needs refinement | A implemented (form lives in the shared feature). B is not a code dependency. | UI refinement, then implement after B | (none yet) |

Sequence: A → B → C, one writer. C owns the parent index and the DoD-10 browser note. C may start after A if B is still in UI refinement; do not start B or C before A, or the list page will grow a second copy of the row.

### Split rationale

The first cut (commit `f3bf575`) split by list-page feature (row actions / subtasks / create) and told each child to reuse course-page components by widening types. That still copies status handling, dialogs, focus, busy state, badges, and the subtask disclosure into `AssignmentsPage`. The complexity is the fork, not three list features.

- **A** extracts one interaction owner and moves assignment UI into `features/assignments/`. Course-page behavior stays the same. Independently verifiable by the existing course-section tests. About 2.5–3 hours. Do not split the move from the extraction: a half-moved layer is the risk this child removes.
- **B** makes the list page a second host of that owner (edit, delete, status, subtasks, title opens edit). No second mutation implementation. About 1.5–2 hours.
- **C** extends the same form with an optional course selector and adds the list-page create entry points. About 1.5–2 hours.

No README-only, status-only, or evidence-only child.

## Architecture

Assignment editing is one user action with two hosts. It does not belong under `features/courses` (that slice is course CRUD and meetings), and it does not belong in `entities/assignment` (entities cannot own action UI, and the ESLint zones forbid `entities/` → `features/`).

```text
pages/courses/CourseDetailPage
  └── features/assignments/AssignmentsSection     # course host: grouping, add, show-completed
        └── useAssignmentActions + AssignmentRow  # the only mutation/dialog/subtask owner
pages/assignments/AssignmentsPage                 # list host: filters, sort, empty states
  └── useAssignmentActions + AssignmentRow        # same owner; list-only slots
entities/assignment/api                           # unchanged HTTP client
```

`features/` may import other `features/` (verified: `apps/web/.eslintrc.cjs` blocks features → widgets/pages/app only). Pages already import features. After A, neither page imports assignment labels from a course section.

### What is shared (one implementation)

| Concern | Owner | Not copied into |
|---|---|---|
| Status select, edit, delete, focus after delete/finish, busy locks | `useAssignmentActions` | either page |
| Badges, overdue pill, due line, subtask disclosure | `AssignmentRow` | `AssignmentsPage` |
| Labels and pill classes | `assignmentPresentation.ts` | `AssignmentsSection` |
| Create/edit form, delete dialog, subtask checklist | moved into `features/assignments/ui/` | a list-page fork |

### What stays host-specific

| Concern | Course host | List host |
|---|---|---|
| Data source / refetch | `getCourse` via `CourseDetailPage` | `listAssignments(currentParams)` |
| Which rows show | unfinished by default; show-completed disclosure (SP-123) | whatever `GET /assignments` returned (SP-122 filters) |
| Title | plain text | opens edit (D124-3) |
| Extra meta | none | course chip + "View course" slot (B) |
| Create course | fixed `courseId` | selector or "No course" (C) |

Hosts refetch their own source. The shared hook does not know about courses, filters, or routes.

### Shared item

Both `CourseAssignment` and `AssignmentListItem` already carry the editable fields and `subtasks`. The interaction accepts that structural shape; it does not require the nested `course`:

```ts
export interface AssignmentInteractionItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  type: AssignmentType | null;
  subtasks: Subtask[];
}
```

`AssignmentForm` (edit) and `DeleteAssignmentDialog` take this item. They must not import `CourseAssignment` as the only accepted prop.

### Hook result (contract)

`useAssignmentActions({ items, onChanged, onStatusChanged, onSubtaskChanged, onSubtaskRefresh, onPending })` returns:

- per-item row bindings: status value, status disabled, expand/busy, open edit, open delete
- one `dialogs` node (edit form, delete dialog) mounted once by the host
- expanded-id reset when `items` changes identity (D124-5)

A host renders `AssignmentRow` for each visible item and `{dialogs}` once. Two hook instances on one page are forbidden — that would double-mount dialogs. The course section therefore keeps unfinished/completed grouping in the host and passes each visible item to the same hook's row bindings.

## Code baseline (2026-10-26)

- `AssignmentsSection` (`features/courses/ui/AssignmentsSection.tsx`, 544 lines) owns create/edit/delete/status/subtasks, focus restoration, busy sets, show-completed, and the pill constants. `AssignmentsPage` imports those constants from the section — the layering smell this plan removes.
- `AssignmentForm` requires `courseId: string` even in edit mode, where the PATCH is by assignment id. `DeleteAssignmentDialog` is typed to `CourseAssignment` and reads only `id` and `title`.
- `SubtaskChecklist` is already parameterized by `assignmentId` + `subtasks`. It does not need a second checklist.
- `GET/POST/PATCH/DELETE /assignments` and the subtask routes exist. **No API or schema change** (D124-1).
- `features/assignments/` does not exist yet.
- ESLint: `features/` may import `features/`; `entities/` may not import `features/`.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D124-1 | No backend or schema change. Mutations stay on the existing assignment client. Each host refetches its own read. | SP-113/114/120/122. Reversible. |
| D124-2 | Course page keeps edit/delete/status/subtasks/create. The list page adds the same actions through the shared owner. It does not replace the course page. | User direction 2026-10-26. |
| D124-3 | On the list, the title opens edit. A separate course affordance still routes to `/courses/:id` when `course` is non-null. No course → no course link. | User direction 2026-10-26. Affordance shape is ui-refiner (D124-7). |
| D124-11 | Edit and create stay the existing modal `AssignmentForm` on both pages. Not an inline row editor, and not a list-only inline panel. Status and subtasks stay inline. | User confirmation 2026-10-26, after rejecting an inline editor. The form is the current dialog (title, due date, estimate, type, priority, description). |
| D124-4 | No optimistic list updates. The host refetch is the source of truth, matching `CourseDetailPage`'s background `getCourse`. | SP-121/SP-122. |
| D124-5 | Expand/busy/pending-status state lives in `useAssignmentActions`, not in each page. Expanded ids reset when `items` changes identity. | SP-120J / SP-123B precedent, moved into the shared owner so it is not reimplemented. |
| D124-6 | Create stays `AssignmentForm`. `courseId` is optional. When omitted, the form shows a course select (caller's course list) plus "No course" and omits `courseId` on POST. Edit mode never shows the select. | D113-1 (course optional at create). Selector placement is ui-refiner. |
| D124-7 | List-only UI (title control, "View course", add-button placement, course-select placement) is left to `ui-refiner`. Do not invent those. Course-row visuals stay as they are in A. | UI/UX handoff. |
| D124-9 | **One feature home:** `apps/web/src/features/assignments/`. Move assignment action UI out of `features/courses/`. Pages compose it. Do not put action components in `entities/` or `shared/`. | FSD layers in `docs/epics/README.md` + `apps/web/.eslintrc.cjs` zones. Planner-recorded 2026-10-26; reversible file move, not a product policy. |
| D124-10 | **One interaction owner.** `useAssignmentActions` + `AssignmentRow` are the only status/edit/delete/subtask/badge implementation. Hosts pass items, slots, and refetch callbacks. A second row implementation on `AssignmentsPage` is a plan violation. | This refinement. Replaces the type-widening-only approach in `f3bf575` (see PC-124-01). |

D124-8 (type widening without a shared owner) is withdrawn. See PC-124-01.

## Shared contract

No API change.

- Reads: `GET /courses/:id` (course host) and `GET /assignments` (list host) — unchanged.
- Writes: existing POST/PATCH/DELETE assignment and subtask routes — unchanged.
- UI contract: `AssignmentInteractionItem`, `useAssignmentActions`, `AssignmentRow`, `assignmentPresentation.ts` as specified above. B and C consume A's exports; they do not re-declare mutation handlers.

## Source requirements and test traceability

No new epic acceptance criterion. This unit makes existing behavior reachable from the cross-course list without a second implementation.

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | **SP-124C** (list create via the shared form). SP-113 keeps the course-page surface. |
| AC-E03-03 | Assignments can contain ordered, independently completable subtasks. | **SP-124A** (checklist stays in the shared row) + **SP-124B** (list host). SP-120 keeps the course-page surface. |
| AC-E03-04 | Students can update assignment status. | **SP-124A** (status select in the shared row) + **SP-124B** (list host). SP-121 keeps the course-page surface. |
| SP-114 editing/deletion | Edit and delete an assignment. | **SP-124A** + **SP-124B**. SP-114 keeps the course-page surface. |

AC-E03-02/05/06/07 stay with SP-113/SP-115/SP-121/SP-123/SP-122. The epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (course behavior preserved through the shared owner), B (list edit/status/delete/subtasks), C (list create) |
| 2 invalid-input validation | C (create form); A/B reuse the existing form validation |
| 3 student data scoping | Not applicable — no new read/write; existing endpoints stay principal-scoped |
| 4 actionable API errors | A (existing toasts/404 copy move with the hook), B and C (host refetch failures toast) |
| 5 loading/empty/error states | B (refetch keeps the last list), C (empty-state create CTA) |
| 6 keyboard accessibility | A (preserve course focus traps), B and C (new list controls) |
| 7 responsive layouts | A (no visual change), B and C |
| 8 automated tests | A (moved course tests stay green + hook test), B and C (list component tests) |
| 9 API/migration documentation | Not applicable — no API or migration change |
| 10 integrated review | C's browser note + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| The shared hook cannot widen ownership | A list-page edit sends another student's assignment id | The hook only receives items from the principal-scoped list or course fetch. PATCH/DELETE remain uniform-404 (SP-114). | B: 404 from edit renders the existing uniform copy |
| Refetch cannot resurrect a delete | Delete succeeds, then the host refetches | The id is absent from the next principal-scoped GET. | B component test |
| Two hosts cannot share in-flight state | Course page and list page are both open in two routes | Each mounted host calls the hook itself. There is no module-level singleton. | A hook test: two hook renders do not share `busyIds` |

## Plan correction log

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-124-01 | 2026-10-26 | Should-fix | `docs/stories/EP03/SP-124/` as of `f3bf575` | Children A/B/C each reimplemented list-page edit, subtasks, and create on top of course-page components (`AssignmentsPage` would grow its own status/busy/expand/dialog state). D124-8 only widened prop types. Consequence: two mutation implementations to keep in sync. | Re-scoped A to extract `features/assignments` (`useAssignmentActions` + `AssignmentRow` + moved form/dialog/checklist). B is a second host, not a second implementation. C extends the same form. Withdrew D124-8; added D124-9 and D124-10. | Compared the new contract with `AssignmentsSection.tsx` (status, dialogs, checklist, badges) and `AssignmentsPage.tsx` (imports labels from the course section, no mutations). List page is specified to render `AssignmentRow`, not a copied action cluster. | Fixed in plan |

## Quality gate (2026-10-26, refined)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Three children. Split reason is the fork risk, not a layer label. Each child has an independent outcome and a sizing block. |
| 2. Original AC/TR coverage | Pass | AC-E03-01/03/04 and SP-114 editing mapped above. No new epic AC. No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Items 3 and 9 recorded not applicable. Item 10 is C plus the parent review. |
| 4. Contract consistency and integration ownership | Pass | UI contract in Architecture. No API contract. C owns the parent index. |
| 5. Code paths inspected | Pass | `AssignmentsSection.tsx`, `AssignmentsPage.tsx`, `AssignmentForm.tsx`, `DeleteAssignmentDialog.tsx`, `SubtaskChecklist.tsx`, `assignmentApi.ts`, `academic.ts`, `apps/web/.eslintrc.cjs`. Unverified: none material. |
| 6. Feature-specific risks | Pass | Three counterexamples above. No migration. |
| 7. Dependency mapping | Pass | A first. B and C depend on A's exports. C does not depend on B's list wiring. |
| 8. Material decisions | Pass | D124-1…7, D124-9, D124-10, D124-11 recorded. List-only copy/placement left to ui-refiner (D124-7). Inline editing is rejected. |
| 9. Correction log | Pass | PC-124-01 preserved with the original faulty claim. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Keys remain `Pending creation`. |

**Outcome:** **Plan Ready.** A is ready to implement. B and C are not ready to code until ui-refinement. No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-124 — `docs/stories/EP03/SP-124/`
- **In scope:** SP-124A, SP-124B, SP-124C
- **Integration/index owner:** SP-124C (`./artifacts/SP-124/implementation.md`)
- **Gate:** one combined review after all three children. Child completion does not sign off the parent.
