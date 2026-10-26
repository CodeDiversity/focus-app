# SP-121 walkthrough — Completion & Status Tracking

**Review unit:** SP-121 (parent) — SP-121A (Assignment Status API) + SP-121B (Assignment Status UI)
**Final review:** [`review.md`](./review.md) (pass 2, 2026-10-26)
**Reviewed Git state:** `18bab0a5c6adf126bd4d495867e3d07114f4f972` (implementer review-fix commit) on `main`.
**Companion records:** [SP-121A implementation](../SP-121A/implementation.md) · [SP-121B implementation](../SP-121B/implementation.md) · [parent index](./implementation.md)

## 1. What changed

A student can now move an assignment through its lifecycle
(Pending → In progress → Completed → Submitted → Graded) and the course-detail
assignments section shows only unfinished work by default. Completing an
assignment removes it from that view without deleting it; the record persists
and reappears in story 7's completed/overdue views.

**Scope (this review unit):**
- **SP-121A (backend):** `PATCH /assignments/:id` accepts `status` (the closed
  five-value `AssignmentStatus` enum) with keep-on-null semantics; create is
  unchanged (new assignments start `PENDING`); `GET /courses/:id` is unchanged
  (no status filter, D121-5). No migration — the column and enum already existed.
- **SP-121B (frontend):** a status `Select` on every unfinished assignment row;
  the section renders only `PENDING`/`IN_PROGRESS` rows by default with a
  distinct all-finished empty state; a shared predicate in
  `entities/assignment/model/status.ts` for story 7 reuse.

**Out of scope (intentional, per D121-1/7 and the epic):** status on create,
overdue identification and completed/overdue views (story 7), search/sort/filters
(story 6), `actualHours` (EP07).

## 2. How the code works

**Backend flow (SP-121A):**
- `apps/api/src/modules/assignments/dto/update-assignment.dto.ts` — adds
  `status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'GRADED' | null`
  with `@IsOptional() @IsIn([...five])`, mirroring `priority`/`type`.
- `assignments.service.ts` `update()` — adds `status` to the at-least-one `has()`
  check (D121-3: a status-only body is a non-empty patch), merges it over the
  stored value (`status: has(dto.status) ? dto.status! : existing.status`), and
  writes it only when provided. The merged DTO is re-validated (backend
  authoritative). Ownership stays `ownedWhere(userId, id)` with P2025 → uniform
  404 normalization; a foreign/missing/malformed id never reveals existence.
- `assignments.controller.ts` — PATCH doc comment lists `status?`.
- `create-assignment.dto.ts` is untouched: `status` stays a rejected unknown
  field on create (whitelist + `forbidNonWhitelisted`).

**Frontend flow (SP-121B):**
- `entities/assignment/model/status.ts` — `isUnfinishedAssignment`,
  `isFinishedAssignment`, `ASSIGNMENT_STATUSES` (lifecycle order).
- `entities/assignment/api/assignmentApi.ts` — `status?: AssignmentStatus | null`
  on `UpdateAssignmentRequest`; `updateAssignment` sends the patch through.
- `features/courses/ui/AssignmentsSection.tsx` — renders a `Select`
  (`aria-label="Status for <title>"`, all five options) in the row's
  `flex flex-wrap gap-2` cluster; `handleStatusChange` PATCHes `{ status }`,
  disables the Select in flight, blocks duplicate submits, toasts
  `We could not update the status. Try again.` on failure (no refetch, no drift),
  and on a finished transition sets `focusAfterStatus` so focus moves to the next
  unfinished row's Select (previous if none, else the header Add control).
  The section filters rows via `isUnfinishedAssignment`; empty array →
  `No assignments yet.` + CTA; non-empty but all finished →
  `All assignments are complete.` (text-only).
- `pages/courses/ui/CourseDetailPage.tsx` — `handleAssignmentStatusChanged`
  sets the status-specific sentence in the always-present `role="status"` region
  and background-refetches `getCourse` (D112B-10), mirroring the subtask
  precedent (a dedicated callback, not `onAssignmentChanged('updated')`).

