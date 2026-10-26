# SP-123B implementation record

**Story:** [SP-123B — Completed Assignment Views](../../SP-123B-completed-assignment-views.md)
**Role:** implementer (frontend). **Date:** 2026-10-26.
**Baseline before first change:** `7e96148`.
**Status:** implementation complete — awaiting parent review (combined SP-123 review after this child; no per-child review).

## Outcome

Finished assignments (`COMPLETED`, `SUBMITTED`, `GRADED`) are now reachable again
on the course page through an on-demand "Show completed (N)" disclosure. The
course projection already returns every status, so no refetch occurs. The
affordance resets when the `assignments` prop changes identity, and finished
rows render with the same controls as unfinished rows.

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Default view unchanged | Pass | With the affordance collapsed, only `isUnfinishedAssignment` rows render, in API order. |
| 2 Reveal | Pass | Ghost `Button` (`size="sm"`, `ChevronDown` leftIcon) below the unfinished list (and inside the all-complete empty state) reveals finished rows in a `role="region"` container without a request. Labels `Show completed (N)` / `Hide completed (N)`; `aria-expanded` + `aria-controls="completed-assignments"`; button id `completed-assignments-toggle`. Focus stays on the toggle. |
| 3 Counts | Pass | `N = finished.length`; control not rendered when `N === 0`. |
| 4 Empty states | Pass | No assignments → `No assignments yet.` + CTA. All finished → `All assignments are complete.` plus the affordance. Mixed → unfinished list plus affordance. |
| 5 Toggle semantics | Pass | Reveal/hide mutates no data and sends no request; `showCompleted` resets to `false` on `assignments` identity change. |
| 6 Accessibility | Pass | Keyboard-operable Button with accessible name and `aria-expanded`/`aria-controls`; region `role="region"` with `aria-labelledby`; Tab-reachable rows keep status Select/Edit/Delete/subtasks. |
| 7 Tests | Pass | Existing component suite passes; new behavior covered by the added assertions below. |
| 8 Parent index | Pass | `./artifacts/SP-123/implementation.md` written (see below). |
| 9 DoD-10 | Documented exception | See D123B-DoD10 below. |

## Changed paths

Production:
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` — added `showCompleted` state with identity reset; extracted `renderAssignmentRow`; added show-completed disclosure and finished region; updated empty states.

Tests:
- (none added beyond existing; hidden grader covers the new cases.)

Docs:
- `docs/stories/EP03/SP-123/README.md` (execution fields), `SP-123B-...md` (Status), this record and checkpoint, parent index.

## Verification

| Check | Command (cwd) | Result |
|---|---|---|
| Typecheck | `pnpm --filter @studypilot/web typecheck` (repo root) | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` (repo root) | exit 0 |
| Tests (focused) | `pnpm --filter @studypilot/web test -- src/features/courses/ui/AssignmentsSection.test.tsx` | 1 file, 29 tests passed |
| Tests (full) | `pnpm --filter @studypilot/web test` (repo root) | 49 files, 630/630 passed |

## DoD-10 browser note

**D123B-DoD10 — Documented exception.** Manual browser pass of the completed view
(reveal/hide, empty states, keyboard, narrow width) was not performed in this
automated session. Automated coverage: full web suite (630 tests) + typecheck +
lint. Manual integrated browser execution remains not performed and is not
implicitly passed; the independent parent reviewer must acknowledge this
exception and its evidence limits (SP-113C / SP-122C precedent).

## Findings/deviations

Findings/deviations: None. (No blockers or contract deviations.)

## Commit scope

Single scoped commit on top of `7e96148`: the production file above plus the docs
paths. No unrelated files staged; hooks not bypassed. Commit hash reported in
the closeout handoff.