# SP-123 walkthrough — Overdue & Completed Assignment Views

**Review unit:** SP-123 (parent) — children SP-123A (overdue identification) and SP-123B (completed views).  
**Final review:** [`./review.md`](./review.md) (pass 4, 2026-10-26).  
**Stories:** [SP-123A](../../SP-123A-overdue-identification.md), [SP-123B](../../SP-123B-completed-assignment-views.md). Epic ACs: AC-E03-05 (view half), AC-E03-06.

## 1. What changed

A student can now see which unfinished assignments are past their deadline on both the course page and the cross-course list, and can reveal finished (completed/submitted/graded) assignments on the course page without a refetch. Nothing is deleted and no API/schema change is involved.

- **Overdue indicator (SP-123A).** A red "Overdue" pill renders on the due-date line of an unfinished, past-due assignment, on both `AssignmentsSection` (course detail) and `AssignmentsPage` (cross-course list). The due date itself keeps its neutral color; the pill is text plus color (never color-only).
- **Completed views (SP-123B).** On the course page, finished assignments are hidden by default behind an on-demand "Show completed (N)" disclosure that reveals them in a labeled region without any network request. Empty-state variants cover "no assignments", "all complete", and mixed lists.
- **Scope boundary.** No backend, schema, filter/sort (SP-122), status transition (SP-121), or dashboard (EP05) work is included.

## 2. How the code works

Key files and symbols:

- `apps/web/src/entities/assignment/model/status.ts`
  - `isOverdueAssignment(value, now?)` — returns true iff the row is unfinished (`isUnfinishedAssignment`) and has a non-null `dueDate` strictly before `now` (default `Date.now()`). Null due dates, finished statuses, and not-yet-due rows return false. Accepts `{ status, dueDate }`; `now` may be a `Date`, epoch millis, or ISO string.
  - Reuses existing `isUnfinishedAssignment` / `isFinishedAssignment`.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx`
  - Exports `OVERDUE_STYLE` and `OVERDUE_LABEL` (single source of truth for the pill's palette/label).
  - Renders the overdue pill on the due-date line beside `Due <date>`; due date keeps neutral color.
  - `showCompleted` state with identity reset: when the `assignments` prop changes identity, `showCompleted` resets to `false` (SP-120J expanded-ids pattern).
  - Extracted `renderAssignmentRow` so finished rows render with the same controls (status Select, Edit, Delete, subtasks) as unfinished rows.
  - Show-completed disclosure: ghost `Button` (`size="sm"`, `ChevronDown` leftIcon) below the unfinished list and inside the all-complete empty state. Labels `Show completed (N)` / `Hide completed (N)`; `aria-expanded` + `aria-controls="completed-assignments"`; button id `completed-assignments-toggle`; region `role="region"` `aria-labelledby="completed-assignments-toggle"`. Not rendered when `N === 0`. Focus stays on the toggle.
  - Empty states: no assignments → `No assignments yet.` + CTA; all finished → `All assignments are complete.` plus affordance; mixed → unfinished list plus affordance.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx`
  - Imports the shared predicate and `OVERDUE_STYLE`/`OVERDUE_LABEL`; renders the same overdue pill on each overdue row's due-date line.

Data flow: both surfaces consume rows already fetched (`GET /courses/:id` projection or `GET /assignments`). The overdue predicate and the completed disclosure are pure client-side derivations over those rows — no request is sent on toggle or on pill render. The completed disclosure only filters the already-fetched `assignments` array.

## 3. Why it is correct

- **AC-E03-06 (overdue).** `isOverdueAssignment` covers unfinished + past-due strictly before now; null due dates, finished statuses, and not-yet-due rows return false; `now` override supported. Verified by `status.test.ts` (8 cases) and component assertions on both surfaces (presence, absence, finished past-due omission, neutral due-date color).
- **AC-E03-05 (view half).** Finished rows are reachable again via the disclosure without a refetch and without deletion; the toggle mutates no data and sends no request; state resets on prop identity change.
- **DoD 1/8.** Functional criteria and automated business-rule tests present (helper 8 + component 38 + 16). IR-001 (coverage) and IR-002 (index links) and IR-003 (count accuracy) closed; IR-003 verified by independent count 62 = 8 + 38 + 16.
- **DoD 5/6/7.** Three empty-state variants; text-plus-color pill; disclosure is a native keyboard-operable Button with accessible name and `aria-expanded`/`aria-controls`; region is labeled. Live browser execution not performed (D123B-DoD10 exception).
- **DoD 10.** PASS — manual browser pass executed and passed (user-reported 2026-10-26); D123B-DoD10 exception cleared.
- **Ownership/security.** No new read/write surface; predicate is pure presentation over already principal-scoped rows; no cross-student exposure; no secrets touched.

