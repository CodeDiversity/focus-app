# SP-111B implementation record — Course Management UI

**Story:** `docs/stories/EP02/SP-111/SP-111B-course-management-ui.md`
**Parent:** SP-111 (`docs/stories/EP02/SP-111/README.md` — shared API contract, decisions D111-1…5)
**Layer:** Frontend (React + Vite, FSD)
**Baseline:** `11f501e` (SP-111A: course management API) — clean tree
**Status:** Implementation complete — awaiting the combined SP-111 parent review
**Date:** 2026-10-21

## Outcome

The student can manage courses in the browser at `/courses` (D111-5):

- **List** (`CourseList`): one row per course — color chip (decorative),
  `code` (monospace), `name`, semester name (or a muted "No semester" for
  unaffiliated rows, D110-2), credits (when present). Active courses by
  default; the **"Show archived"** control is a real `role="switch"` button
  (accessible name includes the archived count) that includes `isActive = false`
  rows, each carrying a text **Archived** badge (not color-only, DoD 6).
  Loading spinner, an empty state with a create call-to-action, and an error
  state with an actionable message + retry (DoD 5).
- **Create / edit** (`CourseForm`, dialog per D111B-2): RHF + Zod mirroring the
  backend field rules (code/name non-empty after trim with the same max lengths,
  `0 < credits ≤ 30`, `#rrggbb` color, instructor ≤ 100, description ≤ 2000);
  backend 400 field errors render per-field; 409 (duplicate code) and 404
  (semester) render as actionable form-level messages. Edit pre-fills all fields
  including `instructor` and `semester` (D111-1). The form mirrors the backend
  null-no-op semantics honestly (D111B-3, from F111B-1): a blank optional field
  sends `null` (keeps the stored value — "leave blank to keep…" hint in edit
  mode), a whitespace-only instructor is a client error, and the "No semester"
  option is disabled when the course is attached (the backend cannot detach).
- **Archive / restore** (`ArchiveCourseDialog`): per-row actions open a
  confirmation dialog that states the operation is reversible; confirm issues
  `PATCH { isActive }` (D111-2), cancel issues nothing; the same dialog serves
  restore with different wording.
- **Page** (`CoursesPage`): page-local state (the `SemestersPage` precedent —
  no RTK; the entity API is the data home). The list is the single source of
  truth and is re-read after every successful mutation; successes announce
  through an always-present `role="status"` live region (DoD 6). **D111B-1:**
  the initial fetch is `GET /courses?includeArchived=true` once and the switch
  filters client-side, so the toggle is instant. The semester picker's options
  come from a non-fatal principal-scoped `listSemesters` side fetch.
- **Entity API** (`courseApi.ts`): `CourseWithSemester` (13 keys, D111-4) +
  `listCourses({ semesterId?, includeArchived? })` / `getCourse(id)` /
  `updateCourse(id, patch)`; `CreateCourseRequest` gains the five optional
  fields; `createCourse` returns `CourseWithSemester`. The shared `Course` type
  gains `instructor: string | null`.
- **Route + nav:** `/courses` inside `ProtectedRoute` in `App.tsx` (mirrors the
  semesters route); a "Courses" link after Semesters in the header with the
  same active-state styling.

## Changed paths (commit scope)

