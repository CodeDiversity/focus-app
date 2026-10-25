# SP-115 Walkthrough — Assignment Types

**Review unit:** SP-115 (SP-115G backend + SP-115H frontend) — final combined review, 2026-10-25
**Reviewed code:** commit `9d76950` · [review.md](./review.md) · [SP-115 README](../../README.md)
**Stories:** [SP-115G](../../SP-115G-assignment-type-api.md) · [SP-115H](../../SP-115H-assignment-type-ui.md)

## What changed

An assignment can now be classified. On a course page, when you add or edit an
assignment, a **Type** select lets you pick Homework, Paper, Project, Quiz, or
Exam. Leaving it untyped stores no type — untyped rows show no badge and no
category text, and nothing pretends a type was chosen. A stored type always
shows on the row as a neutral slate pill right after the priority badge. Type
is not a lifecycle field and never changes ownership: only classification.

Two stories delivered this:

- **SP-115G** (backend): a nullable `type` column on assignments, a closed
  five-value enum, create/update validation, and the field added to both API
  projections (assignments responses and the course-detail list).
- **SP-115H** (frontend): the Type control in the existing create/edit dialog,
  the row badge, the request payload rules, and component tests.

## How the code works

- **Storage** — `AssignmentType` is a closed Prisma enum (`HOMEWORK`, `PAPER`,
  `PROJECT`, `QUIZ`, `EXAM`); `assignments.type` is nullable with no default.
  Migration `20261025000000_assignment_optional_type` adds the enum then the
  column; existing rows keep `type = NULL` (no backfill), with the drop-column-
  then-drop-type rollback documented in the migration's head comment.
- **Create** (`POST /assignments`) — omitting `type` or sending `null` stores
  null. A valid value is stored as-is; anything else (`ESSAY`, numbers, empty
  string) is a 400 field error on `type` and nothing is written. Validation is
  backend-authoritative: the DTO's `@IsIn` plus a service-side re-check of the
  full rule set.
- **Update** (`PATCH /assignments/:id`) — omitting `type` or sending `null`
  keeps the stored type (the same keep-on-null rule as due date and duration,
  a recorded user decision). A valid value replaces it. A patch containing
  only `type` counts as a non-empty body; an empty body is still a 400.
- **Projection** — every assignment returned by the API (create response,
  create course section refresh, patch response, and
  `GET /courses/:id`) carries the same 11-key shape: the previous ten keys
  plus `type` immediately after `priority`. `userId` and `courseId` are still
  never exposed. Both projection copies (assignments service and courses
  service) were updated together so they cannot drift.
- **Ownership** — no query changed. Every read and write is scoped to the
  authenticated student via the existing `ownedWhere` helpers; touching
  another student's assignment — even only to set a type — is the same
  uniform 404 "Resource not found", and the target row is untouched.
- **UI** — the dialog's Type select pairs with Priority in one grid row, so
  the existing keyboard focus trap and tab order absorb it naturally
  (title → due date → duration → type → priority → description → buttons).
  On create the first option is "No type"; on edit with a stored type that
  option disappears — you cannot offer a clear action the API would ignore,
  and the select hint says to pick a different value to change it. Submit
  code sends `type` in the body only when a concrete value is selected, so a
  null-stored edit can never poison a stored value with `null` or silently
  clear one. On the row, the type badge shares the neutral slate palette the
  PENDING-status and LOW-priority badges already use; a null type renders
  nothing rather than a false category pill.

## Why it is correct

- **Requirement traceability:** the epic's optional-fields criterion
  (AC-E03-02) assigned `type` to these two children; due date, duration, and
  priority stay with the earlier stories they were shipped in. Every child
  acceptance criterion is checked one by one with file/line evidence in
  [review.md](./review.md).
- **Executed evidence at the reviewed commit (`9d76950`), run by the
  reviewer:** 194 backend unit tests (validation, null semantics, projection
  keys, no-write on rejection); 94 DB-backed tests (37 data-scoping incl. the
  cross-student-type counterexample → uniform 404, 38 assignments e2e incl.
  the create→patch round-trip via `GET /courses/:id`, 19 course-detail e2e)
  against the real local database with the migration applied; 121 focused
  and 563 full web tests; typecheck and lint clean on both apps. The exact
  command matrix is in [review.md](./review.md).
- **Design decisions with recorded provenance:** the five categories come
  from the epic (D115-1, reversible only before implementation); optional
  creates store null like due date does (D115-2); patch keep-on-null applies
  the earlier D114-5 user decision (D115-3); one projection shape change
  keeps the SP-112/113 contract stable (D115-4). The visible half (control,
  placement, copy, badge treatment) was settled by a dedicated UI/UX
  refinement pass on 2026-10-25 and implemented verbatim.
