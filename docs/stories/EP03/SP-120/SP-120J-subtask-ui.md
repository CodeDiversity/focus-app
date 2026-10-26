# SP-120J: Subtask Checklist UI

**Story ID:** SP-120J
**Title:** Frontend: subtask checklist on course-detail assignment rows
**Parent:** [SP-120](./SP-120-assignment-subtasks.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Refined:** 2026-10-25 (ui-refiner — UI/UX gaps settled in `Decisions` below)
**Status:** Refined — UI/UX settled; ready to implement. Queue reconciliation is the coordinator's (this pass does not edit the README).
**Dependencies:** SP-120I implemented (2026-10-25 — [implementation record](./artifacts/SP-120I/implementation.md)) — met. No remaining pre-code UI gate.
**Jira key:** Pending creation

## Summary

On the course page, a student can expand an assignment row to see its ordered
subtask checklist: add a subtask, mark it complete with a checkbox, move it
up or down, and delete it after a confirmation. The collapsed row shows a
text summary. The checklist renders from the course-detail projection
(D120-5); mutations re-fetch the course in the background (D112B-10).

## Bounded scope

In: the shared `Subtask` type, the subtask client functions in
`entities/assignment/api/assignmentApi.ts`, the checklist and delete dialog
in `features/courses/ui/`, the section and page wiring, component tests, the
DoD-10 browser note, and the parent index.

Out: standalone tasks, orphaned-subtask surfacing (D120-6), subtask
descriptions/due dates/minutes/priority (D120-3), renaming a subtask, a
progress bar, drag-and-drop, assignment status changes (story 5),
search/sort/filters (story 6), overdue views (story 7). If implementation
needs a new screen, stop and return that split to the planner. Layout,
component choice, and copy are no longer open — they were settled in
`Decisions` on 2026-10-25.

## Source requirement references

- **AC-E03-03** — "Assignments can contain ordered, independently
  completable subtasks." This child owns the visible half.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 2, 4, 5, 6, 7, 8, and 10. Item 3 stays enforced by I. Item 9 is
  I's contract. Item 11 is the final reviewer walkthrough for the parent,
  not this child's deliverable.
- Contract and D120-1…8 in the [SP-120 README](./README.md).

## Acceptance criteria

1. **Checklist renders.** Each assignment row in `AssignmentsSection` has a
   disclosure button (settled 2026-10-25). Collapsed, the button shows the
   summary from `Decisions` and `aria-expanded="false"`. Expanded, it shows
   that assignment's subtasks in API order (`orderIndex` asc, then
   `createdAt` asc — render as given, no client re-sort) and
   `aria-expanded="true"`. Existing title, due date, badges, Edit, and
   Delete stay. An expanded assignment with no subtasks shows the empty
   state and the inline add form.
2. **Add.** The open checklist ends with a title `Input` and an **Add
   subtask** button. Client validation matches the API and `AssignmentForm`:
   trim, non-empty (`Title is required`), ≤ 200 (`Title must be 200
   characters or fewer`). A 400 field error for `title` renders on that
   input. In-flight lock and duplicate submit follow the existing form
   behavior. Enter in the input submits. Success clears the input, keeps
   the row expanded, announces `Subtask added.`, and refetches.
3. **Toggle.** Each subtask has a native checkbox whose accessible name is
   the subtask title. Checking it PATCHes `status: "COMPLETED"`; unchecking
   PATCHes `status: "PENDING"`. Space toggles. The title stays fully
   readable either way (no strikethrough, no Completed badge). Success
   announces `Subtask completed.` or `Subtask marked incomplete.`
4. **Reorder.** Each subtask has visible **Up** and **Down** buttons,
   disabled at the ends (both disabled when it is the only subtask). Moving
   swaps `orderIndex` with the neighbor (two PATCH calls, D120-7). No
   drag-and-drop. The buttons are keyboard accessible and named
   `Move {title} up` / `Move {title} down`. Success announces
   `Subtask moved.` once, after both PATCHes.
5. **Delete.** Each subtask has a **Delete** button that opens
   `DeleteSubtaskDialog` (confirmation settled 2026-10-25). Confirm sends
   DELETE. 204 closes the dialog, announces `Subtask deleted.`, refetches,
   and the subtask is gone. Cancel sends no request.
