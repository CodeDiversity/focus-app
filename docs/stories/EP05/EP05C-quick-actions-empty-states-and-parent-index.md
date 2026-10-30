# EP05C: Dashboard Quick Actions, Empty States & EP05 Parent Index

**Story ID:** EP05C
**Title:** Frontend — the working "Add assignment" quick action, the section empty states, and the EP05 parent index
**Parent epic:** [EP05: Student Dashboard](../../epics/EP05-student-dashboard.md) (Jira STUDY-19)
**Parent:** [EP05 breakdown](./README.md)
**Milestone:** M2 (Calendar and dashboard)
**Layer:** Frontend (integration / parent index)
**Status:** Needs refinement — the `ui-refiner` pass (D05-12) must settle the quick-actions layout, the add-assignment presentation, the empty-state copy and the loading/error presentation before implementation. Not implemented.
**Dependencies:** EP05A and EP05B implemented (the sections whose empty states it writes and the data it refreshes). EP02/EP03/EP04 complete (satisfied).
**Jira key:** Pending creation
**Refined:** — (awaiting the `ui-refiner` pass; the specific gaps are recorded at the end of this file)

## Summary

Make the dashboard actionable: ship the one quick action EP05 owns — "Add assignment" — wired through the shared assignment owner so a created assignment appears on the dashboard immediately, and give every section an empty state that explains what the student can do next. Close the epic by writing the EP05 parent implementation index (combined change scope, AC/TR ownership, commands and results, and the DoD-10 manual browser pass).

## Description & bounded scope

### In scope