## 3. Why it is correct

**AC traceability:**
- AC-E03-04 (students can update assignment status): A accepts/validates/stores
  the transition (5 values, keep-on-null, merged validation, ownership, locked
  fields stay locked, create unchanged, projection unchanged); B provides the
  visible control and page wiring.
- AC-E03-05 (completing removes from unfinished views without deleting): A's
  transition is a PATCH (no delete path; record persists); B filters to
  unfinished only by default. Completed/overdue views are story 7 (D121-7
  records the interim reachability gap).

**DoD evidence:**
- DoD 1 (functional ACs): pass — see review.md AC tables.
- DoD 2 (validation): DTO `@IsIn` + service re-check on merged values; Select
  mirrors the closed enum.
- DoD 3 (scoping): `ownedWhere(userId, id)` on read/write + P2025 → uniform
  404; cross-student PATCH returns uniform 404 with target unchanged
  (data-scoping + e2e evidence).
- DoD 4 (actionable errors): field-level `errors.status` 400; failure toast copy.
- DoD 5 (states): both empty states + page loading/error states + toast.
- DoD 6 (keyboard): native Select with visible focus ring; tab-order test +
  browser evidence.
- DoD 7 (responsive): browser pass at phone width (no horizontal scroll).
- DoD 8 (automated tests): A — unit 241/241, data-scoping+e2e 113/113, full
  API 997/997 (implementer-recorded, local Postgres). B — `status.test.ts`
  + new `AssignmentsSection`/`assignmentApi`/`CourseDetailPage` cases
  (committed `18bab0a`). See residual limitation below.
- DoD 9 (docs): SP-121 README contract + controller comments; no migration.
- DoD 10 (integrated dev review): browser pass executed and passed (user
  evidence, 2026-10-26, all six steps).
- DoD 11: this walkthrough.

**Findings closure across review rounds:** IR-121-1, IR-121-2, IR-121-3
(should-fix: missing tests) closed by commit `18bab0a`; IR-121-4 (CANNOT
VERIFY: browser pass) closed by user-provided evidence (2026-10-26). IR-121-5
(polish) remains open and non-blocking.

**Residual limitation (honestly recorded):** the three new test files were
committed but could not be executed in this review session (no shell/test-runner
tool available to reviewer or implementer). They were statically verified against
the implementation and mirror previously-green patterns; the prior web suite was
48 files / 600 tests passing. Recommend a CI run to confirm the new cases. This
is a verification gap, not a code defect, and does not reopen any finding.

**Security/ownership invariants preserved:** status is PATCH-only and cannot be
set on create; invalid values never write; status + locked field together 400 on
the locked field with no write; cross-student access stays a uniform 404 with
the target status unchanged; the unfinished filter is presentation-only and is
not a security boundary (the projection still returns every status).

## 4. Manual test workflows

### Workflow 1 — Set an assignment's status (core flow)

**Prerequisites:** a running dev environment (API + web), a signed-in student
account, a course with at least one assignment (PENDING).

**Steps:**
1. Open the course detail page for that course.
2. Locate the assignment row; find the status `Select` labeled
   `Status for <title>` (combobox, visible focus ring).
3. Open the Select; confirm all five options in order: Pending, In progress,
   Completed, Submitted, Graded.
4. Select "In progress". Observe the row stays visible, the live region reads
   "Assignment marked as in progress.", and after the background refetch the row
   still shows "In progress".
5. Select "Completed". Observe the row disappears from the section, the live
   region reads "Assignment marked as completed.", and no DELETE request is sent
   (network tab).
