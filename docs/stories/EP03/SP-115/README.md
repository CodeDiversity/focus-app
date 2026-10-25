# SP-115 Breakdown — Assignment Types

**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Parent:** [SP-115](./SP-115-assignment-types.md) — coordination record (not an implementation ticket)
**Milestone:** M1
**Status:** Draft — SP-115G filed 2026-10-25. SP-115H is the next planning commit. Not Plan Ready until that child exists and the cross-file gate is rerun.
**Jira key:** Pending creation (no sync authorized)

## Execution queue

**Delivery home:** `docs/stories/EP03/SP-115/`

**Artifact root:** `./artifacts/` (stable story IDs)

**Parent artifacts:** `./artifacts/SP-115/` (parent index written by the frontend child once filed; review and walkthrough by the reviewer)

**Active substory:** None — planning in progress.

**Next substory:** SP-115H — file the frontend child. Do not implement G until this breakdown is Plan Ready.

**Implementation owner:** `implementer`, sequential across layers. Backend and frontend are scope labels, not concurrent writers.

**Final review:** One combined SP-115 review after every child and the integration obligation are implemented. No per-child review gate. Final artifacts: `./artifacts/SP-115/review.md` and `./artifacts/SP-115/walkthrough.md`.

| Story | State | Dependencies / blockers | Next action | Evidence / artifacts |
|---|---|---|---|---|
| [G](./SP-115G-assignment-type-api.md) | Ready | SP-113 and SP-114 reviewed (2026-10-24) | Wait — parent plan is still Draft | — |
| H | Not filed | G's contract, then ui-refiner before code | File SP-115H | — |

Sequence once both children exist: G → H, one writer. The frontend child owns the parent index and the DoD-10 browser walk. There is no third integration story: extending the existing assignment e2e specs is G's ordinary test work.

### Split rationale

One slice would mix a Prisma enum migration and two duplicated response mappers with form, row, and accessibility work. Those are independently testable, and the UI cannot be verified against a live contract until the API exists.

- **G** has the migration, create/update validation, both projections, ownership tests, and the e2e key/round-trip updates (about 2–2.5 hours).
- **H** (next file) has the create/edit control, row presentation, client payload, web fixtures, and the browser walk (about 2–2.5 hours). A separate integration child would only rerun those checks and write the parent index, which the sizing policy forbids.

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

Fixed cross-child contract. G implements it. The frontend child will consume it. G's e2e covers the API round-trip, including `GET /courses/:id`.

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

Validation stays backend-authoritative (`FieldValidationPipe` plus service re-check). The frontend must not tell the student that a blank type clears a stored value.

## Source requirements and test traceability

Epic wording: [EP03 acceptance criteria](../../../epics/EP03-assignment-and-task-management.md#acceptance-criteria). Stable IDs: [EP03 breakdown](../README.md).

| Req | Requirement (original wording) | Owning children |
|---|---|---|
| AC-E03-01 | Students can create an assignment with a title and course. | Unchanged — SP-113. G only adds an optional field on that create. |
| AC-E03-02 | Optional fields include due date, estimated duration, type, and priority. | Due date, estimated duration, and priority — SP-113/SP-114. **Type API — SP-115G.** Type UI — SP-115H, not yet filed. |

AC-E03-03…07 stay with proposed stories 4–7 (not broken down). The epic defines no test requirements.

Shared DoD ([docs/epics/README.md](../../../epics/README.md#definition-of-done)):

| DoD | Owner / applicability |
|---|---|
| 1 functional criteria | G for API type; H for visible type (not filed) |
| 2 invalid-input validation | G (DTO + service); H mirrors the enum (not filed) |
| 3 student data scoping | G (existing gates; type does not bypass them) |
| 4 actionable API errors | G (field-level 400); H displays `type` errors (not filed) |
| 5 loading/empty/error states | H (not filed). No new empty API state. |
| 6 keyboard accessibility | H (not filed) |
| 7 responsive layouts | H (not filed) |
| 8 automated business-rule tests | G (unit, data-scoping, e2e). H component tests not filed. |
| 9 API/migration documentation | G (this contract + one migration) |
| 10 integrated development review | Frontend child, once filed, plus the combined parent review |
| 11 reviewer walkthrough | Final reviewer, once, for the parent. Not an implementer child. |

## Security invariants and counterexamples

| Claim | Counterexample | Mechanism | Owning test |
|---|---|---|---|
| Type does not bypass ownership | Student B patches student A's assignment with `type: "HOMEWORK"` | Existing `ownedWhere` read/update → uniform 404; A's type unchanged | G data-scoping and e2e |
| Invalid type does not write | Client sends `type: "ESSAY"` or `type: 1` on create or patch | `@IsIn` + service re-check → 400 field error; no write | G unit, data-scoping, e2e |
| Type does not unlock lifecycle fields | Client sends `type: "QUIZ"` plus `status: "COMPLETED"` | `status` stays non-whitelisted → 400; no write | G unit and e2e |
| Projection does not leak ownership | A created typed assignment is read from course detail | Both mappers omit `userId` and `courseId`; cross-student course read stays 404 | G course projection tests and e2e key assertion |

Keep-on-null is a contract invariant, not a security claim: patch `type: null` leaves the stored type. G tests that directly.

## Plan correction log

No prior plan review. Implementation findings, if any, are appended here and not rewritten.

| ID | Date | Severity | Original location | Original finding | Correction | Verification | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | None yet. | — | — | — |

## Quality gate (2026-10-25)

Not run as a passing gate. H is not filed, so rows 1–4 and 7–8 are incomplete. Outcome: **Draft**.

## Final implementation review unit

- **Parent:** SP-115 — `docs/stories/EP03/SP-115/`
- **In scope:** SP-115G and SP-115H (H not filed)
- **Integration/index owner:** SP-115H, once filed. G does not write the parent index.
- **Gate:** one combined review after both children are implemented. Child completion does not sign off the parent.