1. **The quick-actions block** — `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx` (new). It offers **exactly one** action, "Add assignment", which opens the shared assignment form via the shared owner (`useAssignmentActions` + `AssignmentDialogs` + `AssignmentForm`). The placeholder's "Create Study Plan" (EP06) and "Start Focus Session" (EP07) buttons are **not** shipped — omitted, not shipped disabled (D05-5, which resolves EP07's D07-9 seam).
2. **The cache hand-off** — after a successful create, the dashboard's assignments query is invalidated/refetched so the upcoming/overdue sections update without a page reload.
3. **The empty states** — every section's empty state (AC-E05-06): each states what the student can do next and offers the matching action or link (add an assignment, open the calendar, open the assignments list, …). The empty states live with the sections (EP05B) but their **copy** is settled here, so the two children agree.
4. **The focus and announcement contract** — where focus lands after the dialog closes, and what the page's live region announces after a create (DoD 6).
5. **The EP05 parent index** — `./artifacts/EP05/implementation.md`: the review scope (parent + the complete child inventory + each implementation link), the combined Git change scope (base and final commits, not only the last child's diff), the AC/TR/DoD ownership with links to the collected evidence, the commands run and their results (planned checks are never labelled as executed), the known gaps, and the DoD-10 manual browser pass (TR-E05-08).
6. **Tests** (TR-E05-05, TR-E05-06, TR-E05-07).

### Out of scope

- Creating study plans (EP06) or focus sessions (EP07) — no such action ships (D05-5).
- Any backend change or new endpoint (D05-3); the action uses the existing `POST /assignments`.
- A study-stats surface (D05-11 — no endpoint exists; V-05-2).
- The reviewer-owned `review.md` and `walkthrough.md` — the reviewer writes them (DoD 11).

## Source requirement references

- **Epic AC-E05-05** (the "add assignments" half), **AC-E05-06** (empty states).
- **Shared DoD** — items 1, 5, 6, 7, 8, 9 (the parent index), 10 (the manual browser pass) and 11 (the reviewer walkthrough, in the combined review).
- **Decisions:** D05-5 (quick actions: add assignment only; the EP07 D07-9 seam resolves here), D05-11 (the placeholder's static cards are not carried over), D05-14 (no dashboard e2e spec; the DoD-10 evidence is a recorded manual browser pass), D05-15 (a student with no courses can still use the dashboard).

## Acceptance criteria

1. **The quick action.** The dashboard's quick-actions block offers exactly one action — "Add assignment" — which opens the shared assignment form in create mode. The placeholder's "Create Study Plan" and "Start Focus Session" buttons are not rendered (D05-5).
2. **The create round-trip.** A successful create closes the dialog, refreshes the dashboard's assignment data so the affected sections update, and moves focus to a stable, visible control; a failed create shows an actionable message, keeps the form open with the student's input, and announces the failure.
3. **The empty states.** Every section's empty state explains what the student can do next and offers the matching action or link; no section renders an empty state that names a feature the dashboard does not have (AC-E05-06).
4. **The EP05 parent index.** `./artifacts/EP05/implementation.md` records the review scope (parent + all three children + their implementation links), the combined Git change scope (base and final commits, with each child's commits), the AC/TR/DoD ownership mapped to the collected evidence, the commands run with their results (planned checks are never labelled as executed), the known gaps (including D05-14's missing e2e coverage), and the DoD-10 manual browser pass with its steps and expected results.

## Tests to add

- `apps/web/src/features/dashboard/ui/DashboardQuickActions.test.tsx` (new):
  - The block renders exactly one action, labelled "Add assignment"; "Create Study Plan" and "Start Focus Session" are **not** in the document.
  - Activating it opens the shared assignment form (its title field is present and focused/reachable), and closing it returns focus to the activating control.
  - A successful create closes the dialog, issues the assignment mutation, and refreshes the dashboard's assignments data (the refreshed rows are visible).
  - A failed create keeps the form open, shows the shared actionable error copy, and does not add a row.
  - The action is keyboard-operable (Enter/Space) with a visible focus ring.
- `apps/web/src/features/dashboard/ui/DashboardEmptyStates.test.tsx` (new) — one case per section:
  - Each empty state renders its heading, a sentence naming what the student can do next, and the matching action or link (a link to `/assignments` or `/calendar`, or the add-assignment action where that is the right next step).
  - No empty state mentions a study plan, a focus session, or any other action the dashboard does not offer.
  - The empty states are distinguishable from the error states (an error state is announced, an empty state is not).
- **Responsive / accessibility (TR-E05-07):** the quick-actions block is operable and fully visible at 375px with tap targets ≥ 44px; the empty states wrap without horizontal scrolling; every action is reachable in the tab order.
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/pages/dashboard`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified codebase facts (inspected 2026-10-29)

- **The reusable owner for "add an assignment"** — `apps/web/src/features/assignments/model/useAssignmentActions.ts`: it owns the create/edit/delete dialog state, the status PATCHes, the subtask state and the **focus-management contract** (focus moves to a stable `[data-assignment-focus="add"]` control after a create, to a neighbour row after a delete/status change, and to the empty-state's `[data-assignment-focus="empty-add"]` control while the list is empty). Its host supplies `items`, `onChanged`, `onSubtaskChanged`, `onSubtaskRefresh` and optionally `onPending`/`onFormOpen`. **This hook is the reusable owner EP05C must use** rather than writing a second create flow.
- **The shared dialog mount** — `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx`: renders the create `AssignmentForm`, the edit `AssignmentForm` and `DeleteAssignmentDialog` from the hook's state. Props: `actions`, optional `courseId` (fixed course — the dashboard omits it), optional `courses` (the create-mode course select's options) and optional `initialCourseId`.
- **The create form** — `apps/web/src/features/assignments/ui/AssignmentForm.tsx`: `AssignmentFormProps { courseId?, courses?, initialCourseId?, assignment?, onSuccess, onClose }`. In create mode without `courseId` it renders a course select fed by `courses` (empty `courses` → the student can still create a course-less assignment, D05-15). The form validates with zod (title 1–200, due date, estimated hours ≤ 1000, priority, type, description ≤ 2000) and posts through `createAssignment()` → `POST /assignments`; it shows the shared field-error copy and closes on success.
- **The reference host** — `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx:251-260` wires the hook (`onChanged` → refetch + a live-region sentence; `onSubtaskChanged`/`onSubtaskRefresh` → refetch) and `:610` mounts `AssignmentDialogs`. The dashboard host supplies the same callbacks against the RTK Query cache instead of a local fetch.
- **The course list** — `apps/web/src/entities/course/api/courseApi.ts` (`listCourses()`), a plain-axios entity client. Whether the dashboard's create dialog offers a course select is a ui-refiner decision (the gap list); if it does, the courses must be loaded — and D05-1 gives the dashboard two RTK Query slices (assignments, calendar), so the course options would come from the existing plain-axios client. That mixing is recorded as a known, reversible trade-off of D05-1 rather than a third slice.
- **The dashboard's data hooks** (EP05A) — `useAssignmentsQuery()` (RTK Query) and `useCalendarEventsQuery({ from, to })`. After a create, the dashboard invalidates/refetches the assignments query; the calendar query is unaffected.
- **The placeholder's quick actions** — `apps/web/src/pages/dashboard/ui/DashboardPage.tsx:32-45`: three inert `Button`s ("Add New Assignment", "Create Study Plan", "Start Focus Session") with no handlers. EP05B removes them; EP05C adds the working one.
- **Live-region precedent** — `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx:518-527`: a `role="status"` region that also acts as the count header, plus `ACTION_SENTENCES`/`STATUS_SENTENCES`/`SUBTASK_SENTENCES` for the announcements. The dashboard's live region follows the same pattern.
- **Focus-management precedent** — the `data-assignment-focus="add"` / `"empty-add"` attributes are the hook's stable focus targets; the dashboard's host must render the "Add assignment" control with `data-assignment-focus="add"` so the hook's post-create focus move lands on it.
- **Error copy** — `apps/web/src/shared/lib/errors.ts` (`getErrorMessage`, `extractApiError`, `apiErrorMessage`, `getFieldError`) and `apps/web/src/features/assignments/ui/AssignmentForm.tsx`'s existing submit-failure handling.
- **Icons** — `lucide-react` 0.312.0: `Plus` (verified) is available for the add action; `CircleAlert`/`TriangleAlert` do **not** exist in 0.312.0.

### Design decisions (planner-recorded)

1. **One action, not two inert ones.** The placeholder's "Create Study Plan" and "Start Focus Session" are omitted rather than shipped disabled (D05-5). EP07 deliberately left its button inert because EP05 owns this surface (D07-9); EP05 now decides it does not appear until EP07 lands. Recording this here closes the D07-9 seam explicitly rather than leaving a dead button on the page.
2. **The shared owner does the work.** The dashboard does not implement its own create form, its own validation or its own focus handling — it mounts `AssignmentDialogs` with `useAssignmentActions` and points `onChanged` at the RTK Query invalidation. Two create flows would drift.
3. **No optimistic insert.** The new assignment appears only after the server confirms it (the assignments query is invalidated/refetched). A dashboard that shows an unconfirmed row would show work the server rejected.
4. **The empty states name real next steps.** Every empty state points at something the student can actually do from the dashboard (add an assignment, open the assignments list, open the calendar). No empty state mentions a study plan or a focus session (D05-5).
5. **The parent index belongs to this child** — the last substantive child owns the combined evidence record (the sizing policy: no index-only or verification-only child). The reviewer's `review.md` and `walkthrough.md` are **not** this child's output.

### Proposed files

- `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx` (**new**) — the quick-actions block and its wiring.
- `apps/web/src/features/dashboard/ui/DashboardEmptyStates.tsx` (**new**) — the shared empty-state content per section (if a single shared component is the ui-refiner's choice; otherwise the empty state lives in each section file).
- `apps/web/src/features/dashboard/ui/DashboardQuickActions.test.tsx` (**new**)
- `apps/web/src/features/dashboard/ui/DashboardEmptyStates.test.tsx` (**new**)
- `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modify — mount the quick actions, the dialogs and the empty states)
- `apps/web/src/features/dashboard/ui/*Section.tsx` (modify — the empty-state content/copy, if the empty states live in the section components)
- `docs/stories/EP05/artifacts/EP05/implementation.md` (**new**) — the parent index (an artifact, not application code).

### Remaining risks / implementation notes (not blockers)

- **The hook needs `items`.** `useAssignmentActions` requires the host's visible rows. On the dashboard the rows are the *derived* upcoming/overdue sets — the hook treats `items` as "the rows currently visible in this host", so the dashboard passes its derived rows (or an empty list when the dashboard shows no assignment rows). The implementer must confirm the hook's focus neighbours behave sensibly with a derived, capped list.
- **The post-create focus target must exist.** The hook focuses `[data-assignment-focus="add"]` after a create; if the dashboard's action control does not carry that attribute, focus is lost. The dashboard's "Add assignment" control must carry it (the assignments page's precedent, `AssignmentsPage.tsx:301-307`).
- **Cache invalidation, not a manual merge.** Use the RTK Query invalidation for the assignments tag; do not patch the cache by hand (a hand-patched row would diverge from the endpoint's projection and its order).
- **The create form's course select.** If the ui-refiner wants it, `courses` must be supplied (the existing plain-axios `listCourses()`); the alternative is a course-less assignment (D05-15). Mixing one plain-axios read into an RTK Query page is a deliberate, recorded trade-off of D05-1, not an oversight.
- **The dialog's placement.** The shared `AssignmentForm` is a focus-managed dialog; mounting it from the dashboard must not break the page's focus order or trap focus outside the dialog (the shared component owns the trap).
- **The empty states and the sections must agree** — the section components (EP05B) and the empty-state copy (EP05C) are two halves of one decision; the `ui-refiner` pass covers both children, so the copy is settled once.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — no new input; the reused `AssignmentForm` keeps the SP-113/SP-114 validation and its tests unchanged.
3. Not applicable — no data-access change; the action uses the existing `POST /assignments` (principal-scoped server-side).
4. Not applicable — no API error-contract change; the shared actionable error copy is reused.
5. Loading, empty and error states are implemented: the empty states explain the next step, the create failure keeps the form open with an actionable message, and the page's error states are EP05B's.
6. Keyboard accessibility: the action is operable with the keyboard, the dialog's focus trap and restoration come from the shared form, focus lands on a stable control after a create, and the page's live region announces the outcome.
7. Responsive: the quick-actions block and the empty states are fully usable at 375px with tap targets ≥ 44px.
8. Automated component tests pass (TR-E05-05, TR-E05-06, TR-E05-07).
9. Not applicable — no API change and no migration; the parent index documents what was built and what was run.
10. Integrated review — the manual browser pass recorded in `./artifacts/EP05/implementation.md` (TR-E05-08) plus the combined EP05 parent review.
11. Reviewer walkthrough — the combined EP05 parent review (the reviewer owns `walkthrough.md`).

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** the dashboard's one quick action works end to end through the shared assignment owner (create → cache refresh → focus), every section explains what to do next when empty, and the EP05 parent index records the combined evidence.
- **Request/token estimate:** ~2–3 requests/tokens — the quick-actions block with its dialog wiring and cache hand-off, the empty states, the tests, and the parent index. Uncertainty: low-to-moderate — the shared owner does most of the work; the index is a documentation artifact, not a build.
- **Model recommendation:** 2 — the interaction is mostly reuse of an existing, tested owner; the residual risk is the focus/cache hand-off, not new logic.
- **Files:** `apps/web/src/features/dashboard/ui/DashboardQuickActions.tsx` (new), `.../DashboardEmptyStates.tsx` (new), `.../DashboardQuickActions.test.tsx` (new), `.../DashboardEmptyStates.test.tsx` (new), `apps/web/src/pages/dashboard/ui/DashboardPage.tsx` (modify), `apps/web/src/features/dashboard/ui/*Section.tsx` (modify — empty-state content), `docs/stories/EP05/artifacts/EP05/implementation.md` (new — parent index).
- **Start context:** this story; `docs/stories/EP05/README.md` (shared contract + D05-5, D05-11, D05-14, D05-15); EP05A's and EP05B's implementation records (`./artifacts/EP05A/implementation.md`, `./artifacts/EP05B/implementation.md`) for the exact hook/selector names and the section components; `apps/web/src/features/assignments/model/useAssignmentActions.ts`; `apps/web/src/features/assignments/ui/AssignmentDialogs.tsx`; `apps/web/src/features/assignments/ui/AssignmentForm.tsx`; `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` (the reference host).
- **Verification:** `pnpm --filter web test -- src/features/dashboard src/pages/dashboard`, `pnpm --filter web typecheck`, `pnpm --filter web lint`; plus the manual browser pass recorded in the parent index (TR-E05-08).
- **Dependencies / exclusions:** EP05A and EP05B implemented. Excludes the data layer (EP05A), the sections (EP05B), any study-plan/focus-session action (D05-5), any backend work (D05-3), a study-stats surface (D05-11), a dashboard e2e spec (D05-14), and the reviewer-owned `review.md`/`walkthrough.md`.

## UI/UX gaps for the `ui-refiner` (D05-12 — not yet settled)

- **The quick-actions layout:** where the block sits on the page (above the sections? beside the heading?), its shape (a card, a button row, a CTA in the heading), and how it behaves at 375px.
- **The action's label and icon:** "Add assignment" (matching the assignments page) vs. the placeholder's "Add New Assignment"; whether an icon accompanies the label.
- **The add-assignment dialog on the dashboard:** whether the create form offers a **course select** (which needs the student's course list) or creates a course-less assignment (D05-15); and whether the dialog is presented identically to the assignments page's.
- **The empty-state copy per section:** what each section says when it is empty and what it tells the student to do next (the assignments sections point at "Add assignment"; the class and session sections point at the calendar / the course list) — the copy must not imply a study plan or a focus session exists (D05-5).
- **The empty state's affordance:** a button, a link, or both; and whether the assignments sections repeat the "Add assignment" action inside their empty state.
- **Loading/error presentation for the action:** the busy state of the "Add assignment" button while the form is open, and whether the page announces the created assignment in a live region.
- **Focus behaviour after a create:** the shared hook moves focus to the stable add control — whether the dashboard wants that, or wants focus to move to the newly created row instead (the hook's default is the add control; changing it means changing the shared owner, which is out of scope — flag it if it is wanted).
- **Responsive behaviour at 375px** of the quick-actions block and the empty states (stacking, wrapping, tap targets ≥ 44px).
- **Keyboard behaviour and focus order** of the quick action relative to the page heading and the first section.
