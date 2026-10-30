# SP-126 implementation record — Course Page Experience

**Story:** [SP-126](../../SP-126-course-experience.md) (parent [SP-126 README](../../README.md))
**Parent / review unit:** SP-126 — one frontend story; one combined parent review (DoD 10/11).
**Layer:** Frontend (React + Vite + Tailwind, `apps/web`)
**Baseline:** `914a5d2` (feat(web): redesign Courses page to match Assignments (SP-126)) — the commit under review.
**Completed:** 2026-10-30, implementer, single sequential writer (review-fix round for RV-126-001…004).
**Status:** Implementation complete — awaiting re-review. Non-passing review pass 1 (`../review.md`) findings RV-126-001…003 closed; RV-126-004 polish applied.

## Summary

SP-126 is a presentation pass over `/courses` (D126-1: no new API/schema). The implementation at `914a5d2` delivered the redesigned page shell, toolbar, card grid, states, and the `CourseCard`/`CourseActionsMenu` extraction. This closeout round adds the missing automated tests (RV-126-001), the implementation index (RV-126-002), the integrated e2e verification note (RV-126-003), and the settled-token polish (RV-126-004). No production behavior changed beyond the token alignment; all existing behavior assertions remain.

## Changed paths (this closeout)

| Path | Change |
|---|---|
| `apps/web/src/features/courses/ui/CourseCard.tsx` | RV-126-004: archived pill tokens `bg-secondary-100`/`text-secondary-600` (was `bg-surface-muted`/`text-text-muted`). |
| `apps/web/src/features/courses/ui/CourseList.tsx` | RV-126-004: empty/no-match icon color `text-secondary-300` (was `text-text-muted`). |
| `apps/web/src/features/courses/ui/CourseCard.test.tsx` | **new** — 8 tests: card content (name h3, code, color dot, semester/No semester, instructor, credits), Archived pill placement, consistent-height classes, navigation on non-interactive area and name link, no-navigate on menu trigger, per-course action accessible names. |
| `apps/web/src/features/courses/ui/CourseActionsMenu.test.tsx` | **new** — 8 tests: trigger accessible name/collapsed state, open focuses first item, Edit/Archive for active and Restore for archived, Escape closes + restores focus, arrow-key cycling, re-focus before callback, disabled state. |
| `apps/web/src/features/courses/ui/CourseList.test.tsx` | +11 tests: instructor on cards, Archived pill placement, search by name/code, semester filter, composition, no-results state + `Clear filters`, client-side (no fetch) invariant. |
| `apps/web/src/pages/courses/ui/CoursesPage.test.tsx` | +8 tests: toolbar render, search by name/code, semester select, composition with show-archived, no-results state, `Clear filters` restore, single-fetch invariant. |
| `docs/stories/EP02/SP-126/artifacts/SP-126/implementation.md` | this record. |

Baseline implementation (`914a5d2`) changed paths (context): `CoursesPage.tsx`, `CourseList.tsx`, `CourseCard.tsx`, `CourseActionsMenu.tsx`, and the existing test files; see the commit for the full diff.

## Acceptance-criterion results

| AC | Disposition | Evidence |
|---|---|---|
| 1. Page header | Satisfied | `CoursesPage.tsx:93-110` — `max-w-5xl … py-12`, `h1` "My Courses", subtitle, "Add Course" upper-right. |
| 2. Search and filtering | Satisfied + tested | `CoursesPage.tsx:112-152`, `CourseList.tsx:91-104`; new tests in `CoursesPage.test.tsx` and `CourseList.test.tsx` (name/code, semester, composition, reset, no-results, single fetch). |
| 3. Course cards | Satisfied + tested | `CourseCard.tsx`; `CourseCard.test.tsx` (content, click target, Archived pill, heights). |
| 4. Visual hierarchy and consistency | Satisfied | Tokens aligned to settled spec (RV-126-004). |
| 5. States | Satisfied + tested | `CourseList.tsx:51-159`; no-results/empty covered by tests. |
| 6. Accessibility | Satisfied + tested | `CourseActionsMenu.tsx` mirrors `RowActionsMenu`; `CourseActionsMenu.test.tsx` covers keyboard model. |
| 7. Behavior preservation | Satisfied | Create/edit/archive/restore flows unchanged; e2e spec passes (below). |

