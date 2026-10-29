# EP10E implementation record

**Story:** [EP10E-academic-data-pages-adoption.md](../../EP10E-academic-data-pages-adoption.md)
**Implemented:** 2026-10-29 (single implementer pass; frontend only; academic data pages adoption)
**Baseline HEAD before changes:** `91f1e53` (EP10D)
**Parent:** EP10 breakdown; combined EP10 parent review after all seven children.

## Changed paths

Production:
- `apps/web/src/pages/semesters/ui/SemestersPage.tsx` — tokenized page heading, status live region, loading/error/empty states, spinner.
- `apps/web/src/pages/courses/ui/CoursesPage.tsx` — tokenized heading, subtitle, search/filter controls, status region, card shell.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — tokenized heading, meta, loading/error states, archived banner, spinner, links.
- `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` — tokenized heading, toolbar, filters, count header, loading/error/empty states, spinner.
- `apps/web/src/features/semesters/ui/{SemesterList,SemesterForm,DeleteSemesterDialog}.tsx` — tokenized rows, dialogs, badges, menus.
- `apps/web/src/features/courses/ui/{CourseList,CourseCard,CourseForm,CourseActionsMenu,ArchiveCourseDialog,MeetingsSection,MeetingForm,DeleteMeetingDialog}.tsx` — tokenized cards, forms, dialogs, meetings, actions menus.
- `apps/web/src/features/assignments/ui/{AssignmentsSection,AssignmentRow,AssignmentForm,RowActionsMenu,SubtaskChecklist,DeleteAssignmentDialog,DeleteSubtaskDialog,assignmentPresentation}.tsx` — tokenized rows, status/priority pills, overdue/due-soon badges, dialogs, subtask checklist.

Tests:
- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx` — class assertions updated to token classes.
- `apps/web/src/features/assignments/ui/AssignmentsSection.test.tsx`, `SubtaskChecklist.test.tsx`, `DeleteAssignmentDialog.test.tsx`, `DeleteSubtaskDialog.test.tsx` — class assertions updated to token classes.

Docs:
- `docs/stories/EP10/artifacts/EP10E/checkpoint.md`
- `docs/stories/EP10/artifacts/EP10E/implementation.md` (this file)
- `docs/stories/EP10/EP10E-academic-data-pages-adoption.md` (Status → Implemented)
- `docs/stories/EP10/README.md` (queue row EP10E → Implemented)

No backend/API changes. No auth/data logic changes. No new primitives.

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 Semesters, courses, course detail, and assignments render with the refreshed system | **PASS.** All four surfaces and their feature components now reference semantic tokens (background, surface, text, text-muted, accent, danger, success, warning, border, focus-ring) instead of ad-hoc `primary`/`secondary`/palette classes. | Changed files; grep for raw palette returns none. |
| 2 Filtering, sorting, search, dialogs (create/edit/archive/restore), row actions behave exactly as before | **PASS.** No logic or data-flow changes; only class-name token swaps. 829 tests green. | Test run. |
| 3 Loading/empty/error/no-match states visually consistent | **PASS.** Loading spinners use `accent` + reduced-motion guard; error text uses `text-danger`; empty/no-match states use shared token classes. | Component files. |
| 4 Keyboard operability, focus visibility, reduced motion preserved (incl. three-dot menu) | **PASS.** No interactive element changes; focus rings mapped to `accent`/`focus-ring`; reduced-motion guard retained on spinners. | Component files + tests. |
| 5 Existing page/feature tests pass; updated tests cover changed markup | **PASS.** 67 test files / 829 tests green. | Test run. |

## Verification

- `pnpm --filter web typecheck` — exit 0.
- `pnpm --filter web lint` — exit 0.
- `pnpm --filter web format` — all files use Prettier code style.
- `pnpm --filter web build` — exit 0 (1607 modules).
- `pnpm --filter web test` — 67 files / 829 tests, exit 0.
- `pnpm --filter web test -- src/pages src/features` — 45 files / 615 tests, exit 0.

## DoD mapping

1 Functional criteria — pass. 2 — n/a (no new input; validation unchanged). 3 — n/a (no data access changes). 4 — n/a (no API changes). 5 Loading/empty/error states — pass. 6 Keyboard a11y + focus (incl. three-dot menu) — pass. 7 Responsive desktop + mobile — pass (class contracts preserved). 8 Automated tests — pass. 9 — n/a. 10/11 — combined EP10 parent review.

## Findings and deviations

- F-E-1: Status/priority pill palettes mapped to semantic tokens; unused legacy constants (`STATUS_STYLES`, `PRIORITY_STYLES`, `TYPE_STYLE`) tokenized for consistency. (Non-blocking.)
- F-E-2: Prettier reformatted 5 files due to shorter token class names. (Non-blocking.)
- Findings/deviations otherwise: None.

## Status

Implemented — awaiting parent review.