| Path | Change |
|---|---|
| `apps/web/src/shared/types/academic.ts` | `Course` gains `instructor: string \| null` |
| `apps/web/src/entities/course/api/courseApi.ts` | **rewritten** — `CourseWithSemester`, extended `CreateCourseRequest` (all five optional fields; nulls omitted from the body), `createCourse` → `CourseWithSemester`, `listCourses`/`getCourse`/`updateCourse` added |
| `apps/web/src/entities/course/api/courseApi.test.ts` | rewritten — 21 tests (was 5): create body serialization (incl. null omission), 409/404/400; list query serialization + 404; get; update PATCH + 400/409/404 |
| `apps/web/src/features/courses/ui/CourseList.tsx` | **new** — rows, switch, badges, loading/empty/error, per-row actions |
| `apps/web/src/features/courses/ui/CourseList.test.tsx` | **new** — 10 tests |
| `apps/web/src/features/courses/ui/CourseForm.tsx` | **new** — dialog + focus trap + RHF/Zod + null-no-op semantics |
| `apps/web/src/features/courses/ui/CourseForm.test.tsx` | **new** — 34 tests (validation matrix, 400/409/404, prefill, focus trap, keyboard-only completion) |
| `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx` | **new** — archive/restore confirmation |
| `apps/web/src/features/courses/ui/ArchiveCourseDialog.test.tsx` | **new** — 9 tests |
| `apps/web/src/pages/courses/ui/CoursesPage.tsx` | **new** — page composition + live region + flows |
| `apps/web/src/pages/courses/ui/CoursesPage.test.tsx` | **new** — 14 tests |
| `apps/web/src/app/App.tsx` | `/courses` route inside `ProtectedRoute` |
| `apps/web/src/widgets/header/ui/Header.tsx` | "Courses" nav link (after Semesters) |
| `apps/web/src/widgets/header/ui/Header.test.tsx` | + Courses link coverage (present / hidden unauthenticated / active highlight) |
| `apps/web/src/features/onboarding/ui/Step3Course.test.tsx` | fixture extended to the 13-key `CourseWithSemester` shape (F111B-3; `Step3Course` ignores the result — no behavior change) |
| `docs/stories/EP02/SP-111/artifacts/SP-111B/` | **new** — `checkpoint.md` + this record |
| `docs/stories/EP02/SP-111/README.md` | execution queue: row B → Implemented — awaiting parent review; Next → C |
| `docs/stories/EP02/SP-111/SP-111B-course-management-ui.md` | status line → Implemented — awaiting parent review |

## AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — `/courses` inside `ProtectedRoute`; header "Courses" link after Semesters with active-state styling | Pass | `App.tsx` route (inside the `ProtectedRoute` block, next to `/semesters`); `Header.tsx` link; `Header.test.tsx` (shown authenticated, hidden unauthenticated, active highlight only on `/courses`) |
| 2 — List: chip/code/name/semester/credits, "No semester" fallback, show-archived toggle with Archived badge, loading/empty/error + retry | Pass | `CourseList.test.tsx` (10): row content incl. chip color + monospace code, "No semester" + omitted credits, archived hidden by default → badge + 3 rows after toggle, switch hidden when no courses, "No active courses" hint state, loading, empty + CTA, error + retry; `CoursesPage.test.tsx` (14): fetch once with `includeArchived: true` (D111B-1), API order, client-side toggle (no extra fetch), empty CTA opens the dialog, error + retry re-reads |
| 3 — Create form (dialog): all seven fields, client rules mirror backend, 400 per-field, 409/404 form-level, success refresh | Pass | `CourseForm.test.tsx` (34): validation matrix (empty/over-long code & name, credits bounds, color format, whitespace-only instructor, description length), 400 field errors render per-field, 409/404 form-level, blank-optionals send `null` (D111B-3), dialog heading/focus; `CoursesPage.test.tsx` create: success → list re-read + status announcement |
| 4 — Edit: same form pre-filled (incl. instructor + semester); `PATCH` partial merge; row refresh | Pass | `CourseForm.test.tsx` edit prefill (all fields incl. instructor; "No semester" disabled when attached); `CoursesPage.test.tsx` edit: `PATCH` with the changed field, re-read, updated row + announcement |
| 5 — Archive/restore: row actions + confirmation (reversible wording), `PATCH { isActive }`, row updated | Pass | `ArchiveCourseDialog.test.tsx` (9): archive/restore wording incl. reversibility, confirm → `PATCH { isActive }`, cancel → nothing, focus trap + Escape return; `CoursesPage.test.tsx`: archive → row hidden (switch off) + announcement, restore → row active again, cancel → no request |
| 6 — Keyboard: rows/toggle/fields/both dialogs operable; dialogs trap + return focus; real switch; text badges; responsive | Pass | `role="switch"` with accessible name; text (not color-only) Archived badge; `CourseForm` keyboard-only completion + focus trap/return; `ArchiveCourseDialog` Enter/Escape + focus return (`CoursesPage.test.tsx`); responsive container test (no fixed widths) |
| 7 — Detail page + row links excluded (SP-112) | Pass (by design) | rows are not links — no `Link`/`href` in `CourseList`; nothing in this child navigates to a course detail |

