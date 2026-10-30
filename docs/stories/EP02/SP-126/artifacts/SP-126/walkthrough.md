# SP-126 — Course Page Experience: user walkthrough

**Story:** [SP-126](../../SP-126-course-experience.md) · **Parent README:** [../../README.md](../../README.md)
**Final review:** [review.md (pass 2)](./review.md)
**Implementation record:** [implementation.md](./implementation.md)
**Reviewed state:** code commit `97803b4` over baseline `914a5d2`; docs commit `baa859d`.

## 1. What changed

SP-126 is a presentation pass over the `/courses` list page (D126-1: no new API, route, or schema). The page now matches the redesigned Assignments page shell and turns course rows into cards.

Scope (single frontend story, no substories):

- **Page shell** (`apps/web/src/pages/courses/ui/CoursesPage.tsx`): wider `max-w-5xl` layout, "My Courses" heading with subtitle, "Add Course" button upper-right, a toolbar with magnifier search + clear `X`, a semester `Select`, and an always-present `role="status"` live region.
- **Cards** (`apps/web/src/features/courses/ui/CourseCard.tsx`): responsive grid (1 / 2 / 2–3 columns), name as `h3` link, code, 10px color dot, semester or "No semester", instructor, credits, text "Archived" pill, three-dot actions menu.
- **Actions menu** (`apps/web/src/features/courses/ui/CourseActionsMenu.tsx`): extracted component mirroring the Assignments `RowActionsMenu` keyboard/focus model (open focuses first item, Escape closes + restores trigger, arrow keys cycle, action re-focuses trigger before callback).
- **States** (`CourseList.tsx`): loading, empty ("No courses yet." + CTA), no-match ("No courses match these filters." + "Clear filters"), "No active courses" hint, error + "Try again".
- **Behavior preserved**: create/edit via `CourseForm`, archive/restore via `ArchiveCourseDialog` with live-region sentences, show-archived switch, re-read after mutation, name→detail navigation (D126-6).
- **Tests**: `CourseCard.test.tsx` (8), `CourseActionsMenu.test.tsx` (8), expanded `CoursesPage.test.tsx` (+8) and `CourseList.test.tsx` (+11). E2E `semesters-courses.spec.ts` unchanged and passing (D126-7).

No backend, API, or database change.

## 2. How the code works

**Request/data flow.** `CoursesPage` fetches the student's courses once with `listCourses({ includeArchived: true })` (principal-scoped, D111B-1) and semesters with `listSemesters()`. All filtering (search by name/code, semester select, show-archived) runs client-side over the already-fetched own list — no new endpoints and no per-card fetches (D126-1/D126-3). `CourseList` receives the raw list plus the current filter values and renders the appropriate state.

**Card interaction.** `CourseCard` is an `article` with an `onClick` that navigates to `/courses/:id`; the name is a stretched `Link` (`after:absolute after:inset-0`) so the whole card is clickable, while the menu container calls `stopPropagation`. The three-dot trigger (`CourseActionsMenu`) opens a `role="menu"` with Edit + Archive/Restore (no hard delete — D126-2). `runAction` re-focuses the trigger before firing the callback so focus is not lost when the menu unmounts.

**Keyboard model.** Opening focuses the first menu item (`useLayoutEffect`). Escape (document-level listener) closes and restores focus to the trigger. ArrowDown/ArrowRight and ArrowUp/ArrowLeft cycle items. Pointer-down outside closes.

**Ownership/error behavior.** Mutations still go through the existing `CourseForm` and `ArchiveCourseDialog` on the existing `courseApi` functions; success re-reads the list and announces via the `role="status"` region ("… created.", "… archived. You can restore it at any time.", "… restored."). List errors show "Try again".

**Scoping invariant.** The only list read is the single principal-scoped `listCourses({ includeArchived: true })`; filters never trigger a refetch (verified by the "keeps a single fetch" tests).

## 3. Why it is correct

- **ACs 1–7** are each satisfied and, for 2/3/5/6, covered by automated tests (see review.md AC table). AC 4 tokens now match the settled spec (RV-126-004 applied).
- **DoD 1–11**: all PASS. DoD 8 has new tests (8+8+8+11) recorded green; DoD 10 has recorded e2e evidence (7/7); DoD 11 is this document.
- **Prior findings closed**: RV-126-001 (tests) — closed; RV-126-002 (implementation index) — closed; RV-126-003 (integrated evidence) — closed; RV-126-004 (token polish) — applied. See review.md "Prior findings — dispositions".
- **Security**: no new read/write; single principal-scoped fetch; counterexample test present. No existence oracle introduced.
- **Evidence**: implementer-recorded `pnpm --filter web test -- src/pages/courses src/features/courses` → exit 0, 11 files / 162 tests; typecheck exit 0; lint exit 0; e2e exit 0, 7/7. Reviewer inspected all changed files. Reviewer did not independently execute (no shell); limitation disclosed, not a fail.

