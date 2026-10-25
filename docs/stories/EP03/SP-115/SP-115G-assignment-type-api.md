# SP-115G: Assignment Type API

**Story ID:** SP-115G
**Title:** Backend: optional assignment type on create, update, and course projection
**Parent:** [SP-115](./SP-115-assignment-types.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Backend
**Status:** Ready
**Dependencies:** SP-113A and SP-114D implemented (both reviewed 2026-10-24). No open blocker.
**Jira key:** Pending creation

## Summary

Add an optional closed `type` to an assignment. Creating or editing can set
homework, paper, project, quiz, or exam. Omitting it stores null. A later
patch that omits `type` or sends null keeps the stored value. Create, update,
and the course-detail projection all return the same field, and no other
student's assignment can be classified.

## Bounded scope

In: one nullable Prisma enum column, create and update DTO/service handling,
both existing assignment response mappers, and the tests those changes force
(including the existing e2e key lists and a type round-trip).

Out: the course-detail control and row presentation
([SP-115H](./SP-115H-assignment-type-ui.md)). Status, `actualHours`, and
`courseId` remain uneditable. This story does not add a list, filter, or
overdue rule for type.

## Source requirement references

- **AC-E03-02** — "Optional fields include due date, estimated duration, type,
  and priority." This child owns **type** on the API. Due date, estimated
  duration, and priority stay owned by SP-113/SP-114.
- **AC-E03-01** — create already exists; type is an optional field on that
  same create, not a new resource.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1–4, 8, and 9. Items 5–7 and 10 are the frontend child's. Item 11 is
  the final reviewer walkthrough for the parent, not this child's deliverable.
- Contract and D115-1…3 in the [SP-115 README](./README.md).

## Acceptance criteria

1. **Persistence.** `AssignmentType` is a Prisma enum with exactly
   `HOMEWORK`, `PAPER`, `PROJECT`, `QUIZ`, `EXAM`. `Assignment.type` is
   nullable and has no default. One migration adds the enum and column.
   Existing rows stay valid with `type` null; there is no backfill. Rollback
   is drop the column, then drop the enum.
2. **Create and update.** `POST /assignments` and `PATCH /assignments/:id`
   accept optional `type`. On create, omit or null stores null. On update,
   omit or null keeps the stored value (D115-3); a valid value replaces it; a
   type-only patch counts as a non-empty body. An unknown string such as
   `ESSAY` is a 400 field error on `type` and writes nothing. `status`,
   `actualHours`, `courseId`, and `userId` stay rejected.
3. **Projection.** Both `toAssignmentResponse` copies (assignments service and
   courses service) return `type` (`enum` or null) and still omit `userId`
   and `courseId`. The response is the existing ten keys plus `type`, with
   `type` placed immediately after `priority`. `GET /courses/:id` assignments
   include that key. An untyped seeded row projects `type: null`.
4. **Ownership.** A type in the body does not bypass the existing course or
   assignment ownership gate. Another student's course id on create, or
   another student's assignment id on patch, is still the uniform 404
   `Resource not found`, and the target row's type is unchanged.

## Tests

- **Unit** (`assignments.service.spec.ts`): create with each enum value and
  with omit/null → stored null and `type` in the response; patch replaces
  type; patch omit/null keeps type; type-only patch succeeds; `ESSAY` → 400
  and no write; `status` / `actualHours` / `courseId` / `userId` still 400.
  Remove `type: 'EXAM'` from the create unknown-field rejection matrix
  (`assignments.service.spec.ts` pipe case). `EXAM` is now valid.
- **Course projection** (`courses.service.spec.ts`): both assignment fixtures
  include `type`; the detail expectation includes it; the untyped case
  asserts `type: null` and key length 11 (today the untyped case asserts
  length 10).
- **Data scoping** (`assignments-data-scoping.spec.ts`): extend the key list;
  stop treating `type: 'EXAM'` as an unknown field; add a cross-student patch
  that sends `type` and proves the uniform 404 and an unchanged row.
- **E2E** (`assignments-e2e.spec.ts`, `courses-meetings-e2e.spec.ts`): add
  `type` to both `ASSIGNMENT_KEYS` lists. Create with a type, patch it to
  another type, and read it back from `GET /courses/:id`. Create omit →
  `type: null` in that projection. `type: 'ESSAY'` stays a 400 field error
  with no write (it is an invalid enum now, not an unknown property). The
  untyped direct seed in `courses-meetings-e2e.spec.ts` projects `type: null`.
  These e2e extensions are this child's tests, not a separate story.
- **Negative:** numeric `type`, empty string, and a forged `userId` beside a
  valid type still 400 or 404 as the existing rules require, with no write on
  the rejected request.

E2E and data-scoping self-skip without `DATABASE_URL`. Do not claim them
passed when skipped.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/api/prisma/schema.prisma` — `Assignment` has no `type` column.
  `AssignmentStatus` and `AssignmentPriority` are the enum precedent.
  `dueDate` is already nullable (migration
  `20261024120000_assignment_optional_due_date`).
- `apps/api/src/modules/assignments/dto/create-assignment.dto.ts` and
  `dto/update-assignment.dto.ts` — priority uses `@IsIn`. `type` is not a
  field, so the pipe rejects it as unknown.
- `apps/api/src/modules/assignments/assignments.service.ts` —
  `toAssignmentResponse` (lines 9–22) omits `type`. Create copies priority
  only when non-null. Update `has()` treats null as omitted (D114-5);
  description `''` is the only clear. Empty body → 400.
- `apps/api/src/modules/assignments/assignments.controller.ts` — POST, PATCH,
  DELETE exist. Comments still say the 10-key projection. Update those
  comments with the code; do not add a route.
- `apps/api/src/modules/courses/courses.service.ts` — a second
  `toAssignmentResponse` and `AssignmentRow` (lines 43–75) omit `type`. Do
  not extract a shared helper in this story; update both copies so the
  course detail projection cannot drift.
- `apps/api/src/common/pipes/validation.pipe.ts` — global whitelist +
  `forbidNonWhitelisted`.
- Tests that currently reject `type` as unknown:
  `assignments.service.spec.ts` (`['type', 'EXAM']`),
  `assignments-data-scoping.spec.ts` (`['type', 'EXAM']`),
  `assignments-e2e.spec.ts` (`['type', 'ESSAY']`). The update-pipe matrix
  does not list `type`; add the invalid-enum and keep-on-null cases there.
- `courses.service.spec.ts` asserts assignment key length 10.
  `courses-meetings-e2e.spec.ts` `ASSIGNMENT_KEYS` is the 10-key list, and
  its direct seed omits type.
- Generated client import is `apps/api/src/generated/prisma/client`. Regenerate
  it; do not hand-edit it.

### Contract notes

Follow the [SP-115 README](./README.md) contract. `IsIn` the five identifiers.
Create stores null when `type` is omitted or null, matching due date. Update
must use the existing `has()` keep-on-null behavior for `type`; do not add a
clear sentinel. A type-only body must pass the "at least one field" check.

`GET /courses/:id` ordering is unchanged (`dueDate` asc, `title` asc). Type
does not affect that order.

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D115-1 | Closed nullable enum, no default: `HOMEWORK`, `PAPER`, `PROJECT`, `QUIZ`, `EXAM`. | Epic user story names homework, papers, projects, quizzes, and exams. Priority and status are already closed enums. Optional means null, not a sixth stored "none". |
| D115-2 | Create omit or null stores null. | Same as optional due date. No schema default, so omitted does not become homework. |
| D115-3 | PATCH omit or null keeps the stored type. A valid value replaces it. | Applies the 2026-10-24 user decision D114-5. Type cannot be cleared once set, same as due date and estimated duration. |

## Definition of Done

- Functional type behavior on create, update, and course projection (AC 1–3).
- Invalid type is a field-level 400; nothing is written (DoD 2, 4).
- Assignment reads and writes stay scoped by the authenticated `userId`;
  cross-student access stays a uniform 404 (DoD 3).
- Automated tests cover the enum, null semantics, projection keys, and the
  ownership counterexample (DoD 8).
- Migration and the contract in the SP-115 README are the API documentation
  (DoD 9). No new endpoint.
- Loading, empty, keyboard, responsive, and integrated browser review are not
  this child. Do not mark the parent reviewed.

## Sizing

- **Outcome:** An assignment can be stored and returned with an optional type,
  and another student cannot set it.
- **Time estimate:** 2–2.5 hours, including the migration, both mappers, and
  the forced key-list updates. Uncertainty is the number of 10-key assertions,
  not the schema change. A nullable column add does not need its own story.
- **Files:** `apps/api/prisma/schema.prisma`; new migration under
  `apps/api/prisma/migrations/`; `dto/create-assignment.dto.ts`;
  `dto/update-assignment.dto.ts`; `assignments.service.ts`;
  `assignments.controller.ts` (comments only); `courses.service.ts`;
  `assignments.service.spec.ts`; `assignments-data-scoping.spec.ts`;
  `assignments-e2e.spec.ts`; `courses.service.spec.ts`;
  `courses-meetings-e2e.spec.ts`. No new production module.
- **Start context:** this file, AC-E03-02, the SP-115 README contract and
  D115-1…3, and the inspected paths above. D114-5 is the keep-on-null
  precedent (`docs/stories/EP03/SP-114/README.md` decision register). Do not
  read the rest of SP-113/SP-114 to start.
- **Verification:** `pnpm --filter @studypilot/api exec jest --runInBand assignments.service.spec.ts courses.service.spec.ts` passes without a database. With `DATABASE_URL`, `pnpm --filter @studypilot/api exec jest --runInBand assignments-data-scoping.spec.ts assignments-e2e.spec.ts courses-meetings-e2e.spec.ts` passes and is not skipped. Then `pnpm --filter @studypilot/api typecheck`. Pass means the new type cases pass and the old unknown-`type` cases no longer reject `EXAM`.
- **Dependencies / exclusions:** Requires the existing assignments module and
  PATCH/DELETE behavior. Excludes the UI
  ([SP-115H](./SP-115H-assignment-type-ui.md)) and stories 4–7. Every excluded
  epic AC stays owned in the [EP03 README](../README.md).
