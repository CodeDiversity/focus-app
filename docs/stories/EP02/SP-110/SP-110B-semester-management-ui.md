# SP-110B: Semester Management UI

**Story ID:** SP-110B
**Parent:** [SP-110](./SP-110-create-and-manage-standalone.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented — awaiting parent review (implemented 2026-10-20; record: [artifacts/SP-110B/implementation.md](./artifacts/SP-110B/implementation.md))
**Dependencies:** SP-110A (contract fixed in the breakdown README), SP-109 (FSD, implemented + reviewed), SP-107D (existing `entities/semester` API)
**Jira key:** Pending creation

## Summary

The `/semesters` page where students manage their semesters: a list (name,
dates, active badge, course count) with create, edit, activate, and delete —
loading/empty/error states, keyboard accessible, responsive, reachable from
the header nav. Built in the FSD layers (D110-4).

## Description

As a student, I can open Semesters from the header, see all my semesters with
which one is current, add a new one, rename or re-date one, set my current
semester, and delete one — with clear feedback at every step.

## Acceptance criteria

1. The `/semesters` route (inside `ProtectedRoute`, standard `Layout`) renders
   the student's semesters from `GET /semesters`: name, `startDate`–`endDate`
   displayed as readable dates, an "Active" badge iff `isActive`, and the
   course count (D110-3). Rows appear in API order (startDate desc).
   *(AC-E02-01, DoD 5)*
2. The create form (name + start/end `<input type="date">` — values sent as
   `yyyy-MM-dd`, no client time-zone conversion, D107-7) validates client-side
   (non-empty name ≤ 100; valid dates; end strictly after start) and submits
   the **existing** `POST /semesters` (SP-107B — no new create endpoint).
   Field-level 400/409 messages render per field; on success the new semester
   appears in the list. *(AC-E02-01, DoD 2/5)*
3. Each row offers **Edit** (pre-filled form → `PATCH /semesters/:id` with the
   same field rules) and **Delete** (a confirmation dialog naming the semester
   and warning that its courses remain, unaffiliated — D110-2; confirm →
   `DELETE /semesters/:id`; cancel closes without a request). *(AC-E02-01,
   DoD 5)*
4. **Activation (D110-1):** a non-active row offers "Set as active"
   (`PATCH { isActive: true }`); the active row offers "Deactivate"
   (`PATCH { isActive: false }`). After success the list re-derives badges
   from the API response (single-active is visible — at most one badge).
   *(D110-1, DoD 1/5)*
5. States and usability: loading (skeleton or spinner), empty ("No semesters
   yet" + create CTA), error (actionable message + retry) on the list;
   per-action pending states with duplicate-submission prevention; full
   keyboard operation (visible focus order, dialog focus trap + Escape, status
   changes announced via `aria-live`); usable on mobile (actions reachable, no
   horizontal scroll). *(DoD 5/6/7)*
6. The header nav gains a "Semesters" link (authenticated, styled like
   Dashboard/Profile, active-state highlight on `/semesters`). *(D110-4)*

## Tests

Component (Vitest + Testing Library, mirroring the existing page/feature test
patterns):

- `SemestersPage` — loading/empty/error/list render; ordering; active badge;
  course count; retry after error
- `SemesterForm` — create + edit modes; each client validation case (empty/
  over-long name, `end == start`, `end < start`); field-level error display
  from a 400; duplicate-name 409 message; duplicate-submission prevention
- delete dialog — cancel (no request) / confirm (request + row removal); the
  warning text states the courses-survive behavior (D110-2)
- activation — set-as-active / deactivate calls; badge re-derivation from the
  response
- a11y — keyboard flow through list → form → dialog (Tab order, focus trap,
  Escape); `aria-live` announcements
- `Header` — the Semesters link (authenticated only, active highlight)
- `semesterApi.test.ts` (**extend**) — the four new functions hit the
  contract paths/shapes

## Technical notes

- **Inspected (2026-10-20):** `apps/web/src/entities/semester/api/semesterApi.ts`
  (+ test; SP-107D — `createSemester` only; extend here, D107-9),
  `apps/web/src/shared/types/academic.ts` (`Semester`),
  `apps/web/src/features/onboarding/ui/Step2Semester.tsx` (date-input +
  validation pattern to mirror), `apps/web/src/pages/profile/ui/ProfilePage.tsx`
  (page + form + field-error pattern), `apps/web/src/widgets/header/ui/Header.tsx`
  (nav links), `apps/web/src/App.tsx` (route table),
  `apps/web/src/widgets/layout/ui/Layout.tsx`, `shared/ui/{Input,Button}.tsx`,
  `shared/api/httpClient.ts` (401 refresh/interceptor), the SP-109 FSD rules
  (epics README).
- **Placement (D110-4):** `pages/semesters/ui/SemestersPage.tsx` (**new**) +
  `features/semesters/ui/{SemesterList,SemesterForm,DeleteSemesterDialog}.tsx`
  (**new**) + tests; `entities/semester/api/semesterApi.ts` (**change** — add
  `listSemesters`, `getSemester`, `updateSemester`, `deleteSemester` + the
  `SemesterWithCount` type); `widgets/header/ui/Header.tsx` (**change**);
  `App.tsx` (**change** — route inside `ProtectedRoute`).
- **State:** component/page state (the list + form live on the page; no new
  RTK slice — the profile-page precedent; the entity API is the data home). If
  the implementer finds genuine shared state, keep it in
  `features/semesters/model/` (FSD-legal).
- **Types:** `SemesterWithCount` = `Semester & { courseCount: number }`
  declared in the entity API (the base `Semester` type is unchanged — the
  onboarding consumer keeps the create shape).
- **The onboarding `Step2Semester` is untouched** (EP01 scope). If a shared
  date-validation helper is extracted to `shared/lib`, it stays with this
  child (routine supporting work).
- **Delete warning copy** must state the D110-2 behavior (courses remain,
  unaffiliated) — no copy implying course loss.

## Definition of Done

1. ACs 1–6 pass. 2. Client-side validation mirrors the backend field rules.
3. N/A at the UI layer — the API enforces scoping; the route carries no
semester id (list page; edit via form), so the URL cannot address another
student's record. 4. Field-level 400/409 + actionable error display.
5. Loading/empty/error + per-action pending states. 6. Keyboard accessibility
(AC 5). 7. Responsive (AC 5). 8. Component tests above. 9. N/A — no API change
(the contract is owned by A and documented in the README). 10. Via SP-110C
sign-off + the combined parent review.

## Sizing

- **Outcome:** the `/semesters` page is a complete, accessible management
  surface: list with active badge + course count, create, edit, activate,
  delete-with-confirmation, all states, reachable from the header.
- **Time estimate:** ~2.5 h — one page, three small feature components, four
  entity-API functions, a header link, and the test matrix above; the form
  reuses the SP-107D date/validation pattern. One cohesive child: the page is
  one verifiable outcome (splitting list/form/dialog into children would
  manufacture near-duplicate slices below the meaningful-work gate).
- **Files:** `apps/web/src/pages/semesters/ui/SemestersPage.tsx` (+ test,
  **new**), `apps/web/src/features/semesters/ui/{SemesterList,SemesterForm,DeleteSemesterDialog}.tsx`
  (+ tests, **new**), `apps/web/src/entities/semester/api/semesterApi.ts` +
  test (change), `apps/web/src/widgets/header/ui/Header.tsx` + test (change),
  `apps/web/src/App.tsx` (change).
- **Start context:** this ticket, decisions D110-1…6, the
  [shared API contract](./README.md#shared-api-contract),
  `entities/semester/api/semesterApi.ts` (+ test), `Step2Semester.tsx`,
  `ProfilePage.tsx` (+ tests), `shared/ui/{Input,Button}.tsx`,
  `shared/api/httpClient.ts`, `Header.tsx`, `App.tsx`, `Layout.tsx`, the SP-109
  FSD rules.
- **Verification:** `pnpm --filter @studypilot/web test` green;
  `pnpm --filter @studypilot/web typecheck` + lint + build clean.
- **Dependencies / exclusions:** A implemented (contract fixed in the README).
  Excluded: all course UI (EP02 proposed stories 2–6), the onboarding wizard
  (EP01), calendar/dashboard consumption (EP04/EP05).
