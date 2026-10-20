# SP-110B checkpoint
Updated: 2026-10-20 (complete)
Execution state: parent queue row B — `Implemented — awaiting parent review` (`docs/stories/EP02/SP-110/README.md` execution queue; Active → None, Next → SP-110C)
Story: `docs/stories/EP02/SP-110/SP-110B-semester-management-ui.md`
Review unit: SP-110 — combined parent review after A+B+C (`./artifacts/SP-110/review.md`)
Role / scope: implementer; frontend only — `/semesters` page (FSD). Excluded: backend (A, done), course UI, onboarding wizard, calendar/dashboard.

## Repository state
- Workspace / branch: `/Users/michael/Documents/GitHub/focus-app`, branch `main`
- HEAD at start: `85d665e` (baseline before the first included change; SP-110A closeout)
- Other work to preserve: none — workspace clean at start
- Closeout: all changes committed scoped (see `implementation.md`)

## Progress
- [x] `entities/semester/api/semesterApi.ts` (change): `SemesterWithCount`, `UpdateSemesterRequest`, `listSemesters`/`getSemester`/`updateSemester`/`deleteSemester`
- [x] `entities/semester/api/semesterApi.test.ts` (extend): the four new functions hit the contract paths/shapes (13 tests)
- [x] `features/semesters/ui/SemesterList.tsx` (+ test, 5): rows, active badge, course count, action buttons, API order
- [x] `features/semesters/ui/SemesterForm.tsx` (+ test, 17): create + edit modes, client validation, field-level 400/409, duplicate-submission prevention
- [x] `features/semesters/ui/DeleteSemesterDialog.tsx` (+ test, 8): D110-2 warning copy, focus trap, Escape, cancel/confirm
- [x] `pages/semesters/ui/SemestersPage.tsx` (+ test, 15): loading/empty/error + retry, activation, aria-live, states
- [x] `widgets/header/ui/Header.tsx` (+ test, 3): Semesters link (authenticated, active highlight)
- [x] `app/App.tsx` (change): `/semesters` route inside `ProtectedRoute`
- [x] Verification: `pnpm --filter @studypilot/web test` (340/340) / `tsc --noEmit` / `lint` / `build` — all green
- Current step: complete — implementation record in `./implementation.md`

## Decisions and dependencies
- D110-1 single-active (activation via `PATCH { isActive }`), D110-2 delete-orphan (dialog warning copy), D110-3 `courseCount` display, D110-4 FSD placement, D110-5 PATCH partial merge, D110-6 no archiving — per the parent README decision register.
- A implemented (commit `85d665e`); the shared API contract in the parent README is the source of truth for the entity API.
- State: page-local component state (profile-page precedent); no new RTK slice; the entity API is the data home.
- List is re-fetched after every successful mutation (create/edit/activate/delete) — the API is the single source of truth for order (startDate desc) and `courseCount`; badges always re-derive from the API response (AC 4).

## Findings (dispositions at closeout)
- F110B-1 (design, implemented as decided): `POST /semesters` returns the 7-key `Semester` (no `courseCount` — SP-107B contract, unchanged). The create flow therefore cannot append the response to the `SemesterWithCount[]` list directly; the page re-fetches the list after a successful create instead (keeps the 8-key shape + API order uniform across all mutations). No backend change — A's contract is untouched.
- F110B-2 (design, implemented as decided): readable date display must not round-trip `yyyy-MM-dd` through an instant (D107-7). The list formats via a small helper that builds a **local** date from the components (`new Date(y, m-1, d)`) and renders `Intl.DateTimeFormat` `dateStyle: 'medium'` in the browser zone — the calendar date never shifts across time zones.
- F110B-3 (process, resolved): `Header.tsx` had no existing test file — the story's test matrix ("Header — the Semesters link") required creating `Header.test.tsx` (mocking `useAuth`), not extending one. Done (3 tests).
- F110B-4 (fixed, tooling): `jsx-a11y` forbids both a static `div` and a `role="dialog"` element carrying a JSX `onKeyDown` (no-static-element-interactions / no-noninteractive-element-interactions). The dialog's Escape/Tab trap is therefore attached **imperatively** (`addEventListener` on the dialog element in an effect, re-registered each render so the `isDeleting` freeze stays current); focus is trapped inside the dialog, so the listener sees every key press. Behavior unchanged — dialog tests (8) green after the move.
- F110B-5 (fixed, test-authoring): `screen.findByRole('listitem')` fails when the mock list has 2 rows ("Found multiple elements") — the page tests use `findAllByRole('listitem')` with a length assertion instead. (Root cause of the 10 initial page-test failures; not a `mockResolvedValueOnce` queue leak — `vi.clearAllMocks()` in `beforeEach` plus a single `mockResolvedValue` per test is sufficient.)

## AC outcomes (summary — full table in `./implementation.md`)
- AC 1 (list render, dates, badge, count, API order) — Pass
- AC 2 (create form, client validation, POST, field-level 400/409, success → re-read list) — Pass
- AC 3 (edit → PATCH; delete dialog D110-2 copy, cancel no-request, confirm → DELETE) — Pass
- AC 4 (activation via `PATCH { isActive }`; badges re-derive from API; single-active visible) — Pass
- AC 5 (loading/empty/error+retry, per-action pending, keyboard/focus trap/Escape, aria-live, responsive) — Pass
- AC 6 (header Semesters link, authenticated, active highlight) — Pass

## Verification
| Command (cwd: `apps/web`) | Result |
|---|---|
| `pnpm exec vitest run src/pages/semesters/ui/SemestersPage.test.tsx` | 15/15 pass |
| `pnpm --filter @studypilot/web test` (repo root) | 31 files, **340/340 pass** |
| `pnpm exec tsc --noEmit` | clean |
| `pnpm exec eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` | clean |
| `pnpm --filter @studypilot/web build` (repo root) | success (vite build) |

## Resume next
None for this child. Next: SP-110C (integration + DoD 10 sign-off + parent index); the combined SP-110 parent review follows after C.
