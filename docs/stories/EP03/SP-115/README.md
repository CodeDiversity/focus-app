# SP-115 Breakdown — Assignment Types

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-115](./SP-115-assignment-types.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Plan Ready (2026-10-25). SP-115H is not ready to code until `ui-refiner` settles its UI/UX gaps. Not implementation-verified.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-115/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-115/` (parent index written by H; review and walkthrough by the reviewer)

**Active substory:** None.

**Next substory:** SP-115H — run `ui-refiner` (H is not ready to code until its UI/UX gaps are settled). G is implemented; H's dependency on G is met.

**Implementation owner:** `implementer`, sequential across layers. Backend and frontend are scope labels, not concurrent writers.

**Final review:** One combined SP-115 review after G and H are implemented, including H's integration note. No per-child review gate. Final artifacts: `./artifacts/SP-115/review.md` and `./artifacts/SP-115/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [G](./SP-115G-assignment-type-api.md) | Implemented — awaiting parent review | SP-113 and SP-114 reviewed (2026-10-24) | Complete — no action | [checkpoint](./artifacts/SP-115G/checkpoint.md) · [implementation](./artifacts/SP-115G/implementation.md) — unit 194 ✓, DB-backed 37/38/19 ✓ (not skipped), typecheck ✓ |
| [H](./SP-115H-assignment-type-ui.md) | Needs refinement | G implemented before code; UI/UX gaps in H | Run `ui-refiner` on SP-115H | — |
Sequence: G → H, one writer. H owns the parent index and the DoD-10 browser note. There is no third integration story.
### Split rationale

One slice would mix a Prisma enum migration and two duplicated response mappers with form, row, and accessibility work. Those are independently testable, and the UI cannot be verified against a live contract until the API exists.

- **G** has the migration, create/update validation, both projections, ownership tests, and the e2e key/round-trip updates (about 2–2.5 hours).
- **H** has the create/edit control, row presentation, client payload, web fixtures, and the browser note (about 2–2.5 hours). Extending the existing e2e specs is G's ordinary test work. The parent index stays with H. A third child would only rerun checks and write that index.

## Code baseline (2026-10-25)

- `Assignment` (`apps/api/prisma/schema.prisma` 187–207) has no `type` column. `dueDate` is already nullable. Enums: `AssignmentStatus`, `AssignmentPriority`. No `AssignmentType`.
- Assignments API exists: `POST`, `PATCH`, `DELETE` in `apps/api/src/modules/assignments/`. Create and update do not accept `type`. The global pipe rejects it as an unknown field. Tests that encode that rejection: `assignments.service.spec.ts` (`type: 'EXAM'`), `assignments-data-scoping.spec.ts` (`type: 'EXAM'`), `assignments-e2e.spec.ts` (`type: 'ESSAY'`).
- Two response mappers omit `type`: `assignments.service.ts` `toAssignmentResponse` and `courses.service.ts` `toAssignmentResponse` / `AssignmentRow`. Course detail returns that projection from `GET /courses/:id`. Key lists and a length-10 assertion live in `assignments-e2e.spec.ts`, `assignments-data-scoping.spec.ts`, `courses-meetings-e2e.spec.ts`, and `courses.service.spec.ts`.
- Update null rule (D114-5, user decision 2026-10-24): explicit null keeps the stored value. `description: ''` is the only clear. Empty patch body → 400.
- Frontend: `shared/types/academic.ts` `Assignment` / `CourseAssignment` have no `type`. `AssignmentForm.tsx` uses `Select` for priority only. `AssignmentsSection.tsx` shows status and priority badges, not a type. `entities/assignment/api/assignmentApi.ts` omits unset create fields and sends patch fields through. No assignments feature folder; the form stays in `features/courses/ui/` (D113-4).
- Ownership: `ownedWhere` / uniform 404 `Resource not found`. `Assignment` is already in the user-scoped model list.

## Decision register

| ID | Decision | Provenance |
|---|---|---|
| D115-1 | **Closed nullable enum, no default:** `HOMEWORK`, `PAPER`, `PROJECT`, `QUIZ`, `EXAM`. Stored identifiers, not display copy. | Epic user story lists homework, papers, projects, quizzes, and exams. Status and priority are already closed Prisma enums. Optional (AC-E03-02) means null, not a stored `OTHER` or free text. Reversible only before implementation if product rejects this list. |
| D115-2 | **Create omit or null stores null.** No schema default, so an untyped create does not become homework. | Same create rule as optional due date (D113-1). |
| D115-3 | **PATCH omit or null keeps the stored type.** A valid value replaces it. Type cannot be cleared once set. | Applies D114-5 (user decision 2026-10-24) instead of inventing a second null meaning. Same consequence already accepted for due date and estimated duration. |
| D115-4 | **Projection gains one key.** Existing ten keys plus `type` immediately after `priority`. `userId` and `courseId` stay omitted. Both mappers change in G. No shared-helper extraction. | Keeps the SP-112/SP-113 shape stable except for the new field. Downstream list/dashboard stories must tolerate the extra key; this parent does not build those views. |

## Shared API contract

Fixed cross-child contract. G implements it. H consumes it. G's e2e covers the API round-trip, including `GET /courses/:id`. H's browser note covers the visible control.

```text
AssignmentType = "HOMEWORK" | "PAPER" | "PROJECT" | "QUIZ" | "EXAM"

POST /assignments
  body adds type?: AssignmentType | null | omitted
  omit or null → stored null
  valid value → stored value
  any other JSON value → 400 field error on type; no write
  201 → previous projection plus type: AssignmentType | null
        (11 keys; type immediately after priority;
         no userId, courseId, or nested course)

PATCH /assignments/:id
  body adds type?: AssignmentType | null | omitted
  omit or null → stored type unchanged (D115-3)
  valid value → replaces stored type
  any other JSON value → 400 field error on type; no write
  type alone satisfies "at least one field"
  empty body → 400 "At least one field must be provided"
  200 → same 11-key projection

GET /courses/:id
  assignments[] uses the same 11-key projection
  ordering unchanged: dueDate asc, title asc

Still rejected on create and update (400 unknown field):
  status, actualHours, userId
Still rejected on update: courseId
Create courseId rules are unchanged (malformed, missing, or foreign → uniform 404).
Cross-student assignment id → uniform 404; target type unchanged.
401 unauthenticated, unchanged.
```

Validation stays backend-authoritative (`FieldValidationPipe` plus service re-check). H must not tell the student that a blank type clears a stored value.

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | Unchanged — SP-113. G and H only add an optional field on that create. |
| AC-E03-02 | Optional fields include due date, estimated duration, type, and priority. | Due date, estimated duration, and priority — SP-113/SP-114. **Type — SP-115G (API) and SP-115H (UI).** |

AC-E03-03…07 stay with proposed stories 4–7 (not broken down). The epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | G (API type), H (visible type) |
| 2 invalid-input validation | G (DTO + service); H mirrors the enum |
| 3 student data scoping | G (existing gates; type does not bypass them). H shows the uniform 404. |
| 4 actionable API errors | G (field-level 400); H displays `type` errors |
| 5 loading/empty/error states | H (form in-flight and null type not shown as a category) |
| 6 keyboard accessibility | H |
| 7 responsive layouts | H |
| 8 automated business-rule tests | G (unit, data-scoping, e2e); H (component) |
| 9 API/migration documentation | G (this contract + one migration) |
| 10 integrated development review | H browser note + the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Type does not bypass ownership | Student B patches student A's assignment with `type: "HOMEWORK"` | Existing `ownedWhere` read/update → uniform 404; A's type unchanged | G data-scoping and e2e |
| Invalid type does not write | Client sends `type: "ESSAY"` or `type: 1` on create or patch | `@IsIn` + service re-check → 400 field error; no write | G unit, data-scoping, e2e |
| Type does not unlock lifecycle fields | Client sends `type: "QUIZ"` plus `status: "COMPLETED"` | `status` stays non-whitelisted → 400; no write | G unit and e2e |
| Projection does not leak ownership | A created typed assignment is read from course detail | Both mappers omit `userId` and `courseId`; cross-student course read stays 404 | G course projection tests and e2e key assertion |

Keep-on-null is a contract invariant, not a security claim: patch `type: null` leaves the stored type. G tests that directly. H must not present a clear affordance for it.

## Plan correction log

No prior plan review. Implementation findings, if any, are appended here and not rewritten.

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| PC-115-01 | 2026-10-25 | High | `docs/stories/EP03/README.md` Execution queue, lines 50–62 before this plan | The live EP03 queue still named SP-113A and SP-114D as the next implementation actions after both parents were reviewed on 2026-10-24. | Queue now points at SP-115G. Stories 1–2 are marked complete. Story 3 is this parent. | Compared [SP-113 README](../SP-113/README.md) next-substory None and [SP-114 README](../SP-114/README.md) reviewed 2026-10-24 with the updated EP03 queue. | Fixed in plan |
| PC-115-02 | 2026-10-25 | Medium | `docs/stories/EP03/README.md` Code baseline (2026-10-24) | That section still said `dueDate` was required, no assignments API existed, and the course section had no create control. | Left the dated paragraph as history and added a 2026-10-25 superseding note. SP-113 inventory row now says reviewed. | Checked schema `dueDate DateTime?`, `apps/api/src/modules/assignments/`, and `entities/assignment/api/assignmentApi.ts` against the note. | Fixed in plan |

## Quality gate (2026-10-25)

| Gate | Status | Evidence / limitation |
|---|---|---|
| 1. Child separation and sizing | Pass | Two children. G and H each have a sizing block and a substantive independent outcome (API/migration/projections vs form/row/client). Split reason is above. No README-only or integration-only child. Estimates are 2–2.5 hours, not padded with agent overhead. |
| 2. Original AC/TR coverage | Pass | AC-E03-02 type is owned by G and H. The other AC-E03-02 fields stay with SP-113/SP-114. AC-E03-01 stays with SP-113. AC-E03-03…07 stay assigned to stories 4–7 in the EP03 README. No epic TRs. |
| 3. Applicable DoD, incl. item 10 | Pass | DoD map above. Item 10 is H's browser note plus the combined parent review. Item 11 is reviewer-owned and not pretended done. |
| 4. Contract consistency and integration ownership | Pass | One contract in this README. G implements it, including e2e. H consumes it and owns the parent index. No third child. |
| 5. Code paths inspected | Pass | Schema, both mappers, both DTOs, controller, validation pipe, assignment and course tests, form, section, client, and `academic.ts`, as cited in the children. Unverified: none material. Generated Prisma client was not treated as a source file. |
| 6. Feature-specific risks | Pass | Four counterexamples above, plus keep-on-null. Migration is a nullable add with no backfill; existing rows become null rather than a default type. |
| 7. Dependency mapping | Pass | SP-113/SP-114 reviewed, so G can start. H waits on G's implementation and on ui-refiner. One writer, G then H. |
| 8. Material decisions | Pass | D115-1 comes from the epic's named categories. D115-2 follows optional due date. D115-3 applies the recorded D114-5 user decision. D115-4 is the projection shape. Display copy is deliberately left to ui-refiner, not left undecided in the API. |
| 9. Correction log | Pass | PC-115-01 and PC-115-02 recorded and checked against the child READMEs and the current assignments module. No prior review findings to preserve. |
| 10. Jira identity/sync | Not applicable | No sync authorized. Parent and children are `Pending creation`. No tracker mutation. |

**Outcome:** **Plan Ready.** Planning gates pass. H is `Needs refinement` for UI/UX, so it is not ready to code. Implementation of G is not blocked. No application code or passing tests are claimed.

## Final implementation review unit

- **Parent:** SP-115 — `docs/stories/EP03/SP-115/`
- **In scope:** SP-115G and SP-115H
- **Integration/index owner:** SP-115H (`./artifacts/SP-115/implementation.md`)
- **Gate:** one combined review after both children are implemented (`./artifacts/SP-115/review.md` and `walkthrough.md`). Child completion does not sign off the parent.