Evidence records: `./artifacts/SP-123A/implementation.md`, `./artifacts/SP-123B/implementation.md`, `./artifacts/SP-123/implementation.md`. Recorded gates: typecheck exit 0, lint exit 0, full web suite 49 files / 630/630 at `97c5746`. New component tests were not re-run (no shell) — execution remains CANNOT VERIFY, recorded as a limitation.

## 4. Manual test workflows

### Workflow A — Overdue pill on the course page

Prerequisites: a course with at least one unfinished assignment whose `dueDate` is in the past, one unfinished assignment due in the future, and one finished assignment whose `dueDate` is in the past.

1. Open the course detail page.
2. Observe the unfinished list.
   - Expected: the past-due unfinished row shows a red "Overdue" pill on its due-date line; the due date text keeps its neutral color; the future-due row shows no pill; no pill appears on the finished row (finished rows are hidden by default — see Workflow C).
3. Keyboard: Tab through the row.
   - Expected: the pill is non-interactive text; focus order of the status Select, Edit, Delete, and subtask disclosure is unchanged.

Status: **Passed (user-reported 2026-10-26)** — browser pass executed; DoD-10 exception cleared.

### Workflow B — Overdue pill on the cross-course list page

Prerequisites: assignments across courses, including an overdue unfinished row, a non-overdue unfinished row, and a finished past-due row.

1. Open `/assignments`.
2. Observe each row.
   - Expected: the overdue unfinished row shows the red "Overdue" pill on the due-date line; the due date stays neutral; non-overdue rows show no pill; finished past-due rows show no pill.
3. Apply filters/sort.
   - Expected: pill follows the row; no request is triggered by pill render.

Status: **Passed (user-reported 2026-10-26)**.

### Workflow C — Show-completed disclosure on the course page

Prerequisites: a course with a mix of unfinished and finished assignments; a second course state with all assignments finished; a third with no assignments.

1. Open a mixed course.
   - Expected: only unfinished rows render by default; a "Show completed (N)" ghost button (small, with chevron) appears below the list, where N = number of finished assignments.
2. Click "Show completed (N)".
   - Expected: finished rows appear in a labeled region (`role="region"`, `aria-labelledby` the toggle); labels switch to "Hide completed (N)"; `aria-expanded` becomes true; no network request is sent; focus stays on the toggle.
3. Click "Hide completed (N)".
   - Expected: finished rows collapse; label reverts; `aria-expanded` false.
4. Open an all-finished course.
   - Expected: "All assignments are complete." plus the affordance; revealing shows all rows.
5. Open an empty course.
   - Expected: "No assignments yet." with the create CTA; no toggle (N = 0).
6. Reveal completed rows, then trigger a refetch (e.g., edit an assignment).
   - Expected: `showCompleted` resets to false (finished rows collapse) when the `assignments` prop identity changes.
7. On a revealed finished row, use status Select / Edit / Delete / subtasks.
   - Expected: all controls remain fully interactive; no de-emphasis.

Status: **Passed (user-reported 2026-10-26)**.

### Workflow D — Accessibility and responsive (manual)

1. Operate the disclosure with keyboard only (Tab, Enter/Space).
   - Expected: button is reachable and operable; `aria-expanded`/`aria-controls` announced; region has accessible name.
2. View at narrow width.
   - Expected: pill wraps naturally; disclosure is an inline button; rows stack per existing layout; no horizontal overflow.

Status: **Passed (user-reported 2026-10-26)**.

### Workflow E — No manual check needed

- Data scoping, API errors, validation: **Not applicable** — no new read/write surface, no API or schema change; existing principal-scoped surfaces unchanged.

## 5. Execution status

- Automated gates (recorded, not re-run in this review): typecheck exit 0, lint exit 0, full web suite 49 files / 630/630 at `97c5746`. Focused count verified by independent grep: 62 = 8 + 38 + 16.
- Component-test execution of newly added assertions: **Not executed — reviewer has no shell**; recorded as CANNOT VERIFY, not a defect.
- Manual browser pass (reveal/hide, empty states, keyboard, narrow width): **Passed (user-reported 2026-10-26)**; D123B-DoD10 exception cleared. Steps above are the executed checklist.
- DoD-10 remains an authorized, recorded exception; DoD-11 (this walkthrough) is saved.
