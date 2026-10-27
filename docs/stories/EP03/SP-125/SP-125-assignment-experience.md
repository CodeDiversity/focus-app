# SP-125: Assignment Page and Module Experience

**Story ID:** SP-125
**Title:** Frontend: clearer assignments page and shared module presentation
**Parent epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** Needs refinement
**Dependencies:** SP-124 reviewed (`63f9615`). Visual decisions are unset (D125-4). Do not implement before ui-refiner records them.
**Jira key:** Pending creation

## Summary

The assignments list and the shared assignment modules should feel designed: a readable hierarchy, calmer controls, and states that are easy to scan. Students can already search, filter, sort, create, edit, delete, change status, and manage subtasks. This story changes how that work is presented. It does not add a capability.

## Bounded scope

In: presentation of `AssignmentsPage`, `AssignmentsSection`, `AssignmentRow`, `SubtaskChecklist`, and the assignment dialogs, including the filter bar, row, empty/loading/error states, and the visual treatment inside the existing create/edit modal. Both hosts, because they share the modules (D125-2).

Out: new routes, filters, fields, or API calls (D125-1). A second row implementation. Replacing the modal editor (D125-5 / D124-11). Dashboard "Recent Assignments" (EP05). Board, calendar, or other new views. Backend, schema, and migrations.

If the settled design needs a new interaction or a new endpoint, stop and return that split to the planner. Do not invent it here.

## Source requirement references

- No new epic acceptance criterion. AC-E03-01 through AC-E03-07 stay with their current owners. This story must not remove those behaviors from the list page or the shared modules.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done), items 1, 5, 6, 7, 8, and 10. Items 2, 3, 4, and 9 are not applicable. Item 11 is the final reviewer walkthrough for this unit.
- Decisions D125-1 through D125-6 in the [SP-125 README](./README.md).

## UI/UX gaps (unset — ui-refiner)

Do not treat the notes below as a design. They are the inspected gaps. `ui-refiner` decides layout, hierarchy, components, states, responsive behavior, and copy, and records those decisions in this file before implementation.

1. **List hierarchy.** `AssignmentsPage` puts search, an eight-control filter grid, sort, and the result list in one card. The result count is a live-region line above the card. Search, narrowing, and results are not visually separated.
2. **Unlabeled filters.** `Due from` and `Due to` use `aria-label` only. `Input` shows a visible label only when `label` is passed. Sort direction is an icon button. Sighted scanning is weaker than the accessible names.
3. **Row density.** `AssignmentRow` puts the title, due line, overdue pill, optional course meta, subtask toggle, status select, priority badge, type badge, Edit, and Delete in one flex row. On small screens the list forces a 44px minimum height on every button and select inside it, so one assignment becomes a tall stack of controls.
4. **Status color is unused.** `STATUS_STYLES` exists in `assignmentPresentation.ts` and is not applied. Status is only the native select's text. Priority, type, and overdue already use text-plus-color pills.
5. **Shared-module consequence.** The course section uses the same row, checklist, and form. A list-only restyle will diverge from the course page. A module restyle will change the course page. The design has to say which chrome is host-specific and which is shared.
6. **States.** Loading and the initial error replace the page with a header and one card. Empty and no-match states are centered sentences inside the filter card. The difference is copy and one button, not structure.
7. **Checklist and dialog.** The expanded checklist is a plain list. Create/edit is a `max-w-md` modal. Their visual weight relative to the page is unset. The modal stays (D125-5); its interior treatment is open.

## Acceptance criteria

1. **Settled presentation.** The page and shared modules implement the layout, hierarchy, component choice, state presentation, responsive behavior, and copy recorded in this file by `ui-refiner`. Until those decisions are recorded, this story is not Ready and must not be implemented.
2. **Behavior preserved.** Search, course/status/priority/type/date filters, sort and order, create, edit, delete, status change, subtasks, overdue indication, the course link or "No course", the course host's completed disclosure, refetch, and the current success sentences still work. No new request, route, or field.
3. **One owner, both hosts.** Visual changes to the row, checklist, form, and dialogs land in `features/assignments`. `AssignmentsPage` and `AssignmentsSection` both use that owner. Focus hooks (`data-assignment-focus`, `data-subtask-focus`) remain unless the settled design replaces a control and names the new target here (D125-6).
4. **Accessible and responsive.** The settled design meets WCAG 2.2 AA on desktop and a narrow viewport: keyboard operation, visible focus, text plus color where color is used, and a touch target of at least 44px or a recorded equivalent. Filter controls are understandable without relying on `aria-label` alone, using whatever pattern ui-refiner records.