6. **Refetch.** After any successful subtask mutation, the page re-runs
   `getCourse` in the background (D112B-10). The checklist re-renders from
   that projection. No second fetch source and no optimistic reorder.
   Subtask mutations must not call `onAssignmentChanged` (that announces
   assignment copy).
7. **States.** The page's existing loading state covers the initial fetch.
   No per-checklist skeleton. Expanded and empty: `No subtasks yet.` plus
   the add form. Mutation failure toasts the sanitized message and keeps
   the last known list, except a title 400, which stays on the input, and
   a delete failure, which stays in the dialog alert. The open row stays
   open across the background refetch.
8. **Keyboard and narrow width.** Tab order follows visual order: disclosure,
   then the row's Edit/Delete, then each subtask's checkbox, Up, Down,
   Delete, then the title input and Add subtask. The disclosure, checklist,
   and dialog work at desktop and mobile widths without horizontal scroll.
   The badge/Edit/Delete cluster is unchanged.

## UI/UX gaps (ui-refiner)

Settled 2026-10-25 by `ui-refiner`; the former gap list is the `Decisions`
section of Technical notes. No gap remains open before implementation.

## Tests

Named per AC (assert exact request objects; exact-object `toEqual` proves
the key set). Vitest + Testing Library, same style as
`AssignmentsSection.test.tsx`.

- `SubtaskChecklist.test.tsx` (new): renders subtasks in given order; empty
  state copy plus the add form; add (valid body omits `orderIndex` and
  `status`, empty, whitespace-only, > 200, server 400 on `title` sets
  `aria-invalid`, network toast); toggle PENDING → COMPLETED → PENDING with
  Space and with a click, exact PATCH body `{ status }`; reorder up/down
  fires two PATCHes swapping `orderIndex`, Up disabled on the first, Down
  disabled on the last, both disabled when alone; delete opens the dialog
  and does not call DELETE until confirm; in-flight disables that
  checklist's controls; success callbacks use the settled action names.
- `DeleteSubtaskDialog.test.tsx` (new): title `Delete {title}?`, effect
  sentence, Cancel focused first and sends nothing, Escape cancels, confirm
  calls `deleteSubtask` and `onDeleted`, in-flight disables both buttons,
  failure renders `role="alert"` and does not call `onDeleted`.
- `AssignmentsSection.test.tsx`: collapsed row shows the exact summary
  (`No subtasks`, `1 subtask`, `2 subtasks`, `3 subtasks, 1 complete`,
  `1 subtask, 1 complete`); activating the disclosure shows the checklist
  and sets `aria-expanded`; collapsing hides it; existing badges/Edit/Delete
  remain and still share one `flex flex-wrap gap-2` parent (unchanged
  assertion — the disclosure is not inside that cluster); the test wrapper
  defaults `onSubtaskChanged` / `onSubtaskRefresh` to `vi.fn()`.
- `assignmentApi.test.ts`: `listSubtasks`, `createSubtask`, `updateSubtask`,
  and `deleteSubtask` send the exact nested paths and bodies. Do not add a
  new API module.
- `CourseDetailPage` wiring (extend an existing test or add one focused
  case): a subtask success sets the matching live-region sentence and
  background-refetches; it does not set `Assignment added.`
- Fixture compile fixes, not new behavior: `CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`,
  `DeleteAssignmentDialog.test.tsx` — `CourseAssignment` fixtures need
  `subtasks: []` once the type requires it.
- **DoD-10:** one manual browser pass on course detail: expand an assignment,
  read the collapsed summary, add a subtask, toggle it, reorder it, delete
  it through the dialog, confirm the checklist stays open and re-renders
  after each mutation, Tab through the settled order, and check the row at
  a phone width. Record the pass or the blocker in
  `./artifacts/SP-120J/implementation.md`. This is closeout for this child,
  not a separate story.

## Technical notes

### Inspected paths (2026-10-25)

- `apps/web/src/shared/types/academic.ts` — full `Task` type exists.
  `CourseAssignment = Omit<Assignment, 'course'>` (11 keys). Add `Subtask`
  (the 6-key projection) and `subtasks: Subtask[]` on `CourseAssignment`.
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — plain axios
  (`createAssignment`, `updateAssignment`, `deleteAssignment`). Add
  `listSubtasks`, `createSubtask`, `updateSubtask`, `deleteSubtask` here.
  No new `subtaskApi.ts`: the routes are nested under assignments, and this
  file is already the assignment mutation client.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — title, due
  date, status/priority/type badges, Edit, Delete in one
  `flex flex-wrap gap-2` cluster; row is `flex-col` below `sm` and
  `sm:flex-row` at `sm+`. Local `Badge`. Delete focus restoration uses
  `data-assignment-focus` and a layout effect. Extend this section; do not
  put the disclosure inside the badge cluster.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — one `getCourse`
  fetch; `role="status"` live region; `handleAssignmentChanged` announces
  `Assignment added.` / `Assignment updated.` / `Assignment deleted.` and
  calls `load({ background: true })`. Assignments and Meetings sit in
  `grid grid-cols-1 lg:grid-cols-2`. Subtask announcements need their own
  callback so those sentences stay accurate.