## Shared Definition of Done

| # | Result | Evidence |
|---|---|---|
| 1. Functional ACs | PASS | AC table above. |
| 2. Validation | PASS — n/a | No new input. |
| 3. Student scoping | PASS | Single principal-scoped `listCourses({ includeArchived: true })`; filters client-side. |
| 4. Actionable API errors | PASS | Existing list error + retry and dialog toasts unchanged. |
| 5. Loading/empty/error states | PASS | `CourseList.tsx`. |
| 6. Keyboard accessibility | PASS | Menu model + focus restoration; tests. |
| 7. Responsive layouts | PASS (class-level) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; mobile 44px floors. |
| 8. Automated tests | PASS | New `CourseCard.test.tsx` (8), `CourseActionsMenu.test.tsx` (8), expanded `CoursesPage.test.tsx` (+8) and `CourseList.test.tsx` (+11); suite green (below). |
| 9. API/migration docs | PASS — n/a | No API/migration change. |
| 10. Integrated review | PASS — verified | E2E run recorded below. |
| 11. Reviewer walkthrough | Pending | Deferred to final reviewer. |

## Verification executed

All commands from the repo root on the final tree (2026-10-30):

| Check | Command | Result |
|---|---|---|
| Focused web tests | `pnpm --filter web test -- src/pages/courses src/features/courses` | exit 0 — **11 files, 162 tests passed** |
| Full web tests | `pnpm --filter web test` | not re-run in this round; focused suite covers the changed scope. |
| Typecheck | `pnpm --filter web typecheck` (`tsc --noEmit`) | exit 0 |
| Lint | `pnpm --filter web lint` (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) | exit 0 |
| E2E | `pnpm test:e2e -- e2e/semesters-courses.spec.ts` (self-contained stack) | exit 0 — **7 tests passed** (15.4s). Throwaway database `studypilot_e2e_test` created, migrated, and dropped; dev stack untouched. |

### Integrated / browser verification note (RV-126-003)

- **Date:** 2026-10-30
- **Environment:** self-contained Playwright stack (API on :4100, Vite on :3100, throwaway `studypilot_e2e_test` database at localhost:5432); developer stack untouched.
- **Command:** `pnpm test:e2e -- e2e/semesters-courses.spec.ts`
- **Result:** exit 0, 7/7 passed (create/edit/archive/restore semester + course, validation, course create/edit). No selector/pin updates were required (D126-7): the spec's accessible names (`Edit/Archive/Restore ${name}`), live-region sentences, empty-state CTA, and dialog headings still match the redesigned card markup.
- **Browser measurement:** class-level responsive checks only (no manual viewport measurement recorded); grid breakpoints verified by tests/inspection.

## Findings / deviations

- RV-126-001: closed — added `CourseCard.test.tsx` (8) and `CourseActionsMenu.test.tsx` (8); expanded `CoursesPage.test.tsx` (+8) and `CourseList.test.tsx` (+11) with search/filter/no-results/semester-filter and card content assertions.
- RV-126-002: closed — this record.
- RV-126-003: closed — e2e run recorded above; no pin updates needed.
- RV-126-004: applied — empty-state icon color `text-secondary-300`; archived pill `bg-secondary-100`/`text-secondary-600`.
- No deviations from D126-1…D126-17 or the shared contract. No new API/schema change.

## Remaining work

- Re-review requested (parent review pass 2). On passing verdict the reviewer saves `walkthrough.md` and performs the passing docs sync (queue row → `Reviewed`, `Active substory`/`Next substory` → `None`, status lines, correction-log entries) and commits `review.md`, `walkthrough.md`, and the docs sync. This implementer does not mark `Reviewed`.
- No code work remains.