## 4. Manual test workflows

Use a local dev stack (API + web) with a disposable test user. Never use production data or shared accounts. Required permission: a normal signed-in student account (no admin).

### Workflow A — View the courses list and states

Prerequisites: signed-in student with no courses.

1. Navigate to `/courses`.
2. Expected: "My Courses" heading, subtitle, "Add Course" button upper-right, search input, "All semesters" select, empty state with `BookOpen` icon, "No courses yet.", "Add your first course to start organizing your semester.", and "Add your first course" button.
3. Edge: with courses present, the grid renders 1 column on mobile, 2 on `sm`, 2–3 on `lg`; cards equal height.

### Workflow B — Search and filter

Prerequisites: signed-in student with at least 2 courses in different semesters (one archived).

1. Type a course name fragment in the search box.
2. Expected: list narrows instantly; no network request; "Clear search" (X) appears.
3. Select a semester in the select.
4. Expected: composition — only courses matching both search and semester remain.
5. Toggle "Show archived".
6. Expected: archived courses appear with text "Archived" pill.
7. Type a non-matching query (e.g. "zzzz").
8. Expected: "No courses match these filters." + "Try adjusting your search or semester filter." + "Clear filters" button; clicking it restores the full list.

### Workflow C — Card navigation

1. Click the course code (non-interactive card area).
2. Expected: navigate to `/courses/:id`.
3. Click the course name link.
4. Expected: navigate to `/courses/:id`.
5. Click the three-dot menu trigger.
6. Expected: menu opens; no navigation occurs.

### Workflow D — Actions menu keyboard model

1. Focus the three-dot trigger; press Enter/Space to open.
2. Expected: menu opens and focus moves to the first item (Edit).
3. Press ArrowDown.
4. Expected: focus moves to Archive (or Restore for archived courses).
5. Press Escape.
6. Expected: menu closes, focus returns to the trigger.
7. Open menu, click Edit.
8. Expected: `CourseForm` modal opens prefilled; trigger regains focus before the modal.

### Workflow E — Archive and restore

1. Open a course's menu → Archive.
2. Expected: confirmation dialog "Archive {name}?" with reversible note; confirm → "… archived. You can restore it at any time." live region; card disappears from active list.
3. Toggle "Show archived".
4. Expected: card reappears with "Archived" pill.
5. Open menu → Restore → confirm.
6. Expected: "… restored." live region; card back in active list without pill.

### Workflow F — Create and edit (preserved behavior)

1. Click "Add Course", fill the form, submit.
2. Expected: "… created." live region; new card appears.
3. Open a card's menu → Edit, change a field, save.
4. Expected: "… updated." live region; card reflects changes.

### Workflow G — Responsive layout

1. Resize viewport to mobile (<640px), tablet (640–1024px), desktop (>1024px).
2. Expected: grid 1 / 2 / 2–3 columns; inputs at least 44px tall on mobile; no horizontal scroll.

## 5. Execution status

| Workflow | Status |
|---|---|
| A. View list and states | Not executed — user test instructions (empty/loading/error states covered by `CourseList.test.tsx` / `CoursesPage.test.tsx` automated tests). |
| B. Search and filter | Not executed — user test instructions (covered by automated tests in `CoursesPage.test.tsx` and `CourseList.test.tsx`). |
| C. Card navigation | Not executed — user test instructions (covered by `CourseCard.test.tsx`). |
| D. Actions menu keyboard | Not executed — user test instructions (covered by `CourseActionsMenu.test.tsx`). |
| E. Archive and restore | **Executed** — 2026-10-30, self-contained Playwright stack (API :4100, Vite :3100, throwaway `studypilot_e2e_test` DB), `pnpm test:e2e -- e2e/semesters-courses.spec.ts`, exit 0, 7/7 passed (includes create/edit/archive/restore course journeys). |
| F. Create and edit | **Executed** — same run as Workflow E (create/edit course tests pass). |
| G. Responsive layout | Not executed — user test instructions (class-level inspection only; no browser viewport measurement recorded). |

Required manual gate DoD 10 has recorded e2e evidence (Workflow E/F). Workflows A/B/C/D/G are optional user repeats; their behavior is covered by automated tests. No AC/DoD-required manual gate remains unexecuted.