# SP-120J implementation record

**Story:** SP-120J — Subtask checklist UI · **Parent:** [SP-120](../../README.md)
**Status:** Implementation complete — awaiting parent review (2026-10-25)
**Checkpoint:** [checkpoint.md](./checkpoint.md)

## AC-by-AC outcomes

| AC | Requirement | Outcome | Evidence |
|---|---|---|---|
| 1 | Disclosure, collapsed summary, expanded checklist in API order, existing row controls stay | ✅ | `AssignmentsSection` disclosure (`aria-expanded` / `aria-controls`, summary copy, chevron). Panel renders given order. Badge/Edit/Delete cluster unchanged. `AssignmentsSection.test.tsx` summary + expand/collapse. |
| 2 | Inline add, title validation, 400 on the input, Enter, success clears and announces | ✅ | `SubtaskChecklist` form. Create body is `{ title }` only. `SubtaskChecklist.test.tsx` add / Enter / empty / whitespace / >200 / 400 / network. |
| 3 | Native checkbox named with the title; PATCH `{ status }` only; no strikethrough or Completed badge | ✅ | Click and Space (`user.keyboard(' ')`). Title classes asserted. |
| 4 | Up/Down swap two `orderIndex` PATCHes; disabled at the ends; one announcement | ✅ | Unequal swap, equal-index single PATCH, end-button disabled states. `Subtask moved.` is one `onChanged('moved')`. |
| 5 | Delete opens `DeleteSubtaskDialog`; confirm DELETEs; cancel does not | ✅ | `DeleteSubtaskDialog.test.tsx` + checklist confirm/cancel. |
| 6 | Success background-refetches `getCourse`; no second list source; no `onAssignmentChanged` | ✅ | Page maps the action to the subtask sentence then `load({ background: true })`. Partial reorder calls `onSubtaskRefresh` only. `CourseDetailPage.test.tsx` add case. Checklist does not call `listSubtasks`. |
| 7 | Empty copy, title 400 stays on the input, other failures toast and keep the list, delete failure stays in the dialog, row stays open | ✅ | Empty `No subtasks yet.` Expanded ids survive a rerender with the same assignments. |
| 8 | Tab order matches visual order; narrow layout classes; badge cluster unchanged | ✅ | Section tab-order test skips disabled end buttons (native disabled). Row/form classes pin the settled responsive layout. Real phone-width scroll is the open browser note below. |

## Verification

Commands run from the repo root. Tested tree is this closeout commit (baseline before it: `c7007db`).

| Check | Command | Result |
|---|---|---|
| Story paths | `pnpm --filter @studypilot/web test -- src/features/courses/ui/SubtaskChecklist.test.tsx src/features/courses/ui/DeleteSubtaskDialog.test.tsx src/features/courses/ui/AssignmentsSection.test.tsx src/entities/assignment/api/assignmentApi.test.ts src/pages/courses/ui/CourseDetailPage.test.tsx src/entities/course/api/courseApi.test.ts src/features/courses/ui/DeleteAssignmentDialog.test.tsx src/features/courses/ui/AssignmentForm.test.tsx` | 8 files, 155 tests passed |
| Full web suite | `pnpm --filter @studypilot/web test` | 47 files, 597 tests passed |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | pass |
| Lint | `pnpm --filter @studypilot/web lint` | clean, 0 warnings |

## DoD-10 browser note (blocked for this context — recorded as the story allows)

**Not executed.** This agent context has no authenticated interactive browser session. The app has no seeded demo account, and registering a throwaway user to walk course detail would write rows into the shared local database without authorization. Component tests cover expand/add/toggle/reorder/delete, the live-region sentence, background refetch, tab order, and the settled responsive classes. They are not a live browser-to-API journey or a measured phone-width layout.

Manual steps for the final review walkthrough or a human pass:

1. Start the API and web app; sign in; open a course that has an assignment.
2. Read the collapsed summary (`No subtasks`, counts, `{n} complete`). Expand the row. Confirm Edit/Delete and the badges are still there.
3. Add a subtask. Confirm `Subtask added.`, the input clears, the row stays open, and the new row appears after refresh.
4. Toggle the checkbox. Confirm `Subtask completed.` / `Subtask marked incomplete.` and that the title is not struck through.
5. Move it with Up/Down. Confirm one `Subtask moved.` and the new order after refresh.
6. Delete it through the dialog. Cancel once (no request). Confirm once. Confirm `Subtask deleted.`
7. Tab in the settled order. Narrow the window to a phone width and confirm the row does not scroll horizontally.

This stays an open item for the combined parent review. It is not a child-internal pass.

## Changed paths

- `apps/web/src/shared/types/academic.ts` — `Subtask` and required `subtasks` on `CourseAssignment`
- `apps/web/src/entities/assignment/api/assignmentApi.ts` — `listSubtasks`, `createSubtask`, `updateSubtask`, `deleteSubtask`
- `apps/web/src/features/courses/ui/SubtaskChecklist.tsx` — new checklist
- `apps/web/src/features/courses/ui/DeleteSubtaskDialog.tsx` — new confirm dialog
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — disclosure, expanded-id set, checklist mount
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — subtask sentences and background refetch
- Tests: the two new component tests, `AssignmentsSection.test.tsx`, `assignmentApi.test.ts`, `CourseDetailPage.test.tsx`
- Fixture-only: `courseApi.test.ts`, `DeleteAssignmentDialog.test.tsx`, `AssignmentForm.test.tsx` (`subtasks: []`)
- Parent index: [../SP-120/implementation.md](../SP-120/implementation.md)

## Findings and deviations

| ID | Source | Observation | Disposition | Closure |
|---|---|---|---|---|
| J-1 | Story fixture list vs typecheck | `AssignmentForm.test.tsx` builds a `CourseAssignment` and was not in the story's fixture list. Required `subtasks` failed typecheck. | Fixed | `subtasks: []` on that fixture. Full web typecheck pass. |
| J-2 | D120-5 vs I-8 | Direct POST/PATCH `/assignments` stays 11-key. `CourseAssignment` now requires `subtasks` because the course projection and this story say so. The checklist never renders the create/update response. | Closed — documented on the type. No client-side empty array injected into those responses. | Comment on `CourseAssignment`. |
| J-3 | DoD 6 / IR-114-02 pattern | Consecutive identical subtask sentences would not re-announce if the live region text did not change. Added optional `onSubtaskPending` so the page clears the region before the request. Required props `onSubtaskChanged` and `onSubtaskRefresh` are unchanged. | Fixed | Wired from `CourseDetailPage`. |
| J-4 | DoD-10 | Manual browser pass not executed in this context. | Open | Steps above. Owner: final parent review walkthrough / user. Not a code gap. |

No other deviations. Rename, drag-and-drop, and a progress bar were not added.