- `apps/web/src/features/courses/ui/AssignmentForm.tsx` — title zod copy
  `Title is required` / `Title must be 200 characters or fewer`; 400 field
  errors via `getFieldError`; other failures `toast.error`. In-flight ref
  blocks a duplicate submit.
- `apps/web/src/features/courses/ui/DeleteAssignmentDialog.tsx` — modal
  pattern to copy: Cancel focused first, focus trap, Escape cancels when
  not in flight, `role="alert"` on failure, danger Delete. Do not reuse the
  assignment effect sentence (it talks about orphaned subtasks).
- `apps/web/src/shared/ui/Button.tsx` — `primary | outline | ghost | danger`,
  `size="sm"`, `isLoading`, `leftIcon`, visible focus ring.
- `apps/web/src/shared/ui/Input.tsx` — `label`, `error` (`aria-invalid` +
  error text). No Checkbox component exists. `ChevronDown` is already
  imported from `lucide-react` in `Select.tsx`.
- FSD: checklist and dialog in `features/courses/ui/` (D113-4). The client
  stays in `entities/assignment/api/`. The page keeps importing only
  `AssignmentsSection`. No lateral feature import. No new shared primitive.

### Decisions this child must not reopen

D120-1 fixes the model. D120-2 fixes the routes. D120-3 fixes the
projection and DTO fields. D120-4 fixes the status values. D120-5 fixes
the projection join. D120-6 fixes the orphan behavior. D120-7 fixes the
order semantics (swap, no shift endpoint). Display copy, layout, and
interaction patterns were the open gaps; they are settled below. Settling
them is not a license to add rename, drag-and-drop, or a progress bar.

### Decisions (settled by ui-refiner, 2026-10-25)

One bullet per former gap, grounded in the inspected code. The user
confirmed each recommended option on 2026-10-25.

- **Expand/collapse** — a disclosure `Button` (`size="sm"`, `variant="ghost"`)
  on the row, not an always-visible list and not a dialog. The assignments
  card is half width beside Meetings at `lg`, and the row already has
  badges plus Edit/Delete; an always-open checklist would make that column
  too tall. A dialog would hide the list from the course page. Use
  `aria-expanded` and `aria-controls`. Do not use `<details>`: every other
  control on this page is `Button`, whose focus ring is already tested.
  `ChevronDown` (`lucide-react`, `aria-hidden`) is `leftIcon` and rotates
  180° when expanded. Visible label is the summary; accessible name is
  `Subtasks for {assignment title}: {summary}` so two rows with the same
  count are distinct (the Edit button's short-visible / titled-name
  pattern). Button id `subtasks-toggle-{assignmentId}`; panel id
  `subtasks-{assignmentId}`.
- **Collapsed summary** — text only, no progress bar (none exists; a bar
  would still need this text so color is not the only cue). Exact copy:
  `No subtasks` when empty; `1 subtask` or `{n} subtasks` when none are
  complete; `{noun}, {done} complete` when `done > 0` (so `1 subtask, 1
  complete` and `3 subtasks, 3 complete` — no separate "all complete"
  string). `done` counts `status === "COMPLETED"`.
- **Add placement** — inline at the bottom of the open checklist, not a
  dialog and not a reveal step. Create sends only a title (D120-3);
  `AssignmentForm` is a dialog because it has many fields. Reuse `Input`
  (`label="Subtask title"`) and `Button` `Add subtask` (`size="sm"`,
  `variant="primary"`, `type="submit"`, accessible name
  `Add subtask to {assignment title}`). Empty expanded state is
  `No subtasks yet.` (`text-sm text-secondary-700`) above that same form —
  no second "Add your first subtask" button. The form lives in
  `SubtaskChecklist`, not a new form component.
