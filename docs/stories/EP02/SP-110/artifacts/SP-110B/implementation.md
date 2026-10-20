# SP-110B implementation record

**Story:** [SP-110B — Semester Management UI](../../SP-110B-semester-management-ui.md)
**Parent / review unit:** SP-110 (combined parent review after A+B+C; index owner SP-110C)
**Layer:** Frontend — `apps/web` (FSD: entity / feature / page / widget / app)
**Baseline:** `85d665e` (SP-110A closeout) — the commit before the first included change.
**Completed:** 2026-10-20, implementer, single sequential writer.

## Outcome

The `/semesters` page is a complete, accessible semester management surface:
a list (name, readable `startDate`–`endDate`, Active badge iff `isActive`,
course count, API order) with create, edit, activate/deactivate, and
delete-with-confirmation; loading/empty/error+retry states; per-action pending
states; keyboard operation with dialog focus trap + Escape; `aria-live` status
announcements; responsive layout. The header nav gains an authenticated
"Semesters" link with active-state highlight, and the route lives inside
`ProtectedRoute`. The entity API (`entities/semester/api/semesterApi.ts`) is
the data home and now covers the full shared contract from the
[breakdown README](../../README.md#shared-api-contract) (list/get/update/
delete + `SemesterWithCount`). No backend, schema, or RTK-store change —
page-local state per the profile-page precedent.

## Changed paths

