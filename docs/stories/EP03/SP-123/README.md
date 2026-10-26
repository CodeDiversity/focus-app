# SP-123 Breakdown — Overdue & Completed Assignment Views

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-123](./SP-123-overdue-and-completed-assignment-views.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Planned 2026-10-26 — breakdown + UI/UX refinement complete (2026-10-26). Children A and B are `Ready`. No implementation, tests, or review yet.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-123/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-123/` (parent index written by B; review and walkthrough by the reviewer)

**Active substory:** None.

**Next substory:** **SP-123A — implement** (Ready: UI/UX settled 2026-10-26; SP-121B reviewed). SP-123B follows A.

**Implementation owner:** `implementer`, sequential across the single frontend writer. The two children are both frontend scope labels, not concurrent writers.

**Final review:** One combined SP-123 review after A and B are implemented, including B's parent index and DoD-10 browser note. No per-child review gate. Final artifacts: `./artifacts/SP-123/review.md` and `./artifacts/SP-123/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-123A-overdue-identification.md) | Ready | SP-121B reviewed (finished/unfinished predicate exists, satisfied 2026-10-26). No backend dependency. | Implement SP-123A | (none yet) |
| [B](./SP-123B-completed-assignment-views.md) | Ready (after A) | SP-121B reviewed (satisfied 2026-10-26). No hard dependency on A, but A should land first to keep the model file coherent. | Implement SP-123B after A | (none yet) |

Sequence: A → B, one writer, in child-letter order. B owns the parent index and the DoD-10 browser note.

### Split rationale

One slice would mix a shared-predicate + two-surface indicator change (overdue identification) with a show-completed affordance, empty-state variants, and reveal/hide state (completed views). Those are independently testable, and the overdue indicator's placement/copy and the completed affordance's choice are both unsettled UI/UX decisions that ui-refiner settles separately.

- **A** has the `isOverdueAssignment` helper, its unit tests, and the overdue indicator on both the course-detail and list-page rows, plus component tests (about 1.5–2 hours).
- **B** has the show-completed affordance, finished-row rendering, counts, empty states, reveal/hide state, component tests, the parent index, and the DoD-10 browser note (about 2–2.5 hours). A third child would only rerun checks and write that index.

## Code baseline (2026-10-26)

