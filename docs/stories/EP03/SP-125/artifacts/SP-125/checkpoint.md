# SP-125 checkpoint
Updated: 2026-10-27
Execution state: [SP-125 queue row](../../../README.md#execution-queue) — Implemented — awaiting parent review; next action is the parent review (reviewer) per [implementation record](./implementation.md)
Story: [SP-125-assignment-experience.md](../../SP-125-assignment-experience.md)
Review unit: SP-125 standalone (implementation index will be this folder's `implementation.md`)
Role / scope: implementer; frontend presentation pass only. No API/schema/route change, no second row, no hook logic change (D125-1…6).

## Repository state
- Workspace / branch: `main` (shared workspace; verify `git status` before staging)
- HEAD at last update: `3cde1ad1b7f2c7469c44d4a2aab1107e337c5774` (plan) — implementer start pending
- Saved work: none yet for SP-125 beyond refined story + README plan (already committed)
- Other work to preserve: none known; confirm with `git status --short` each milestone

## Progress
- [x] S1: `assignmentPresentation.ts` gains `STATUS_SELECT_STYLES` (D125-8 palette)
- [x] S2: `AssignmentRow.tsx` pill status selector + Edit/Delete visual polish; DOM order, `data-assignment-focus`, and the `flex flex-wrap gap-2` cluster kept
- [x] S3: `SubtaskChecklist.tsx` framed panel + `{done} of {len} complete` counter; item/title/form contract classes untouched
- [x] S4: `AssignmentsPage.tsx` two-tier filter bar (Search/Course/Status primary; collapsible secondary panel with visible labels; count on toggle), live-region summary hosts spinner, icon empty/no-match states, red-accent init error card
- [x] S5: `AssignmentForm.tsx` `max-w-lg`, secondary Cancel, footer divider
- [x] S6: tests updated (3 secondary-filter tests open the panel first); 5 presentation tests added (`AssignmentsPage.test.tsx` SP-125 describe); `AssignmentForm.test.tsx` width class updated — 161/161 green
- [x] S7: verification (161 passed, typecheck exit 0, lint clean after prettier fix)
- [x] S8: `implementation.md` written; README queue + story statuses updated; code committed as `b3e92db`, docs closeout commit follows
- Current step: done — awaiting parent review.

## Decisions and dependencies
- Secondary panel default-collapsed; count covered non-default sort/order too. While collapsed, secondary controls are unmounted — three existing tests were updated to toggle first (presentation-owned; behavior untouched).
- Priority/Type/Sort-by + date fields: visible labels, `aria-label` removed to avoid duplicate accessible names; accessible names unchanged (`Due from`, `Due to`, `Priority`, `Type`, `Sort by`).
- Status pill select is a local component (not the shared `Select`) to avoid base `bg-white` conflicts under plain `clsx`.
- DoD-10 browser pass: not executed by implementer; remains the standing process for the review unit (component + e2e spec paths still cover the flows).

## Verification
- `pnpm --filter web test -- src/pages/assignments src/features/assignments` (cwd apps/web): **7 files / 161 tests passed**
- `pnpm --filter web typecheck`: exit 0
- `eslint src/pages/assignments src/features/assignments --ext ts,tsx`: clean (after prettier autofix; one autofix pass applied)
- e2e spec not executed (needs the self-contained stack); checked its selectors remain valid (`Course` label unchanged; dialog `Priority` unchanged).

## Resume next
1. Finish closeout: `implementation.md`, README queue statuses, scoped commit.
- Read next: nothing else.

## Decisions and dependencies
- Story decisions D125-1…10 binding. Key parity risk: `AssignmentRow` is shared by list and course hosts — do not fork; keep host-specific slot `meta` and optional `onTitleActivate` intact.
- Focus hooks (`data-assignment-focus`, `data-subtask-focus`) preserved verbatim (D125-6).
- Existing tests will assert DOM structure; start from tests to know assertions before markup changes.

## Verification
- Completed: `pnpm --filter web test -- src/pages/assignments src/features/assignments` — 7 files / 161 tests passed (see `implementation.md` for commands and commit scope).
- Completed: `pnpm --filter web typecheck` exit 0; scoped eslint clean.
- e2e spec not executed this pass (requires the self-contained stack; DoD-10 note carries over).

## Resume next
1. Closeout only — see `implementation.md` once written.
