# SP-121 Breakdown — Completion & Status Tracking

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-121](./SP-121-completion-and-status-tracking.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Reviewed 2026-10-26 (combined parent review passed — [review](./artifacts/SP-121/review.md) · [walkthrough](./artifacts/SP-121/walkthrough.md)). Children A and B are `Reviewed`.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-121/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-121/` (parent index written by B; review and walkthrough by the reviewer)

**Active substory:** None (review unit complete).

**Next substory:** **None** — review unit complete (`Reviewed` 2026-10-26).

**Implementation owner:** `implementer`, sequential across layers. Backend and frontend are scope labels, not concurrent writers.

**Final review:** One combined SP-121 review after A and B are implemented, including B's integration note. No per-child review gate. Final artifacts: `./artifacts/SP-121/review.md` and `./artifacts/SP-121/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [A](./SP-121A-assignment-status-api.md) | Reviewed | SP-113/SP-114/SP-115 reviewed (satisfied 2026-10-25). SP-120 is implemented but is **not** a dependency (baseline note below) | None — review unit complete | [implementation.md](./artifacts/SP-121A/implementation.md), [checkpoint](./artifacts/SP-121A/checkpoint.md); [review](./artifacts/SP-121/review.md) · [walkthrough](./artifacts/SP-121/walkthrough.md) |
| [B](./SP-121B-assignment-status-ui.md) | Reviewed | A implemented (satisfied 2026-10-26); UI/UX gaps settled 2026-10-26 | None — review unit complete | [implementation.md](./artifacts/SP-121B/implementation.md), [checkpoint](./artifacts/SP-121B/checkpoint.md); parent index [artifacts/SP-121/implementation.md](./artifacts/SP-121/implementation.md); [review](./artifacts/SP-121/review.md) · [walkthrough](./artifacts/SP-121/walkthrough.md) |

Sequence: A → B, one writer, in child-letter order (D121-6). B owns the parent index and the DoD-10 browser note. There is no third integration story.

### Split rationale

One slice would mix a one-field DTO/service contract change plus the forced
updates to the tests that encode today's `status` rejection (backend)
with row-control and view-filtering UI work (frontend). Those are
independently testable, and the UI cannot be verified against a live
contract until the API accepts `status`.

- **A** has the DTO field, the service merge, the contract update, and the
  unit/data-scoping/e2e updates — including retiring the four update-path
  rejection cases that D121-2 supersedes (about 1–1.5 hours).
- **B** has the status control, the unfinished-only default view with its
  two empty states, the shared status helper, the client type, component
  tests, the browser note, and the parent index (about 2–2.5 hours). A
  third child would only rerun checks and write that index.

## Code baseline (2026-10-26)

- `Assignment.status` exists — `AssignmentStatus @default(PENDING)`
  (`apps/api/prisma/schema.prisma` 198, 212–218):
  `PENDING | IN_PROGRESS | COMPLETED | SUBMITTED | GRADED`. **No migration**
  is needed for story 5.
- `status` is currently **rejected on create and update** as an unknown
  field (400, whitelist + `forbidNonWhitelisted`). The rejection is
  encoded in tests that A must update, not only extend:
  - `assignments.service.spec.ts` — update paths: the service-level
    `it.each([['status', 'COMPLETED'], ['actualHours', 5], …])`
    "rejects unknown %s=%p…" (~line 349) and the pipe-level
    `it.each([… ['status', 'COMPLETED'], …])` "rejects %s=%p at pipe
    level" (~line 480). The create-path cases (~line 183) **stay**
    (D121-1).
  - `assignments-data-scoping.spec.ts` — the update-path unknown-fields
    loop inside "PATCH '' clears the stored description; empty body and
    unknown fields 400 without writes" (~line 268) drops
    `['status', 'COMPLETED']`; the create-path `it.each` (~line 205)
    **stays**.
  - `assignments-e2e.spec.ts` — the update-path `it.each` "rejects
    invalid edit %s=%p…" (~line 418) drops `['status', 'COMPLETED']`; the
    create-path `it.each` (~line 211) **stays**.
- Update semantics (SP-114D, D114-1…5): partial merge; omitted or
  explicit `null` keeps the stored value (`has()`); validation runs on
  the **merged** values; empty body → 400; `description: ''` is the only
  clear; the write is scoped `ownedWhere(userId, id)` with the P2025 →
  uniform-404 normalization.
- The 11-key `toAssignmentResponse` (`assignments.service.ts` 11–25)
  already includes `status`; the course mapper (`courses.service.ts`
  `toAssignmentResponse` / `AssignmentRow`) mirrors it. `GET /courses/:id`
  includes **all** assignments (`assignments: { where: { userId },
  orderBy: [{ dueDate: 'asc' }, { title: 'asc' }] }`) — no status filter
  (D121-5 keeps it that way).
- Frontend: `shared/types/academic.ts` `AssignmentStatus` is the same
  five values; `Assignment.status: AssignmentStatus`.
  `AssignmentsSection.tsx` renders a **read-only** status `Badge`
  (`STATUS_STYLES` / `STATUS_LABELS` cover all five).
  `UpdateAssignmentRequest` (`entities/assignment/api/assignmentApi.ts`)
  has no `status` key.
- `AssignmentsSection` receives the full `CourseAssignment[]` and renders
  it as-is ("no client re-sort"); the empty state `No assignments yet.`
  shows only when the array itself is empty. No status helper exists yet.
- `CourseDetailPage` wires `onAssignmentChanged('added' | 'updated' |
  'deleted')` → live-region sentence + background refetch (D112B-10);
  subtask mutations use their own callbacks (the SP-120J precedent).
- SP-120 (subtasks) is implemented on `main` (`5e65cfc` I, `a1ec584` J).
  Its combined review (2026-10-25, report at
  [../SP-120/artifacts/SP-120/review.md](../SP-120/artifacts/SP-120/review.md)
  — uncommitted, reviewer-owned) returned **changes required** with two
  execution-evidence findings (IR-120-1: the DoD-10 browser pass was not
  executed; IR-120-2: the automated gates were not independently run) and
  **no code defect**. Story 5 does not depend on SP-120: it builds on the
  reviewed SP-113/SP-114/SP-115 assignments API.
- E2E harness: `apps/api/src/test/test-http.ts` (`createIntegrationApp` —
  real HTTP, real Postgres, self-skips without `DATABASE_URL`).

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D121-1 | **Status is PATCH-only.** `CreateAssignmentDto` stays without `status`; a new assignment always starts at the schema default `PENDING`. | The create service comment already reads "status and omitted priority deliberately use schema defaults"; D120-4 keeps subtask status off create ("never taken from the client"). The epic asks for *updating* status, not setting it at creation. Reversible: accepting it on create later is additive. |
| D121-2 | **PATCH `status` accepts the full closed enum** — `PENDING | IN_PROGRESS | COMPLETED | SUBMITTED | GRADED` (`@IsIn`); any other JSON value → 400 field error, no write. | The schema enum is closed with five values and the badge UI already renders all five labels (`STATUS_LABELS`). Unlike a subtask checkbox (D120-4: two states), an assignment status is a lifecycle picker. Planner-recorded, reversible; flagged for user confirmation in the planning handoff. |
| D121-3 | **Null semantics follow D114-5:** omitted or explicit `null` keeps the stored status; a status-only body counts as a non-empty patch. | The keep-on-null rule already accepted for every other PATCH field (D114-5, D115-3). |
| D121-4 | **Unfinished = `PENDING | IN_PROGRESS`; finished = `COMPLETED | SUBMITTED | GRADED`.** The course-detail assignments section — the unfinished-work view — renders only unfinished assignments by default. | The enum reads as a lifecycle progression; its last three values are states where the student has no remaining action, so AC-E03-05's "completing … removes it from unfinished-work views" holds a fortiori for them. Alternative considered: hiding only `COMPLETED` — rejected, because a submitted or graded assignment is not unfinished work either. Planner-recorded, reversible; flagged for user confirmation. |
| D121-5 | **The unfinished filter is client-side** in `AssignmentsSection`; the course-detail projection keeps returning every status (no API change for the view). The predicate lives in one shared helper, `entities/assignment/model/status.ts`, that story 7 reuses for the overdue rule. | Keeps the one-fetch pattern (D112B-13) and the API contract stable; story 7's completed/overdue views build on the same projection without an API change. The section already receives the full array. |
| D121-6 | **Child lettering restarts at A for SP-121** (`SP-121A`, `SP-121B`), and the children are planned and executed in strict alphabetical order A → B. | User direction 2026-10-26. This deliberately deviates from the epic-wide continuous child lettering used so far (SP-113 A–C, SP-114 D–F, SP-115 G–H, SP-120 I–J; the next free letters would be K–L). The note lives here and in the [EP03 README](../README.md) because the planner's write scope is `docs/` only — it is not written to `.agents/`. Stable IDs are unaffected: `SP-121A`/`SP-121B` are unique either way. |
| D121-7 | **Interim reachability is recorded, not hidden:** between SP-121B and story 7, a finished assignment is not reachable in the UI — it is removed from the only view until story 7 adds the completed view. | AC-E03-05 requires removal from unfinished-work views; the view that restores access is story 7 (the AC-E03-05 view half). The gap is one story wide. The record persists (a status change is a PATCH, never a DELETE) — reviewers must not read the disappearance as data loss. |

## Shared API contract

Fixed cross-child contract. A implements it. B consumes it. A's e2e covers
the API round-trip. B's browser note covers the visible control and view.

```text
AssignmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SUBMITTED" | "GRADED"

PATCH /assignments/:id
  body adds status?: AssignmentStatus | null | omitted
  omit or null → stored status unchanged (D121-3)
  valid value → replaces the stored status
  any other JSON value → 400 field error on status; no write
  status alone satisfies "at least one field"
  empty body → 400 "At least one field must be provided" (unchanged)
  200 → the same 11-key projection; status reflects the new value

POST /assignments — unchanged (D121-1): status stays a rejected unknown
field; a new assignment is created PENDING (schema default).

Still rejected on update (400 unknown field): actualHours, courseId, userId.
Still rejected on create: status, actualHours, userId.
Cross-student assignment id → uniform 404; the target status is unchanged.
401 unauthenticated, unchanged.

GET /courses/:id — unchanged (D121-5): assignments[] still returns every
status, ordered dueDate asc (nulls last), then title asc. The unfinished
filter is client-side.
```

Validation stays backend-authoritative (`FieldValidationPipe` plus the
service re-check on merged values). B must not tell the student that an
unset control clears a stored status.

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-04 | Students can update assignment status. | **SP-121A** (API accepts, validates, stores status) + **SP-121B** (status control on the assignment row). |
| AC-E03-05 | Completing an assignment removes it from unfinished-work views without deleting it. | **SP-121A** (the transition is a PATCH — no delete path is involved) + **SP-121B** (the course-detail section renders only unfinished assignments by default). The completed/overdue views that make finished work visible again — story 7 (not broken down). |

AC-E03-01/02 stay with SP-113/SP-114/SP-115. AC-E03-03 stays with SP-120.
AC-E03-06 (overdue identification) stays with story 7 and AC-E03-07
(course/date/status filtering) with story 6 — both not broken down. The
epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | A (API status transition), B (control + view) |
| 2 invalid-input validation | A (DTO + service re-check); B mirrors the enum |
| 3 student data scoping | A (existing gates; status does not bypass them). B shows the uniform 404. |
| 4 actionable API errors | A (field-level 400); B displays status errors |
| 5 loading/empty/error states | B (the two empty states, in-flight, failure toast) |
| 6 keyboard accessibility | B (the status control) |
| 7 responsive layouts | B |
| 8 automated business-rule tests | A (unit, data-scoping, e2e); B (component + helper) |
| 9 API/migration documentation | A (this contract; no migration) |
| 10 integrated development review | B browser note + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| A status patch does not bypass ownership | Student B patches student A's assignment with `status: "COMPLETED"` | Existing `ownedWhere` read/update → uniform 404; A's status unchanged | A data-scoping and e2e |
| An invalid status does not write | Client sends `status: "DONE"`, `status: "completed"` (lowercase), or `status: 1` on patch | `@IsIn` on the five stored values + service re-check → 400 field error; no write | A unit, data-scoping, e2e |
| Status does not unlock other lifecycle fields | Client sends `status: "COMPLETED"` plus `actualHours: 5` on patch | `actualHours` stays a non-whitelisted unknown field → 400; no write | A unit and e2e |
| Create stays PENDING | Client sends `status: "COMPLETED"` on create | `status` stays a rejected unknown field on `CreateAssignmentDto` → 400; the created row is PENDING | A unit, data-scoping, e2e |
| The view filter is not a security boundary | A finished assignment is still returned by `GET /courses/:id` | D121-5: the projection is unchanged; hiding is presentation only. Every read/write stays scoped by `userId` (DoD 3) | A course projection assertions; B component tests assert rendering only |
| Keep-on-null is a contract invariant, not a security claim | patch `status: null` leaves the stored status | D121-3; A tests it directly. B must not present a clear affordance for it | A unit/e2e |

## Plan correction log

(First plan of this parent. The EP03-level queue repair made while
registering SP-121 is logged below; implementation review findings are
appended here with stable IDs and are never rewritten.)

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-121-01 | 2026-10-26 | Medium | `docs/stories/EP03/README.md` Status line and Execution queue, SP-120 paragraphs | The epic-level queue still said SP-120 was Plan Ready with next substory SP-120I — implement, and SP-120J Needs refinement — after SP-120J was refined (2026-10-25) and both children were implemented (`5e65cfc`, `a1ec584`), and the combined review returned changes-required (IR-120-1/2, no code defect). | The EP03 README now records SP-120 as implemented with the combined review's changes-required outcome and open findings, citing the review report path; SP-121 is registered as the next planning unit. SP-120's own README and the reviewer's report are untouched (reviewer/coordinator-owned). | Compared `git log` (`5e65cfc`, `c7007db`, `a1ec584`), [SP-120 README](../SP-120/README.md) queue ("Implemented — awaiting parent review"), and the [SP-120 review report](../SP-120/artifacts/SP-120/review.md) (untracked) verdict "Changes required" against the rewritten paragraphs. | Fixed in plan |
| IR-121-1 | 2026-10-26 | Should-fix | `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` | Pass-1 finding: missing frontend component tests for the status control flow (DoD 8; story B Tests list). | Implementer added 7 cases (render/options/aria-label, PATCH exactly `{ status }`, in-flight disable, finished removal + no DELETE, both empty states, failure toast, focus move). Committed `18bab0a5c6adf126bd4d495867e3d07114f4f972`. Statically verified in pass 2. | [review.md](./artifacts/SP-121/review.md) (pass 2) | Resolved |
| IR-121-2 | 2026-10-26 | Should-fix | `apps/web/src/entities/assignment/api/assignmentApi.test.ts` | Pass-1 finding: missing status-through exact-body assertion. | Implementer added the `{ status: 'COMPLETED' }` exact-body case. Committed `18bab0a5c6adf126bd4d495867e3d07114f4f972`. Statically verified in pass 2. | [review.md](./artifacts/SP-121/review.md) (pass 2) | Resolved |
| IR-121-3 | 2026-10-26 | Should-fix | `apps/web/src/pages/courses/ui/CourseDetailPage.test.tsx` | Pass-1 finding: missing status-wiring test (live-region sentence + background refetch). | Implementer added the wiring case. Committed `18bab0a5c6adf126bd4d495867e3d07114f4f972`. Statically verified in pass 2. | [review.md](./artifacts/SP-121/review.md) (pass 2) | Resolved |
| IR-121-4 | 2026-10-26 | Should-fix | `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (DoD-10) | Pass-1 finding: DoD-10 browser pass not executed (CANNOT VERIFY). | User executed all six steps on 2026-10-26 and confirmed pass; recorded in `artifacts/SP-121B/implementation.md` (DoD-10 note). | [review.md](./artifacts/SP-121/review.md) (pass 2) · [walkthrough.md](./artifacts/SP-121/walkthrough.md) | Resolved |
| IR-121-5 | 2026-10-26 | Polish (optional) | `apps/web/src/features/courses/ui/AssignmentsSection.tsx` | Pass-1 finding (optional): status control hardcodes the lifecycle array instead of reusing `ASSIGNMENT_STATUSES`. | Remains open; non-blocking. No correction applied. | [review.md](./artifacts/SP-121/review.md) (pass 2) | Open (polish) |

## Quality gate (2026-10-26)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Two children. A and B each have a sizing block and a substantive independent outcome (DTO/service/tests vs control/view/helper). Split reason above. No README-only or integration-only child. Estimates 1–1.5 and 2–2.5 hours, not padded with agent overhead. |
| 2. Original AC/TR coverage | Pass | AC-E03-04 owned by A and B; AC-E03-05 split recorded (transition + unfinished-view removal here; completed/overdue views in story 7). AC-E03-01/02/03 stay with SP-113/114/115/120. AC-E03-06/07 stay assigned to stories 6–7 in the [EP03 README](../README.md). No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Item 10 is B's browser note plus the combined parent review. Item 11 is reviewer-owned and not pretended done. |
| 4. Contract consistency and integration ownership | Pass | One contract in this README. A implements it, including e2e. B consumes it and owns the parent index. No third child. |
| 5. Code paths inspected | Pass | Schema (Assignment model, enums), assignments module (controller, service, both DTOs), the three assignment spec files' status cases, courses service (get projection, toAssignmentResponse), ownership helper, validation pipe, `academic.ts`, `assignmentApi.ts`, `AssignmentsSection.tsx`, `CourseDetailPage.tsx`, `AssignmentForm.tsx` (the Select precedent), `shared/ui/` (Button/Input/Select). Unverified: none material. Generated Prisma client was not treated as a source file. |
| 6. Feature-specific risks | Pass | Six counterexamples above. No migration — the `status` column and enum already exist. |
| 7. Dependency mapping | Pass | SP-113/SP-114/SP-115 reviewed, so A can start. B waits on A's implementation and on ui-refiner. One writer, A then B. SP-120's open review findings are execution evidence, not a code blocker, and story 5 does not depend on SP-120. |
| 8. Material decisions | Pass | D121-1 follows the existing create default + D120-4. D121-2 uses the closed schema enum the UI already renders. D121-3 applies D114-5. D121-4/D121-5 are planner-recorded, reversible, and flagged for user confirmation. D121-6 records the user's 2026-10-26 lettering/order direction. Display copy and control choice are deliberately left to ui-refiner, not left undecided in the API. |
| 9. Correction log | Pass | PC-121-01 recorded; the EP03 queue repair is verified against git, the SP-120 README, and the review report. No prior review findings exist for this parent. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready.** Planning gates pass. B is `Needs refinement`
for UI/UX, so it is not ready to code. Implementation of A is not blocked.
No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-121 — `docs/stories/EP03/SP-121/`
- **In scope:** SP-121A and SP-121B
- **Integration/index owner:** SP-121B (`./artifacts/SP-121/implementation.md`)
- **Gate:** one combined review after both children are implemented (`./artifacts/SP-121/review.md` and `walkthrough.md`). Child completion does not sign off the parent.