- **Completed look** — native `<input type="checkbox">` inside a `<label>`
  with the title text, so the accessible name is the title and Space
  toggles. No custom toggle (none exists). Title uses
  `font-medium text-secondary-900 break-words` whether checked or not —
  no strikethrough, no muted-only state, no Completed pill. The checked
  box is the state (not color). Checkbox classes: `mt-1 h-6 w-6 shrink-0
  accent-primary-600` (24px box; the label text is the rest of the hit
  target). Up/Down/Delete sit outside the label so they do not toggle it.
- **Reorder** — visible **Up** / **Down** text buttons (`size="sm"`,
  `variant="ghost"`), not drag-and-drop and not icon-only. Accessible
  names `Move {title} up` / `Move {title} down`. `disabled` at the ends.
  Unequal neighbor `orderIndex` values: two PATCH bodies
  `{ orderIndex }` swapping the two numbers (D120-7). Equal values (only
  possible for data this append API did not create): one PATCH that places
  the moved subtask on the requested side of the neighbor without a new
  endpoint — move up sets the moved item to `neighbor.orderIndex - 1` when
  that is `≥ 0`, otherwise PATCH the neighbor to `moved.orderIndex + 1`;
  move down sets the moved item to `neighbor.orderIndex + 1`. Then
  refetch. Do not add a shift endpoint.
- **Delete confirmation** — new `DeleteSubtaskDialog` in
  `features/courses/ui/`, copying `DeleteAssignmentDialog`'s trap, initial
  Cancel focus, Escape, and in-flight lock. Title `Delete {title}?`. Body
  `This permanently deletes the subtask.` Buttons **Cancel** (`outline`)
  and **Delete** (`danger`, accessible name `Delete {title}`). Row button
  visible text **Delete**, accessible name `Delete {title}`. No immediate
  delete and no inline confirm (no inline-confirm pattern on this page).
- **Announcements** — reuse the page's always-present `role="status"`
  region. Exact sentences: `Subtask added.` / `Subtask completed.` /
  `Subtask marked incomplete.` / `Subtask moved.` / `Subtask deleted.`
  Do not announce through `onAssignmentChanged`. New required props on
  `AssignmentsSection`: `onSubtaskChanged: (action: 'added' | 'completed' |
  'reopened' | 'moved' | 'deleted') => void` and
  `onSubtaskRefresh: () => void`. The page maps the action to the sentence,
  then `load({ background: true })`. `onSubtaskRefresh` only refetches
  (partial reorder: first PATCH succeeded, second failed — toast, no
  success sentence, refetch so the projection wins). A failed create,
  toggle, or delete that wrote nothing does not refetch.
- **Empty state** — collapsed summary `No subtasks`; expanded
  `No subtasks yet.` plus the inline form. Not the section's centered
  `py-8` empty state (that treatment is for a whole empty card).
- **Copy** — locked above. Fallback toasts, only when `getErrorMessage`
  is empty: `We could not add the subtask. Try again.` /
  `We could not update the subtask. Try again.` /
  `We could not move the subtask. Try again.` Dialog fallback:
  `We could not delete the subtask. Try again.` Field 400 uses the API
  message on the input, not a toast.

Assumptions recorded with those answers (reversible, not a second question):

- Several rows may be expanded at once. Not an accordion.
- Expanded ids live in `AssignmentsSection` (`Set` of assignment ids) and
  survive a background refetch. Mutations do not collapse the row. A newly
  created assignment is not auto-expanded. Drop ids that disappear.
- While a checklist mutation is in flight, disable that checklist's
  checkbox, Up, Down, Delete, input, Add button, and its disclosure (so the
  panel cannot unmount mid-request). Other assignment rows stay usable.
  Set `aria-busy="true"` on the panel. `Button` `isLoading` on the control
  that started the request.
- No optimistic reorder. The projection is the source of truth.
- Focus: disclosure toggle leaves focus on the disclosure. Add success
  leaves focus in the cleared title input. Toggle leaves focus on that
  checkbox. Move success, after the refetch lands, focuses the same
  Up/Down control for that subtask id if it is still enabled, otherwise the
  other move button on that subtask (`data-subtask-focus="up:{id}"` /
  `down:{id}`, layout effect — the assignment-delete pattern). Delete
  cancel returns to the row Delete button (dialog restore). Delete success
  focuses the next subtask's Delete, else the previous, else the title
  input (`data-subtask-focus="add-input"`).
