# SP-126 independent implementation review — pass 2 (final)

**Date:** 2026-10-30
**Pass:** 2 (re-review after implementer fix round)
**Review task:** Complete — **passing verdict**. All prior should-fix findings closed with evidence; no new blocker/should-fix findings. Final walkthrough and passing docs sync performed (see below).
**Reviewed state:** code commit `97803b4` (fix: tests, implementation index, token polish) over baseline `914a5d2`; docs commit `baa859d`. Reviewed against the implementer's final tree as recorded in `implementation.md`. Reviewer did not independently re-run Git (no shell in this session); code/test inspection performed for all changed files.
**Review unit:** SP-126 standalone (one frontend story; no substories; no backend work).
**Canonical queue:** [../../README.md](../../README.md#execution-queue).
**Implementation index:** [implementation.md](./implementation.md) (present; closes RV-126-002).
**Prior report:** [review.md pass 1](./review.md) (superseded in place; earlier version retained in Git history).
**Final walkthrough:** [walkthrough.md](./walkthrough.md).

## Scope and method

Reviewed the complete unit end to end against the story file (`SP-126-course-experience.md`), the SP-126 README (decisions D126-1…D126-17, traceability, DoD table, security invariants), the shared DoD in `docs/epics/README.md`, the prior review findings RV-126-001…004, and the actual changed source:

- `apps/web/src/pages/courses/ui/CoursesPage.tsx`
- `apps/web/src/features/courses/ui/CourseList.tsx`
- `apps/web/src/features/courses/ui/CourseCard.tsx`
- `apps/web/src/features/courses/ui/CourseActionsMenu.tsx`
- `apps/web/src/pages/courses/ui/CoursesPage.test.tsx`, `apps/web/src/features/courses/ui/CourseList.test.tsx`, `CourseCard.test.tsx`, `CourseActionsMenu.test.tsx`
- `apps/web/e2e/semesters-courses.spec.ts` (pin check)

No code, tests, migrations, tickets, or plans were modified in this review. No secrets were read. Automated gates were not executed by the reviewer (see [Verification provenance](#verification-provenance)); implementer-recorded results are reused.

## Acceptance-criterion results

| AC | Disposition | Evidence |
|---|---|---|
| 1. Page header | **Satisfied** | `CoursesPage.tsx:93-110` — `max-w-5xl … py-12` shell, `h1` "My Courses", subtitle "Manage your courses, semesters, and class meetings.", "Add Course" button upper-right. |
| 2. Search and filtering | **Satisfied + tested** | `CoursesPage.tsx:112-152`, `CourseList.tsx:91-104`; new tests in `CoursesPage.test.tsx` (name/code, semester select, composition with show-archived, no-results, `Clear filters` restore, single-fetch invariant) and `CourseList.test.tsx` (name/code, semester, composition, no-results + `Clear filters`). |
| 3. Course cards | **Satisfied + tested** | `CourseCard.tsx` — responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (`CourseList.tsx:189`); name as `h3`/`Link`, code, 10px color dot, semester or "No semester", instructor, credits; stretched link navigates to `/courses/:id`; three-dot menu Edit/Archive/Restore with per-course accessible names; text "Archived" pill. `CourseCard.test.tsx` (8 tests) covers content, click targets, Archived pill, heights, accessible names. |
| 4. Visual hierarchy and consistency | **Satisfied** | Name dominates (`text-base font-semibold`); color dot decorative; subtle border/shadow/hover; equal row heights (`items-stretch`, `h-full`); base focus ring. Settled tokens now aligned (RV-126-004 applied): empty-state icons `text-secondary-300`, archived pill `bg-secondary-100`/`text-secondary-600`. |
| 5. States | **Satisfied + tested** | `CourseList.tsx:51-159` — loading spinner + "Loading your courses…"; empty "No courses yet." + "Add your first course"; no-match "No courses match these filters." + "Clear filters"; "No active courses" hint; error + "Try again". Covered by `CourseList.test.tsx` and `CoursesPage.test.tsx`. |
| 6. Accessibility | **Satisfied + tested** | `CourseActionsMenu.tsx` mirrors `RowActionsMenu` (open focuses first item, Escape closes + restores trigger, arrow keys cycle, action re-focuses trigger); icon-only buttons carry `aria-label`s; visible focus rings; text "Archived" (not color-only). `CourseActionsMenu.test.tsx` (8 tests) covers the keyboard model. |
| 7. Behavior preservation | **Satisfied** | Create/edit via `CourseForm`, archive/restore via `ArchiveCourseDialog` with live-region sentences, show-archived, re-read after mutation, name→detail navigation all intact (`CoursesPage.tsx:175-199`, `CourseList.tsx`). E2E spec selectors still match (li, accessible names, live-region sentences, empty-state CTA, dialog headings); 7/7 passed. |

## Shared Definition of Done

| # | Result | Evidence / limitation |
|---|---|---|
| 1. Functional ACs | **PASS** | AC table above; no new capability added. |
| 2. Validation | **PASS — n/a** | No new input (search is a free-text filter; form unchanged). |
| 3. Authenticated student scoping | **PASS** | No new read or write; the single principal-scoped `listCourses({ includeArchived: true })` remains the only list read (`CoursesPage.tsx:32`); filters run client-side over the already-fetched own list. Counterexample test (fetches once with `includeArchived`) in `CoursesPage.test.tsx`. |
| 4. Actionable API errors | **PASS** | Existing list error state + retry and dialog toasts unchanged. |
| 5. Loading / empty / error states | **PASS** | `CourseList.tsx:51-159`; covered by tests. |
| 6. Keyboard accessibility | **PASS** | Menu model + focus restoration; `CourseActionsMenu.test.tsx` (8 tests). |
| 7. Responsive layouts | **PASS (inspection, class-level)** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; mobile 44px floors on inputs (`max-sm:min-h-[44px]`). No browser viewport measurement recorded (retained limitation; see walkthrough). |
| 8. Automated business-rule tests | **PASS** | New `CourseCard.test.tsx` (8), `CourseActionsMenu.test.tsx` (8), expanded `CoursesPage.test.tsx` (+8) and `CourseList.test.tsx` (+11); focused suite recorded 11 files / 162 tests passing (implementer evidence, see provenance). |
| 9. API/migration documentation | **PASS — n/a** | No API or migration change (D126-1). |
| 10. Integrated environment review | **PASS — verified** | E2E run recorded in `implementation.md`: `pnpm test:e2e -- e2e/semesters-courses.spec.ts`, exit 0, 7/7 passed (self-contained stack, 2026-10-30). No selector/pin updates required (D126-7). |
| 11. Final reviewer walkthrough | **PASS** | [walkthrough.md](./walkthrough.md) saved and verified beside this report. |

## Prior findings — dispositions

| ID | Severity | Status | Closure evidence |
|---|---|---|---|
| RV-126-001 | should-fix | **Closed** | `CourseCard.test.tsx` (8), `CourseActionsMenu.test.tsx` (8), `CoursesPage.test.tsx` (+8), `CourseList.test.tsx` (+11) added; search/filter/no-results/semester-filter and card content assertions present; single-fetch invariant extended. See implementation.md "Changed paths" and "Findings / deviations". |
| RV-126-002 | should-fix | **Closed** | `artifacts/SP-126/implementation.md` created with review scope, combined Git scope (base `914a5d2`, correction `97803b4`), AC/DoD ownership, commands/results, deviations. |
| RV-126-003 | should-fix (gate) | **Closed** | E2E run recorded in implementation.md: exit 0, 7/7 passed, self-contained stack, no pin updates needed (D126-7). |
| RV-126-004 | polish | **Applied** | `CourseCard.tsx:29` archived pill `bg-secondary-100`/`text-secondary-600`; `CourseList.tsx:110,125` empty/no-match icons `text-secondary-300`. Tokens now match D126-14/D126-15. |

## New findings

None. No new blocker or should-fix finding. No new polish finding beyond the already-closed RV-126-004. The card hover border follows the Assignments reference implementation (`hover:border-border`), consistent with the design target; the ui-refiner wording in D126-16 is slightly aspirational relative to that reference and is not a mandatory obligation (AC 4 does not pin exact tokens).

## Security and scoping check

No new read or write was added (D126-1/D126-3). The single principal-scoped `listCourses({ includeArchived: true })` remains the only list read; filters run client-side over the already-fetched own list. Mutations still route through `CourseForm`/`ArchiveCourseDialog` on the existing `courseApi` functions. No secret files were read. The "fetches once with `includeArchived`" counterexample test is present in `CoursesPage.test.tsx`.

## Verification provenance

This reviewing session had no direct shell, so no automated gate was executed by the reviewer. Implementer-recorded verification is reused from `implementation.md` (all commands from the repo root on the final tree, 2026-10-30):

- Focused web tests: `pnpm --filter web test -- src/pages/courses src/features/courses` — exit 0, **11 files, 162 tests passed**.
- Typecheck: `pnpm --filter web typecheck` (`tsc --noEmit`) — exit 0.
- Lint: `pnpm --filter web lint` (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) — exit 0.
- E2E: `pnpm test:e2e -- e2e/semesters-courses.spec.ts` (self-contained stack) — exit 0, **7 tests passed** (15.4s); throwaway database created, migrated, dropped; dev stack untouched.

Code inspection was performed by the reviewer for all changed files listed in Scope. The implementer's recorded outputs are treated as the execution evidence; the reviewer did not independently re-execute (no shell available). This is disclosed as a limitation, not a fail: the tests exist, assert the required behavior, and were recorded green by the implementer on the same final tree the reviewer inspected.

## Passing-review docs sync

Performed in this pass (reviewer-owned, passing verdict):

- Correction log (breakdown README): entries appended for RV-126-001…004 with original claim, consequence, disposition/closure evidence, and reference to this report (see `docs/stories/EP02/SP-126/README.md` § "Plan correction log").
- Execution queue: row state `Implemented — awaiting parent review` → `Reviewed`; `Active substory`/`Next substory` set to `None` with reason (final parent review passed; unit complete); links to this report and `walkthrough.md` recorded.
- Parent status line: README status line refreshed from "Refined … Ready" to reflect implementation complete and reviewed.
- Decision provenance: none new; D126-1…D126-17 unchanged.

## Dispositions and handoff

- **Verdict decided before sync:** Pass. No open blocker or should-fix finding; RV-126-004 polish applied.
- **Reviewer writes (this pass):** this report at `docs/stories/EP02/SP-126/artifacts/SP-126/review.md`; `walkthrough.md` at the same directory; passing docs sync edits to `docs/stories/EP02/SP-126/README.md`.
- **Commit:** reviewer has no shell in this session; the scoped commit of `review.md`, `walkthrough.md`, and the queue/status/correction-log updates is deferred to the coordinator (see closeout). Files are saved and verified.
- **Remaining work:** none for SP-126 code. Optional user repeat of the manual workflows in `walkthrough.md` (not required for sign-off; required manual gate DoD 10 already has recorded e2e evidence).

**Final verdict: SP-126 meets the shared DoD and acceptance criteria.** All prior findings (RV-126-001…004) closed with evidence; DoD 8 and DoD 10 now have recorded execution evidence; DoD 11 walkthrough saved. One retained limitation: DoD 7 responsive verification is class-level (no browser viewport measurement recorded) — not a blocker. Re-review not required.