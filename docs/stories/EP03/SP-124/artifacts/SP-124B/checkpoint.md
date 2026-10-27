# SP-124B checkpoint — list page adopts the shared interaction

**Story:** [SP-124B](../../SP-124B-list-adopts-shared-interaction.md)
**Status:** Implemented — awaiting parent review
**Started / finished:** 2026-10-26
**Execution state:** [SP-124 README](../../README.md#execution-queue) — B `Implemented — awaiting parent review`; A and B await the combined parent review.
**Review unit:** SP-124 combined parent review (`./artifacts/SP-124/implementation.md`, written by C).

## Progress

- [x] Read queue, story, `SP-124A` implementation, shared feature code, page and existing tests
- [x] Replace the page's private row markup with `AssignmentRow`, title-opens-edit, course meta link
- [x] One `useAssignmentActions` call + one `AssignmentDialogs` mount; mutate-then-refetch with current params
- [x] Refetch spinner/`aria-busy` + fixed refetch-error toast; keep the last list
- [x] Extend `AssignmentsPage.test.tsx` with the AC 8 cases
- [x] Focused tests, full web suite, typecheck, lint
- [x] Closeout records, queue reconciliation, commit — see [implementation.md](./implementation.md)

## Decisions, findings and deviations

- SP-124A exports are the only interaction owner (D124-10): `useAssignmentActions`,
  `AssignmentRow`, `AssignmentDialogs`, `assignmentPresentation`. The page holds no
  status/delete/subtask logic.
- `AssignmentDialogs.courseId` is still required (create is unreachable until
  SP-124C); the list passes `''` and never calls `openForm` (D-124B-1).
- Mutation refetches pass a sentence prefix so the live region keeps the action
  copy plus the new count; failed background refetches toast the fixed AC 4 copy.
- **D-124B-2 (shared copy alignment, AC 6).** `DeleteAssignmentDialog` now maps a
  404 to the uniform sentence the edit form uses. This also affects the course
  host; required by B's AC 6. The existing dialog test now asserts the full copy.
- **D-124B-3 (open, owner SP-124C).** Deleting the last list row leaves focus on
  `<body>`: the shared hook falls back to `[data-assignment-focus="add"]`, which
  the list does not have until C adds the Add control. No B AC requires the
  fallback target; C should mount the control with that attribute.
- **D-124B-4 (existing shared behavior).** A generic delete failure stays the
  dialog's inline sanitized alert (with retry) rather than a toast; AC 6's toast
  examples are the status and save messages. A toast would duplicate the inline
  message and change the course host.
- Test scaffolding: the page test's API module factory must now mock the whole
  assignment client (the shared hook/dialogs import it), not only `listAssignments`.
  Page mocks were hoisted so both suites share them.

## Verification

- `pnpm --filter @studypilot/web test -- src/features/assignments src/pages/assignments/ui/AssignmentsPage.test.tsx` — 131 passed (7 files)
- `pnpm --filter @studypilot/web test` — 655 passed (50 files)
- `pnpm --filter @studypilot/web typecheck` — passed
- `pnpm --filter @studypilot/web lint` — passed (0 warnings)
- Details and AC mapping: [implementation.md](./implementation.md)

## Next action

None for B. C remains `Needs refinement` (ui-refiner), then implement. The
combined parent review happens after C.