- Tab order replaces the draft "expand → add input → checkboxes". Add is
  visually last; focus order matches visual order (WCAG 2.4.3).
- Panel is `role="region"` `aria-labelledby` the disclosure id, rendered
  only while expanded. Nested `ul` inside the assignment `li`.
- Subtask row: `flex flex-col gap-2 py-2 sm:flex-row sm:items-center
  sm:justify-between`. Controls: `flex flex-wrap gap-2` so Up/Down/Delete
  wrap on a narrow half-width card. Add form: `flex flex-col gap-2
  sm:flex-row sm:items-end` so the button sits beside the input at `sm+`
  and stacks under it below `sm`. No horizontal scroll; `min-w-0` on the
  title.
- No subtask rename control, even though PATCH accepts `title`.

### Element decisions

| Piece | Choice | Why |
|---|---|---|
| Disclosure, Up, Down, Delete, Add | Existing `Button` | Focus ring, sizes, and loading spinner already match this page. |
| Title field | Existing `Input` | Label, `aria-invalid`, and error text already match `AssignmentForm`. |
| Checkbox | Native input in a label | No checkbox component; AC requires a checkbox named with the title. |
| Chevron | `ChevronDown` from `lucide-react` | Already used by `Select`. Decorative only. |
| Checklist | New `features/courses/ui/SubtaskChecklist.tsx` | Row disclosure stays in the section; the panel is the new UI. |
| Confirm | New `features/courses/ui/DeleteSubtaskDialog.tsx` | Same trap as `DeleteAssignmentDialog`; different copy and client call. |
| Client | Functions on `assignmentApi.ts` | Nested assignment routes; no new entity module. |
| Fetch / announce | `CourseDetailPage` callbacks | One `getCourse` source; subtask sentences must not reuse assignment copy. |

## Definition of Done

- The acceptance criteria pass, including client validation and the API
  field error on title.
- Loading, empty, and error behavior holds (DoD 5).
- The checklist is keyboard accessible and works at desktop and mobile
  widths (DoD 6, 7).
- Component tests above pass (DoD 8).
- DoD-10 browser note is in `./artifacts/SP-120J/implementation.md`.
- Parent index at `./artifacts/SP-120/implementation.md` links I and J
  evidence and the contract. That index is this child's closeout, not a
  separate story.
- Do not mark the parent reviewed. Item 11 belongs to the reviewer.

## Sizing

- **Outcome:** A student can manage an ordered subtask checklist on each
  assignment row: add, toggle complete, reorder, delete.
- **Time estimate:** 2.5–3 hours with the 2026-10-25 UI/UX decisions met,
  including the checklist, the thin delete dialog, client functions,
  component tests, fixture updates, and the browser note. The index is
  closeout, not extra scope. Eight criteria are one checklist outcome
  (render, add, toggle, reorder, delete, refetch, states, keyboard) — not
  split. A further child would only restate the same row.
- **Files:** `shared/types/academic.ts`;
  `entities/assignment/api/assignmentApi.ts` and its test; new
  `features/courses/ui/SubtaskChecklist.tsx` and its test; new
  `features/courses/ui/DeleteSubtaskDialog.tsx` and its test;
  `features/courses/ui/AssignmentsSection.tsx` and its test;
  `pages/courses/ui/CourseDetailPage.tsx` (callback + live-region sentences
  only). Fixture-only: `pages/courses/ui/CourseDetailPage.test.tsx`,
  `entities/course/api/courseApi.test.ts`,
  `features/courses/ui/DeleteAssignmentDialog.test.tsx`.
- **Start context:** this file (`Decisions` + Tests), the SP-120 README
  contract, and I's implementation record for the live response shape. Do
  not read stories 5–7 or the full correction log.
- **Verification:** `pnpm --filter @studypilot/web test -- src/features/courses/ui/SubtaskChecklist.test.tsx src/features/courses/ui/DeleteSubtaskDialog.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/entities/course/api/courseApi.test.ts src/features/courses/ui/DeleteAssignmentDialog.test.tsx` passes. Then `pnpm --filter @studypilot/web typecheck` and `pnpm --filter @studypilot/web lint`.
- **Dependencies / exclusions:** Unblocked for code: I is implemented and
  this file's UI/UX gaps were settled on 2026-10-25. Excludes standalone
  tasks, subtask rename, status changes, filters, and overdue views. Those
  epic ACs stay owned in the [EP03 README](../README.md).
