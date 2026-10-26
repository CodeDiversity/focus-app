# SP-123A implementation record

**Story:** [SP-123A — Overdue Identification](../../SP-123A-overdue-identification.md)
**Role:** implementer (frontend). **Date:** 2026-10-26.
**Baseline before first change:** `3c48619` (working tree clean at start).
**Status:** implementation complete — awaiting parent review (combined SP-123 review after A and B; no per-child review).

## Outcome

Overdue unfinished assignments are now identifiable at a glance on both the
course-detail section and the cross-course list page. The rule lives in one
shared predicate, `isOverdueAssignment`, in
`entities/assignment/model/status.ts`, and both surfaces render the same red
"Overdue" pill on the due-date line beside the neutral due date. No API,
schema, or status change is involved.

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Predicate | Pass | `isOverdueAssignment(value, now?)` returns true iff the row is unfinished (`isUnfinishedAssignment`) and has a non-null `dueDate` strictly before `now` (default `Date.now()`). Null due dates, finished statuses, not-yet-due rows return false. Accepts `{ status, dueDate }`. |
| 2 Course detail | Pass | Red pill "Overdue" (`bg-red-100 text-red-700`, `rounded-full`) renders on the due-date line immediately beside `Due <date>`; due date keeps neutral color. Non-overdue rows unchanged. |
| 3 List page | Pass | Same pill on each overdue row, reusing exported `OVERDUE_STYLE` / `OVERDUE_LABEL`. |
| 4 Accessibility | Pass | Text label (not icon-only); due date remains in row text. No new interactive control. |
| 5 No regression | Pass | Status control, subtasks, edit/delete, filters/sort/search unchanged; no new request. Full web suite green. |
| 6 Tests | Pass | Helper unit tests cover all listed cases incl. `now` override; existing component suites pass. |

## Changed paths

Production:
- `apps/web/src/entities/assignment/model/status.ts` — added `isOverdueAssignment`.
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — exported `OVERDUE_STYLE`/`OVERDUE_LABEL`; overdue pill on the due-date line.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — imported shared constants + predicate; overdue pill on the due-date line.

Tests:
- `apps/web/src/entities/assignment/model/status.test.ts` — extended with `isOverdueAssignment` cases.

Docs:
- `docs/stories/EP03/SP-123/README.md` (execution fields), `SP-123A-...md` (Status), this record and checkpoint.

## Verification

| Check | Command (cwd) | Result |
|---|---|---|
| Typecheck | `pnpm --filter @studypilot/web typecheck` (repo root) | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` (repo root) | exit 0 |
| Tests (focused) | `pnpm --filter @studypilot/web test -- src/entities/assignment/model/status.test.ts src/features/courses/ui/AssignmentsSection.test.tsx src/pages/assignments/ui/AssignmentsPage.test.tsx` | 3 files, 51 tests passed |
| Tests (full) | `pnpm --filter @studypilot/web test` (repo root) | 49 files, 630/630 passed |

## Findings/deviations

Findings/deviations: None. (No blockers or contract deviations.)

## Commit scope

Single scoped commit on top of `3c48619`: the production/test files above plus the
docs paths. No unrelated files staged; hooks not bypassed. Commit hash reported
in the closeout handoff.