DoD 1–2, 4–8 covered as mapped in the parent README (5: page + form states;
6: keyboard incl. both dialogs; 7: responsive; 8: 91 new/rewritten component
tests). DoD 3/9 N/A for B (consumes A's principal-scoped routes; no API change
in this child). DoD 10 via SP-111C sign-off + the combined parent review.

## Verification

Run from `apps/web` (2026-10-21):

| Command | Result |
|---|---|
| `pnpm test` (vitest run) | **35 files / 423 tests, all pass** (new: `courseApi` 21, `CourseList` 10, `CourseForm` 34, `ArchiveCourseDialog` 9, `CoursesPage` 14, `Header` 4; updated `Step3Course` suite green) |
| `pnpm typecheck` (`tsc --noEmit`) | clean |
| `pnpm lint` (eslint `--max-warnings 0`) | clean |
| `pnpm build` (tsc + vite) | clean |

## Findings and deviations

- **F111B-1** (fixed by design): backend `PATCH /courses/:id` treats an explicit
  `null` as omitted (`has()` in `courses.service.ts`) — `instructor`/`credits`/
  `semesterId` cannot be **cleared** through the API, while `description` can
  (empty string is not null). `CourseForm` implements D111B-3 so it never lies
  about a no-op (blank → `null` → keeps the stored value, with an explicit
  "leave blank to keep…" hint).
- **F111B-2** (fixed; minor ticket deviation): the ticket's technical note says
  "extend `createCourse`'s request with optional `instructor`", but AC 3's
  create-form field list requires all five optional fields on
  `CreateCourseRequest`. The request type gains all of them; the backend DTO
  already accepted them (SP-107B/SP-111A), so the API surface is unchanged.
- **F111B-3** (fixed): `createCourse`'s return type moves from the 8-key
  `Course` to `CourseWithSemester` (D111-4). Two pre-existing test fixtures
  pinned the old shape — `courseApi.test.ts` and `Step3Course.test.tsx` — both
  updated. `Step3Course` ignores the result, so no behavior change.
- **F111B-4** (fixed, verification pass): two latent bugs in the new
  `CourseList.test.tsx` surfaced on first run — the "No active courses" case
  used `getAllByRole('listitem')` (throws on zero matches; now
  `queryAllByRole`), and the error-retry case never passed its `onRetry` spy
  into the render helper. Test-only fixes; no component change.
- **F111B-5** (fixed, verification pass): the `CoursesPage` archive test
  expected 2 visible rows after archiving, but with the switch off by default
  only the one remaining active row is visible — expectation corrected to
  1 row + no `Archived` badge (component behavior was already correct per
  D111B-1).
- **F111B-6** (fixed, verification pass): unused imports flagged by
  typecheck/lint — `toast` in `CoursesPage.tsx` (the page announces via the
  live region; toasts live in the dialog components), `mockedToast`/
  `activeCourses` in `CoursesPage.test.tsx`; plus 23 prettier formatting fixes
  across the new files (eslint `--fix`).

## Commit scope

One commit on `main` from baseline `11f501e` covering the paths in the table
above (code + tests + delivery records). The commit hash is reported in the
task handoff (a commit cannot record its own hash).
