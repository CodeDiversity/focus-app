# EP10E: Academic Data Pages Adoption

**Story ID:** EP10E
**Title:** Frontend — adopt the refreshed design system on academic data pages (semesters, courses, course detail, assignments)
**Parent epic:** [EP10: UI Design System & Visual Refresh](../../epics/EP10-ui-design-system-and-visual-refresh.md)
**Parent:** [EP10 breakdown](./README.md)
**Milestone:** M5
**Layer:** Frontend
**Status:** Queued
**Dependencies:** EP10C (settled design system); the pages it restyles must exist.
**Jira key:** Pending creation
**Refined:** 2026-10-29 (planning)

## Summary

Restyle the academic data surfaces — semesters, courses, course detail, assignments — to the refreshed design system, preserving filtering, sorting, dialogs, and all CRUD flows.

## Description & bounded scope

### In scope

1. **Pages:** `apps/web/src/pages/{semesters,courses}` and `apps/web/src/pages/courses/ui/CourseDetailPage.tsx`.
2. **Features:** `apps/web/src/features/{semesters,courses,assignments}` UI (cards, rows, dialogs, menus) adopted to tokens/primitives.
3. **Adoption:** replace ad-hoc color/spacing with semantic tokens; keep data flows, filters, sort, dialogs, and actions identical.
4. **States:** loading/empty/error/no-match consistent with shared patterns.

### Out of scope

- Token/primitive/shell definitions (EP10A–EP10C).
- Calendar/availability/dashboard/profile pages (EP10F/EP10G).
- Backend/API changes (D10-2).
- Feature logic changes.

## Source requirement references

- **Epic AC-E10-04, AC-E10-05, AC-E10-06**.
- **Shared DoD** — items 1, 5, 6, 7, 8, 10/11 (parent review).
- **Decisions:** D10-1, D10-2, D10-4, D10-6, D10-8.

## Acceptance criteria

1. Semesters, courses, course detail, and assignments render with the refreshed system.
2. Filtering, sorting, search, dialogs (create/edit/archive/restore), and row actions behave exactly as before.
3. Loading/empty/error/no-match states are visually consistent with the shared patterns.
4. Keyboard operability, focus visibility, and reduced motion are preserved (including the three-dot menu keyboard model from SP-126).
5. Existing page/feature tests pass; updated tests cover changed markup.

## Tests to add / update

- `apps/web/src/pages/assignments/ui/AssignmentsPage.test.tsx`, `apps/web/src/pages/courses/ui/CoursesPage.test.tsx`, semesters/course-detail tests if present.
- `apps/web/src/features/{courses,assignments}` component tests updated for changed markup.
- Verification: `pnpm --filter web test -- src/pages src/features`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

## Technical notes

### Verified current behavior (inspected 2026-10-29)

- Pages: `semesters`, `courses` (list + detail), `assignments`.
- Design reference pattern: `AssignmentsPage.tsx` (`max-w-5xl` shell, toolbar outside results card, `role="status"` count header, distinct empty/no-match/error states) and `CoursesPage.tsx` + `CourseCard.tsx` + `CourseActionsMenu.tsx` (SP-126).
- Feature dialogs: `CourseForm`, `ArchiveCourseDialog`, assignment dialogs.

### Proposed files

- `apps/web/src/pages/semesters/ui/*`, `courses/ui/*`, `assignments/ui/*` (modify)
- `apps/web/src/features/semesters/ui/*`, `courses/ui/*`, `assignments/ui/*` (modify)

### Unverified / for implementation

- Exact markup changes depend on the settled token/primitive output of EP10A–EP10C.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Not applicable — validation rules unchanged; only presentation.
3. Not applicable — no data access changes.
4. Not applicable — no API changes.
5. Loading/empty/error states handled.
6. Keyboard accessibility + focus (incl. three-dot menu).
7. Responsive desktop + mobile.
8. Automated tests pass.
9. Not applicable — no API/migration changes.
10. Integrated review — combined EP10 parent review.
11. Reviewer walkthrough — combined EP10 parent review.

## Tracker reference

Jira key: Pending creation. No sync authorized.

## Sizing

- **Outcome:** academic data pages adopted onto the refreshed system with no functional regression.
- **Request/token estimate:** ~2–3 requests/tokens — four surfaces + feature components + dialogs + tests.
- **Model recommendation:** 2 — mechanical adoption over a settled system; moderate surface area.
- **Files:** page + feature components across semesters/courses/assignments (modify) + tests.
- **Start context:** this story file; EP10A–EP10C output; the page/feature directories; SP-126 menu pattern.
- **Verification:** `pnpm --filter web test -- src/pages src/features`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.
- **Dependencies / exclusions:** EP10C implemented. Excludes token/primitive/shell definitions and other page groups.

## UI/UX refinement

No separate `ui-refiner` pass is expected: this is mechanical adoption of the settled system from EP10A–EP10C. If a story proposes layout changes beyond token application (e.g. reworking the assignments toolbar or course card grid), run `ui-refiner` on EP10E before implementation.