| Path | Change |
|---|---|
| `apps/web/src/entities/semester/api/semesterApi.ts` | **Change** — adds `SemesterWithCount` (`Semester & { courseCount }`), `UpdateSemesterRequest` (all four fields optional, `yyyy-MM-dd` strings), and `listSemesters` / `getSemester` / `updateSemester` (returns the merged 7-key `Semester`) / `deleteSemester` (void) against the contract paths. `createSemester` and the base `Semester` type untouched (onboarding consumer keeps the 7-key create shape) |
| `apps/web/src/entities/semester/api/semesterApi.test.ts` | **Extend** — 13 tests: the four new functions hit the contract paths/shapes (method, URL, body, response mapping) incl. 409 `statusCode` at `response.data.statusCode` and the 8-key list item; the pre-existing create test preserved |
| `apps/web/src/features/semesters/ui/SemesterList.tsx` (+ test, 5) | **New** — one row per `SemesterWithCount` in API order: name, readable dates via `formatCalendarDate` (F110B-2), Active badge iff `isActive`, `N courses`, and row actions (Edit, Delete, Set-as-active / Deactivate). `formatCalendarDate` builds a **local** date from the `yyyy-MM-dd` components and renders `Intl.DateTimeFormat` `dateStyle: 'medium'` — no instant/time-zone round-trip (D107-7) |
| `apps/web/src/features/semesters/ui/SemesterForm.tsx` (+ test, 17) | **New** — create + edit modes over name + start/end `<input type="date">`. Client validation mirrors the backend (non-empty name ≤ 100 after trim; valid dates; end strictly after start). Create submits only name/startDate/endDate to `POST /semesters`; edit submits all three to `PATCH /semesters/:id` (D110-5 merge; the backend trims + re-validates merged values). `isActive` is never a form field — activation is the row-level action. Field-level 400/409 messages render per field; duplicate-submission prevention while in flight; Cancel closes without a request |
| `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (+ test, 8) | **New** — `role="dialog"` + `aria-modal`, names the semester, and warns per D110-2 that its courses are **not** deleted (they remain, unaffiliated). On open: focus moves to the safe action (Cancel); focus is trapped (Tab/Shift+Tab cycle); Escape cancels; on close focus returns to the trigger. Confirm → `DELETE /semesters/:id` with in-flight freeze; API error renders in a `role="alert"` and re-enables. Key handling is attached imperatively on the dialog element (F110B-4) |
| `apps/web/src/pages/semesters/ui/SemestersPage.tsx` (+ test, 15) | **New** — orchestrates the three features with page-local state: list fetch with loading / empty ("No semesters yet" + create CTA) / error + retry; create and edit via the form; activation via `PATCH { isActive }` (D110-1); delete via the dialog. After **every** successful mutation the list re-reads from the API, so order, `courseCount`, and badges always re-derive from the response (single-active visible as ≤ 1 badge). Status changes announce via an `aria-live="polite"` region |
| `apps/web/src/widgets/header/ui/Header.tsx` (+ test, 3) | **Change** — "Semesters" link in the authenticated nav (styled like Dashboard/Profile; active highlight on `/semesters`). Test created (F110B-3): authenticated shows the link, unauthenticated hides it (and the other protected links), active highlight applies only on `/semesters` |
| `apps/web/src/app/App.tsx` | **Change** — `/semesters` route inside `ProtectedRoute` (standard `Layout`), lazy-loaded like the other pages |

## AC-by-AC outcomes

| AC | Outcome | Evidence |
|---|---|---|
| 1 — list render: name, readable dates, Active badge iff `isActive`, course count, API order | Pass | `SemesterList` tests (5): both rows render in API order with formatted dates, badge only on the active row, `N courses`; page list-state test (15) |
| 2 — create form: client validation (name ≤ 100, end strictly after start), `POST /semesters`, field-level 400/409, success → new semester in list | Pass | `SemesterForm` tests (17): each validation case, 400 field mapping, 409 duplicate-name message, duplicate-submission prevention; page test: on success the list re-reads and the new semester appears (F110B-1 — the 7-key POST response is not appended) |
| 3 — Edit (pre-filled → `PATCH` same rules) + Delete (dialog naming the semester, D110-2 courses-survive warning; cancel = no request; confirm = `DELETE`) | Pass | `SemesterForm` edit-mode tests (prefill, merged PATCH body, field errors); `DeleteSemesterDialog` tests (8): warning copy, cancel sends no request, confirm → `DELETE`, row removed + courses-survive status announced on success |
| 4 — Activation (D110-1): "Set as active" `PATCH { isActive: true }` / "Deactivate" `PATCH { isActive: false }`; badges re-derive from the API; single-active visible | Pass | page activation tests: exact PATCH body per row state, list re-read after success, ≤ 1 badge in the re-derived list, error keeps the list |
| 5 — States + usability: loading/empty/error+retry, per-action pending + duplicate prevention, keyboard (focus order, dialog trap + Escape, `aria-live`), mobile (no horizontal scroll) | Pass | page tests: skeleton, empty CTA, error + retry re-fetches; form/dialog pending freezes; a11y test: Tab order through list → form, focus trap, Escape closes, `aria-live` announcements; responsive test at mobile viewport (actions reachable, dialog fits) |
| 6 — Header "Semesters" link (authenticated, active highlight on `/semesters`) | Pass | `Header.test.tsx` (3): link present + `href` when authenticated; hidden when unauthenticated (with Dashboard/Profile); active class only on `/semesters` |

## Verification

Commands from the repo root unless noted:

| Command | Result |
|---|---|
| `pnpm --filter @studypilot/web test` | **31 files, 340/340 tests pass** (incl. the 61 new/extended SP-110B tests: 13 + 5 + 17 + 8 + 15 + 3) |
| `pnpm --filter @studypilot/web exec tsc --noEmit` | clean |
| `pnpm --filter @studypilot/web lint` (`--max-warnings 0`) | clean (after `--fix` of prettier formatting in the new files) |
| `pnpm --filter @studypilot/web build` | success (vite production build) |

DoD: 1 ✓ (ACs above) · 2 ✓ (client rules mirror the backend DTO) · 3 ✓
(list page; the URL carries no semester id — edit via form, delete/activate
via the id from the student's own list) · 4 ✓ (field-level 400/409 +
actionable errors) · 5 ✓ (states) · 6 ✓ (keyboard) · 7 ✓ (responsive) ·
8 ✓ (component tests above) · 9 ✓ (no API change — the contract is owned by
A and documented in the README) · 10 → via SP-110C sign-off + the combined
parent review (not this child).

## Findings and deviations

- **F110B-1 (design, implemented as decided):** `POST /semesters` returns the
  7-key `Semester` (no `courseCount` — SP-107B contract, unchanged). The
  create flow cannot append the response to the `SemesterWithCount[]` list
  directly; the page re-fetches the list after a successful create instead,
  keeping the 8-key shape + API order uniform across all mutations. No
  backend change.
- **F110B-2 (design, implemented as decided):** readable dates must not
  round-trip `yyyy-MM-dd` through an instant (D107-7). `formatCalendarDate`
  (in `SemesterList.tsx`) builds a **local** date from the components
  (`new Date(y, m-1, d)`) and renders `Intl.DateTimeFormat`
  `dateStyle: 'medium'` in the browser zone — the calendar date never shifts
  across time zones.
- **F110B-3 (process, resolved):** `Header.tsx` had no existing test file —
  the story's test matrix required **creating** `Header.test.tsx` (mocking
  `useAuth`), not extending one. Done (3 tests).
- **F110B-4 (fixed, tooling):** `jsx-a11y` forbids a static `div`
  (`no-static-element-interactions`) and a `role="dialog"` element
  (`no-noninteractive-element-interactions`) carrying a JSX `onKeyDown`.
  The dialog's Escape/Tab trap is attached **imperatively** — an effect adds
  a `keydown` listener to the dialog element (re-registered each render so
  the `isDeleting` freeze stays current) and removes it on unmount. Focus is
  trapped inside the dialog, so the listener sees every key press. Behavior
  unchanged; dialog tests green after the move.
- **F110B-5 (fixed, test-authoring):** `screen.findByRole('listitem')` fails
  against a two-row mock list ("Found multiple elements") — page tests use
  `findAllByRole('listitem')` with a length assertion. This was the root
  cause of the 10 initial page-test failures (not a `mockResolvedValueOnce`
  queue leak: `vi.clearAllMocks()` in `beforeEach` plus a single
  `mockResolvedValue` per test is sufficient).
- **Deviations from the ticket:** none on scope, files, or behavior. The
  date helper lives in `SemesterList.tsx` (exported for tests) rather than
  `shared/lib` — nothing else consumes it yet, and the ticket allows the
  extraction only if shared; if a second consumer appears, hoist it.

## Remaining work (this child)

None. Integration/e2e lifecycle proof, manual browser sign-off (DoD 10) and
the parent index belong to SP-110C; the combined SP-110 parent review
follows after C.