6. Reload the page; confirm the assignment is absent from the unfinished list
   (it persists with status COMPLETED — visible again only in story 7's views).

**Expected:** row disappears exactly on COMPLETED/SUBMITTED/GRADED; persists on
refetch; no data loss.

**Status:** Executed (user, 2026-10-26) — all six DoD-10 steps confirmed.

### Workflow 2 — All-finished empty state

**Prerequisites:** a course whose assignments are all finished.

**Steps:**
1. Open the course detail page.
2. Confirm the section shows the muted line "All assignments are complete."
   (text-only, no call-to-action), not "No assignments yet."

**Expected:** distinct empty state signaling completion.

**Status:** Executed (user, 2026-10-26).

### Workflow 3 — No assignments empty state

**Prerequisites:** a course with no assignments.

**Steps:**
1. Open the course detail page.
2. Confirm "No assignments yet." and the "Add your first assignment" button,
   which opens the add form.

**Expected:** unchanged from prior behavior.

**Status:** Executed (user, 2026-10-26) (covered by existing component tests).

### Workflow 4 — Failed status update

**Prerequisites:** simulate a network failure (e.g., stop the API or block the
request).

**Steps:**
1. On a row, change the status Select.
2. Confirm the toast "We could not update the status. Try again." appears and
   the row's status reverts to the stored value (no optimistic drift), with no
   refetch and no data change.

**Expected:** error surfaced, nothing mutated.

**Status:** Not executed — user test instructions (negative path; can be
verified by toggling network in devtools).

### Workflow 5 — Keyboard accessibility and narrow width

**Prerequisites:** a course with at least one unfinished assignment.

**Steps:**
1. Tab to the status Select; confirm a visible focus ring and the accessible
   name `Status for <title>`.
2. Operate the Select with keyboard (Space/Enter to open, arrows to choose,
   Enter to confirm); confirm the change behaves as in Workflow 1.
3. Resize to a phone width; confirm the row wraps without horizontal scroll.

**Expected:** keyboard-operable, visible focus, responsive.

**Status:** Executed (user, 2026-10-26) — tab/focus ring + phone width confirmed.

### Workflow 6 — Ownership (cross-student, negative)

**Prerequisites:** two student accounts; an assignment owned by student A.

**Steps:**
1. As student B, `PATCH /assignments/<A's id>` with `{ status: "COMPLETED" }`.
2. Confirm HTTP 404 `Resource not found` and that A's assignment status is
   unchanged.

**Expected:** uniform 404, no existence oracle, no write.

**Status:** Executed (automated — data-scoping + e2e suites, implementer-recorded).

### Workflow 7 — Invalid status value (negative)

**Prerequisites:** API client (curl/Postman) or the e2e harness.

**Steps:**
1. `PATCH /assignments/:id` with `{ status: "DONE" }`, `{ status: "completed" }`
   (lowercase), `{ status: 1 }`, `{ status: true }`.
2. Confirm 400 with `errors.status` and no write.
3. `PATCH` with `{ status: "COMPLETED", actualHours: 5 }` → 400 on
   `actualHours` only, no write.
4. `POST /assignments` with `status` → 400 unknown field; created row PENDING.
5. `PATCH` with `{ status: null }` alone → 400 "At least one field must be
   provided"; with a companion field, status is kept.

**Expected:** all rejection cases hold.

**Status:** Executed (automated — unit + data-scoping + e2e, implementer-recorded).

## 5. Execution status summary

| Gate | Status | Provenance |
|---|---|---|
| Backend unit (241/241) | Executed | Implementer record (A) |
| Backend data-scoping + e2e (113/113) | Executed | Implementer record (A), local Postgres |
| Full API suite (997/997) | Executed | Implementer record (A) |
| API typecheck/lint/format | Executed | Implementer record (A) |
| Web typecheck/lint | Executed | Implementer record (B) |
| Web tests (600/600 + new cases) | CANNOT VERIFY (new cases unexecuted) | Implementer record (B) prior run; new cases statically verified only (no shell available this session) |
| DoD-10 browser pass (6 steps) | Executed | User evidence (2026-10-26) |
| Ownership cross-student (Workflow 6) | Executed | Automated suites |
| Invalid-value cases (Workflow 7) | Executed | Automated suites |

**Note:** The new test cases added in commit `18bab0a` (IR-121-1/2/3) were
statically verified but not executed in this review session. Recommend a CI run
to confirm them green; this does not reopen any finding.