- `Assignment.dueDate` is nullable (`DateTime?`, since D113-1). No schema change is needed for story 7.
- `Assignment.status` is the closed five-value enum `PENDING | IN_PROGRESS | COMPLETED | SUBMITTED | GRADED` (SP-121, D121-2).
- `entities/assignment/model/status.ts` exists (SP-121B) with `isUnfinishedAssignment`, `isFinishedAssignment`, and `ASSIGNMENT_STATUSES`. **No overdue predicate exists yet** — SP-123A adds it.
- `AssignmentsSection` (course detail) renders only unfinished assignments by default and shows `All assignments are complete.` when all are finished (SP-121B, D121-4/D121-7). Finished assignments are currently not reachable in the UI — the gap SP-123B closes.
- `AssignmentsPage` (`/assignments`) renders every status returned by `GET /assignments` and filters client-side only through the API params (SP-122B). No overdue indicator exists yet.
- The course projection (`GET /courses/:id`) returns all assignments (D121-5); no API change is needed to reveal finished rows.
- `GET /assignments` is unchanged by this story (D122-1…7); no new query parameter for overdue or completed.
- Backend `assignments` module: no overdue logic; overdue identification stays client-side (D123-1).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D123-1 | Overdue is computed client-side from `dueDate` + `status`; no API field, filter, or schema change. The predicate reuses `isUnfinishedAssignment`. | D121-5 (client-side filter precedent) + D113-5 (past due dates accepted at create). Reversible. |
| D123-2 | Overdue boundary is the assignment's `dueDate` timestamp vs. the current time (strictly before → overdue). No end-of-day grace. | Planner-recorded, reversible; a whole-day grace would be a product change. |
| D123-3 | The completed view is client-side on the course page; the course projection already returns every status (D121-5), so no refetch and no API change. | D121-5 + D121-7 (interim gap closed here). Reversible. |
| D123-4 | Finished = `COMPLETED | SUBMITTED | GRADED` (D121-4); the same predicate (`isFinishedAssignment`) is reused. | D121-4. |
| D123-5 | The show-completed affordance resets its revealed state when the `assignments` prop changes identity, following the SP-120J expanded-ids pattern. | SP-120J precedent. |
| D123-6 | The overdue indicator is text plus color (DoD 6); color never carries the meaning alone. | DoD 6 + D112B-4 badge convention. |
| D123-7 | Indicator placement/copy/color, the completed affordance choice/placement/copy, finished-row de-emphasis, and focus management are left to `ui-refiner` (see each child's UI/UX gaps). | Planner assessment per the UI/UX handoff; do not invent UI decisions. |

## Shared contract

No API or schema change. Both children consume the existing surfaces:

- `GET /courses/:id` → `assignments[]` (all statuses, ordered `dueDate asc` nulls-last, then `title asc`) — unchanged.
- `GET /assignments` → `AssignmentListItem[]` — unchanged (SP-122A contract).
- `entities/assignment/model/status.ts` — extended with `isOverdueAssignment` (A); `isFinishedAssignment` already exists (B reuses it).

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-05 | Completing an assignment removes it from unfinished-work views without deleting it. | **SP-121** (transition + unfinished-view removal) + **SP-123B** (completed view that makes finished work visible again). |
| AC-E03-06 | Overdue work is identified from the deadline and completion status. | **SP-123A** (shared overdue predicate + indicator on course detail and the list page). |

AC-E03-01/02 stay with SP-113/SP-114/SP-115. AC-E03-03 stays with SP-120.
AC-E03-04 stays with SP-121. AC-E03-07 stays with SP-122. The epic defines
no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (overdue indicator), B (completed view) |
| 2 invalid-input validation | Not applicable (no new input) |
| 3 student data scoping | Not applicable (no new read/write; existing surfaces remain scoped) |
| 4 actionable API errors | Not applicable (no API change) |
| 5 loading/empty/error states | B (three empty-state variants); A inherits existing states |
| 6 keyboard accessibility | A and B (indicators and affordance) |
| 7 responsive layouts | A and B |
| 8 automated business-rule tests | A (helper + component), B (component) |
| 9 API/migration documentation | Not applicable (no API or migration change) |
| 10 integrated development review | B (browser note) + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Overdue identification cannot leak another student's data | Student B views the list and looks for A's overdue rows | No new read surface; `GET /assignments` and `GET /courses/:id` remain principal-scoped (SP-122A, SP-112). The overdue predicate is pure presentation over rows already scoped. | A inherits SP-122C's ownership proof; no new test needed |
| The completed view cannot resurrect deleted data | A finished assignment is deleted, then the view is toggled | The toggle only filters the already-fetched `assignments` array; a deleted assignment is absent from the next `getCourse` refetch and therefore absent from the view. | B component test (refetch replaces the array) |
| Reveal/hide sends no request | A student toggles the completed view repeatedly | The affordance is pure client state over the existing prop; no `fetch` is invoked. | B component test (assert no network call) |

## Plan correction log

(First plan of this parent. Implementation review findings are appended here
with stable IDs and are never rewritten.)

## Quality gate (2026-10-26)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Two children. A and B each have a substantive independent outcome and a sizing block (1.5–2 h / 2–2.5 h). Split rationale above. No README-only or status-only child. |
| 2. Original AC/TR coverage | Pass | AC-E03-05 view half owned by B; AC-E03-06 owned by A. AC-E03-01/02/03/04/07 stay with SP-113/114/115/SP-120/SP-121/SP-122. No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Items 2, 3, 4, 9 are not applicable and are recorded as such. Item 10 is B's browser note plus the combined parent review. Item 11 is reviewer-owned. |
| 4. Contract consistency and integration ownership | Pass | No API contract. One shared model file (`status.ts`) is the contract between A and B; A extends it, B consumes `isFinishedAssignment`. B owns the parent index. |
| 5. Code paths inspected | Pass | `status.ts`, `AssignmentsSection.tsx` (+ test), `AssignmentsPage.tsx` (+ test), `CourseDetailPage.tsx`, `academic.ts`, `datetime.ts`, the SP-121/SP-122 breakdowns and READMEs. Unverified: none material. |
| 6. Feature-specific risks | Pass | Three counterexamples above. No migration — the schema already supports every field used. |
| 7. Dependency mapping | Pass | SP-121B reviewed, so A can start after ui-refinement. B waits on ui-refinement (and benefits from A landing first). One writer, A → B. |
| 8. Material decisions | Pass | D123-1…7 are planner-recorded and grounded in D121-4/D121-5/D121-7 and D113-5. UI placement/copy/affordance choice are deliberately left to ui-refiner (D123-7), not left undecided in the data model. No open material product question. |
| 9. Correction log | Pass | Empty at planning time; no prior findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready.** Planning gates pass. A and B are `Needs refinement` for UI/UX, so neither is ready to code. No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-123 — `docs/stories/EP03/SP-123/`
- **In scope:** SP-123A and SP-123B
- **Integration/index owner:** SP-123B (writes the parent index at
  `./artifacts/SP-123/implementation.md`)
- **Gate:** one combined SP-123 review after both children are implemented
  (`./artifacts/SP-123/review.md` and `walkthrough.md`). Child completion does
  not sign off the parent.