- **Mandatory findings closed:** the one open integration item — the DoD-10
  manual browser pass (F-115H-1) — was executed by you on 2026-10-25 and
  passed (recorded in the review handoff). No blocker or should-fix finding
  remains; one polish-class note (committed local dev defaults in
  docker-compose, no action for this story) is in the report.
- **Limitations, honestly:** the automated author-side test runs on G/H were
  recorded in the children's implementation records; the reviewer's own
  executed runs are the ones cited above. The DoD-10 browser pass is
  user-reported evidence, not a reviewer-observed run; you may repeat any
  workflow below at any time.

## Manual test workflows

Environment: local dev stack (API + web running, local Postgres with the SP-115G migration applied). Use a throwaway course on your own account; no shared-system mutation is involved, and no special permissions are needed.

### 1. Set a type on create and see it on the row
Status: **Executed — user, 2026-10-25, local dev (reported "manual walkthrough passed"; recorded in the review handoff)**

1. Sign in and open a course.
2. **Add assignment** → in the dialog, confirm a **Type** select sits between
   *Estimated duration* and *Priority*, defaulting to **No type**.
3. Fill Title, pick `Type: Quiz`, submit.
   **Expected:** the page announces "Assignment added."; the new row shows the
   neutral slate **Quiz** pill immediately after the priority badge.
4. **Repeat for each of** Homework, Paper, Project, Exam on further rows.
   **Expected:** each label appears; every type badge uses the same neutral
   palette (no red/amber/green semantics).

### 2. Edit keeps and changes a stored type
Status: **Executed — user, 2026-10-25, local dev (reported "manual walkthrough passed")**

1. **Edit** the Quiz assignment. **Expected:** the select is preselected to
   Quiz, and only the five identifiers are offered — no "No type" option.
2. Leave it unchanged and save. **Expected:** the row still shows Quiz (an
   unchanged edit never clears a stored type).
3. **Edit again**, change to `Exam`, save. **Expected:** badge updates to
   Exam. Editing a blank-field type can only set a value, never announce a
   clear.

### 3. Create without a type — no invented category
Status: **Executed — user, 2026-10-25, local dev (reported "manual walkthrough passed")**

1. **Add assignment** leaving Type at **No type**.
   **Expected:** the new row shows no type badge and no category text among
   the badges; status and priority behave exactly as before.

### 4. Client-side and server-side field errors on type
Status: **Covered by executed automated tests — not manually repeated** (out of the user's recorded pass). Optional repeat, ~1 minute:

1. Edit an assignment, change Type, submit with the network tab throttled or
   the API stopped, forcing a 400 response that names `type`.
   **Expected:** the message renders on the Type control itself (red border,
   error text under the select, `aria-invalid`), not as a generic toast; the
   in-flight submit button stays disabled meanwhile.

### 5. Keyboard and responsive behavior
Status: **Executed — user, 2026-10-25, local dev (reported "manual walkthrough passed")**

1. In the dialog, press Tab from Title through the fields. **Expected:** order
   is due date → duration → **type** → priority → description → buttons, and
   Tab cycles within the dialog without escaping the focus trap.
2. At a phone-height window, open the dialog with all rows filled.
   **Expected:** the dialog scrolls (`max-h-[90vh]`) with the new Type/Priority
   row reachable.
3. At a narrow width with a long-titled assignment, check the row.
   **Expected:** the type badge wraps to the next line inside the badge
   cluster; **Edit** and **Delete** never disappear.

### 6. Validation and ownership edge cases
Status: **Not executable as a manual UI flow for one student — covered by executed automated tests** (data-scoping and e2e suites, reviewer-run at the reviewed commit). Included here so the walkthrough covers every workflow of the unit:

- Sending `type: "ESSAY"` or a numeric type on create/patch → 400 field error
  on `type`, nothing written (executed in the 194-test and 94-test runs).
- Patching another student's assignment with a valid type → the same uniform
  404 "Resource not found" as any cross-student touch, target unchanged
  (executed in the 37-test scoping suite).
- Untyped seeded rows project `type: null` in course detail without a
  migration backfill (executed in the course e2e suite).

**Optional user repeat:** any workflow above; none is required for completion — workflow 1–3 and 5 already have executed evidence from your DoD-10 pass, and 4/6 have reviewer-executed automated coverage.