## Tests

Update incidental class-name or DOM-order assertions when the settled design changes them. Do not delete or weaken assertions of filter params, mutations, focus restoration, live regions, empty/error copy behavior, or ownership of the shared hook.

- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` — list host, including the settled filter and state presentation.
- `apps/web/src/features/assignments/ui/AssignmentsSection.test.tsx` — course host still groups unfinished/completed and uses the shared row.
- `apps/web/src/features/assignments/ui/AssignmentForm.test.tsx` and `SubtaskChecklist.test.tsx` — dialog and checklist behavior held; presentation assertions updated only where the design changes markup.
- `apps/web/src/features/assignments/model/useAssignmentActions.test.ts` — should not need behavior changes. If a restyle requires hook changes, stop; that is outside this story.
- `apps/web/e2e/assignments-list.spec.ts` — regression check if the settled design changes a flow the spec already covers. Do not expand the spec for optional hardening.

Negative cases already owned elsewhere stay there: invalid form input, uniform 404, failed refetch. This story does not re-prove them unless the markup move would drop the existing test.

## Technical notes

Verified current behavior, 2026-10-27:

- `AssignmentsPage` composes `useAssignmentActions`, `AssignmentRow`, and `AssignmentDialogs`. It does not implement edit, delete, status, or subtasks itself.
- `AssignmentsSection` is the course host. It does not receive the list's course meta slot. Title-as-edit is list-only (`onTitleActivate`).
- `AssignmentForm` is a fixed overlay with `role="dialog"`, `aria-modal="true"`, and a focus trap. D124-11 forbids replacing it with an inline editor.
- Pill palettes live in `assignmentPresentation.ts`. Changing colors must keep text plus color (the label is always present).

Proposed, not decided: any card, grouping, disclosure, or control substitution. Those belong in the ui-refiner record.

## Definition of Done

1. The recorded presentation decisions are visible on the list page and, where the module is shared, on the course section.
2. Not applicable — no new input.
3. Not applicable — no new read or write. Existing calls stay principal-scoped.
4. Not applicable — no new request. Existing error toasts remain.
5. Loading, empty, no-match, and initial error are still present, in the presentation ui-refiner records.
6. Core controls remain keyboard operable. New controls follow the settled focus plan.
7. Desktop and a narrow viewport both work, including the settled touch-target rule.
8. The tests listed above cover the preserved behavior and any new presentation behavior the design introduces.
9. Not applicable — no API or migration change.
10. Integrated review of this unit in a development environment, recorded with the implementation.
11. Reviewer walkthrough, once, after implementation. Not required to start.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** The assignments page and shared modules present the same capabilities with a clearer hierarchy and calmer controls, without a new capability or a second implementation.
- **Request/token estimate:** 2–3 once the visual spec stays inside the current hosts and modal. Uncertainty is the unset design. If ui-refiner adds a new interaction, stop and re-size; do not absorb it.
- **Model recommendation:** 3. Applying a settled visual spec while keeping focus hooks and two hosts is careful work, not new domain logic. Raise to 4 if the spec changes interaction patterns rather than presentation.
- **Files:** `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and its test; `apps/web/src/features/assignments/ui/AssignmentRow.tsx`, `AssignmentsSection.tsx`, `SubtaskChecklist.tsx`, `AssignmentForm.tsx`, `AssignmentDialogs.tsx`, `assignmentPresentation.ts`, and the matching component tests. No new production path unless ui-refiner names one.
- **Start context:** this file, the [SP-125 README](./README.md) decisions, D124-10 and D124-11 in the SP-124 README, and the files above. Do not read unrelated epic history to start.
- **Verification:** `pnpm --filter web test -- src/pages/assignments src/features/assignments` (or the repo's current equivalent focused vitest invocation), plus web typecheck and lint. Pass means preserved behavior stays green and new presentation assertions match the recorded design. Browser pass is DoD 10, not a substitute for the component tests.
- **Dependencies / exclusions:** UI refinement first. SP-124 is reviewed and is not a blocker. Excludes API work, EP05 dashboard, and any editor that is not the current modal.
