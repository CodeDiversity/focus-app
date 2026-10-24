# SP-112B implementation record — Course Detail UI (Meetings + Assignments)

**Story:** [SP-112B](../../SP-112B-course-detail-ui.md) (parent [SP-112](../../README.md))
**Parent / review unit:** SP-112 — one combined parent review after A+B+C (`../SP-112/review.md`); this child is the frontend leg.
**Layer:** Frontend (React + Vite + Tailwind, `apps/web`)
**Baseline:** `650ab39` (docs(SP-112): reconcile queue — SP-112B Ready) — the commit before the first included change
**Completed:** 2026-10-23, implementer, single sequential writer
**Status:** Implementation complete — awaiting the combined SP-112 parent review. Review pass 1 (2026-10-23, `../SP-112/review.md`) returned **DOES NOT PASS** with one should-fix — **F-112B-1** (the missing `<Toaster />` mount, DoD 4); **fixed** in the post-review fix commit (2026-10-23, recorded in "Review fix (F-112B-1)" below) — awaiting the re-review (pass 2).

## Summary

The course detail screen exists at `/courses/:id` (inside `ProtectedRoute`),
driven by **one** `getCourse` fetch whose 14-key `CourseDetail` response feeds
the header and both sections (D112B-13):

- **`CourseDetailPage`** (`pages/courses/ui/CourseDetailPage.tsx`, new): header
  card per D112B-11 (color chip + `h1` name + `code`; meta line with
  instructor / semester / credits fallbacks; **Edit** reusing SP-111B
  `CourseForm`, **Archive/Restore** reusing `ArchiveCourseDialog`, per-course
  `aria-label`s); 3-line-clamped description with a **Show more/less** toggle
  that appears only on measured overflow (D112B-2); a full-width **Archived**
  banner strip above the header for archived courses (D112B-5); the two section
  cards in `grid grid-cols-1 lg:grid-cols-2` (D112B-1); page states — loading
  (generic "Course" `h1` + spinner), uniform-404 error card
  ("We couldn't find this course. It may no longer exist." + **Back to
  courses**, no retry), other-failure alert + **Try again**, failed
  background re-fetch → toast + keep last known detail; an always-present
  `role="status"` live region announces course/meeting mutations. A `!id`
  guard maps an absent `:id` to the uniform not-found state (foreground) or
  keeps the last known detail (background re-fetch).
- **`MeetingsSection`** (new, `features/courses/ui/`): `h2` "Meetings" +
  **Add meeting**; rows render `formatMeetingLabel` ("Mon 09:00–10:30",
  D112B-7) in API order (no client re-sort) with **Edit** (outline) /
  **Delete** (ghost) per-meeting `aria-label`s; hosts both dialogs; no local
  list state — `onMeetingChanged` drives the page announce + background
  `getCourse` refetch (D112B-10); empty state "No meetings yet" + **Add your
  first meeting** CTA.
- **`MeetingForm`** (new): the add/edit **dialog** (D112B-3, the `CourseForm`
  pattern — RHF + zod, focus trap, Escape closes, focus returns to the
  trigger): Day `Select` with full names Sunday–Saturday (0–6, D112-1;
  create-mode default = Monday — recorded minor decision), `Input type="time"`
  for both times. Client rules mirror the backend (DoD 2): both times
  required; `HH:mm` shape; end strictly after start, same day (no midnight
  wrap). Error branches (D112B-8): 400 → per-field via `getFieldError`;
  409 → form-level alert with the API message; 404 → form-level alert +
  **Back to courses**; other → toast the sanitized message, values preserved
  (resubmit is the retry). Whole-flight `isLoading`.
- **`DeleteMeetingDialog`** (new): the `DeleteSemesterDialog` pattern — Cancel
  focused first, danger Delete; copy "Delete Mon 09:00–10:30?" + "This removes
  the meeting from the course's weekly schedule."; in-dialog error with retry =
  re-click.
- **`AssignmentsSection`** (new): read-only (D112-6) — title, "Due {medium
  date}" via `formatDate(new Date(dueDate), getBrowserTimeZone())` (D112B-16),
  status + priority pills pairing text with color (DoD 6, D112B-4 palettes);
  API order (no client re-sort); empty state "No assignments yet." with **no**
  CTA (EP03 populates the same projection — no EP02 rework, D112-3); no
  management controls.
- **`meetingLabel.ts`** (new, 18 lines): `formatMeetingLabel` — the one
  canonical "Mon 09:00–10:30" formatter shared by the section rows, the delete
  copy, and the edit title (recorded minor decision: one helper instead of
  three divergent copies).
- **`courseApi.ts`** (D112B-12/13): `getCourse` return type → 14-key
  `CourseDetail` (12-key `CourseWithSemester` unchanged; safe — no production
  callers, verified in the ticket); `CreateMeetingRequest` /
  `UpdateMeetingRequest`; the four meeting functions on the contract's nested
  paths (`listMeetings` exists for the contract surface + SP-112C's e2e spec;
  the detail page itself never calls it — one `getCourse` drives everything).
  Plain-axios `httpClient`, no RTK Query (entity convention).
- **`shared/types/academic.ts`** (D112B-14): `ClassMeeting` (canonical 6-key
  `toMeetingResponse` shape — `userId`/`courseId` never exposed) +
  `CourseAssignment = Omit<Assignment, 'course'>` (the 10-key read-only
  projection; the full `Assignment` type stays untouched).
- **`CourseList.tsx`** row navigation (D112B-6): the name is a `Link` to
  `/courses/:id` (accessible name = the course name); the row area navigates on
  mouse click (`li` `onClick` + `cursor-pointer`; the row is not focusable and
  carries no role — keyboard/AT users use the name link; the one justified
  `eslint-disable` for the two jsx-a11y heuristics cites WCAG 2.1.1 — the repo's
  first a11y disable); action buttons `stopPropagation`.
- **`App.tsx`**: `/courses/:id` route inside `ProtectedRoute`, beside
  `/courses`.
- **Test harness:** `test/user.ts` gains `selectOptions` + `clear` act-wrapped
  wrappers (userEvent v14 signatures) so the dialog tests use `setupUser()`
  end-to-end (F-112B-3).

## Changed paths (commit scope)

| Path | Change |
|---|---|
| `apps/web/src/app/App.tsx` | `/courses/:id` route inside `ProtectedRoute` (AC 1) |
| `apps/web/src/entities/course/api/courseApi.ts` | `CourseDetail` (14-key) + `getCourse` retyped + `CreateMeetingRequest`/`UpdateMeetingRequest` + four meeting functions (D112B-12/13) |
| `apps/web/src/entities/course/api/courseApi.test.ts` | +12 tests (21 → 33): the four meeting functions hit the nested paths; `getCourse` returns the 14-key shape |
| `apps/web/src/shared/types/academic.ts` | `ClassMeeting` + `CourseAssignment` (D112B-14) |
| `apps/web/src/features/courses/ui/MeetingForm.tsx` | **new** (328 lines) — add/edit dialog (RHF + zod; 400/409/404 branches; focus trap) |
| `apps/web/src/features/courses/ui/MeetingForm.test.tsx` | **new** — 14 tests (open/close + focus trap/return, day select, time validation, 400/409/404/other branches) |
| `apps/web/src/features/courses/ui/DeleteMeetingDialog.tsx` | **new** (167) — confirmation dialog (Cancel first, danger Delete) |
| `apps/web/src/features/courses/ui/DeleteMeetingDialog.test.tsx` | **new** — 9 tests (copy, focus order, success close + announce, in-dialog error) |
| `apps/web/src/features/courses/ui/MeetingsSection.tsx` | **new** (137) — list + Add meeting; hosts both dialogs |
| `apps/web/src/features/courses/ui/MeetingsSection.test.tsx` | **new** — 8 tests (rows + labels in API order, aria-labels, add/edit/delete flows, empty state) |
| `apps/web/src/features/courses/ui/AssignmentsSection.tsx` | **new** (118) — read-only list + badge palettes + empty state |
| `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` | **new** — 5 tests (10-key projection, due-date formatting, badge text+color, no management controls, empty state) |
| `apps/web/src/features/courses/ui/meetingLabel.ts` | **new** (18) — `formatMeetingLabel` |
| `apps/web/src/features/courses/ui/meetingLabel.test.ts` | **new** — 3 tests (all seven weekdays, en dash, exact `HH:mm`) |
| `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` | **new** (336) — the route screen (header + both sections + states + live region) |
| `apps/web/src/pages/courses/ui/CourseDetailPage.test.tsx` | **new** — 16 tests (header fields + fallbacks, clamp toggle, Archived banner, 404 / other-failure states, edit + archive wiring, loading, live-region announcements, failed re-fetch toast) |
| `apps/web/src/features/courses/ui/CourseList.tsx` | name → `Link`; row click navigates; buttons `stopPropagation`; justified a11y `eslint-disable` (D112B-6) |
| `apps/web/src/features/courses/ui/CourseList.test.tsx` | `Providers`/`initialEntries` wrapper (F-112B-2) + 3 navigation tests (10 → 13: name link, row-area click, action-button no-navigate) |
| `apps/web/src/pages/courses/ui/CoursesPage.test.tsx` | `Providers initialEntries={['/courses']}` wrapper (F-112B-2; test count unchanged, 14) |
| `apps/web/src/test/user.ts` | `selectOptions` + `clear` act-wrapped wrappers (F-112B-3) |

Plus this closeout: this record, the refreshed checkpoint, the SP-112 README
execution fields (queue rows B/C, active/next), and the SP-112B ticket status
line.

## Acceptance criteria verification

| AC | Status | Evidence |
|---|---|---|
| AC 1 route + nav | ✅ | `/courses/:id` registered in `App.tsx` inside `ProtectedRoute` beside `/courses`; `CourseList` name is a `Link` to `/courses/:id`, row area navigates on mouse click (not focusable, no role), action buttons `stopPropagation` — `CourseList.test.tsx` navigation tests (name link → `/courses/:id`, row-area click → navigate, action button → no navigate) + `CoursesPage.test.tsx`; `CourseDetailPage.test.tsx` renders through `<Routes><Route path="/courses/:id">` and pins the uniform-404 state: `role="alert"` card with the exact copy "We couldn't find this course. It may no longer exist." + **Back to courses**, no retry, no existence hint |
| AC 2 course header (D112B-11) | ✅ | `CourseDetailPage.test.tsx`: header fields (instructor "—" fallback, "No semester" fallback, credits omitted when null, `code` rendered); description clamp with **Show more/less** only on overflow (measured); Archived banner strip for `isActive: false`; **Edit** opens the pre-filled `CourseForm` and a successful save re-fetches (header re-renders) + announces; **Archive/Restore** wired to `ArchiveCourseDialog` with per-course `aria-label`s; `h1` is the generic "Course" while loading/error, the course name on success |
| AC 3 meetings section (AC-E02-04) | ✅ | `MeetingsSection.test.tsx` (8): "Mon 09:00–10:30" rows in API order (no client re-sort), per-meeting Edit/Delete `aria-label`s, add/edit/delete flows, empty state + CTA. `MeetingForm.test.tsx` (14): dialog open/close with focus trap + Escape + focus return; day select Sunday–Saturday (0–6); `Input type="time"`; end-after-start inline error; per-field 400 via `getFieldError`; 409 form-level alert; 404 form-level alert + **Back to courses**; other failure toasts with values preserved. `DeleteMeetingDialog.test.tsx` (9): copy, Cancel focused first, danger Delete, success closes + announces, in-dialog error + retry. Post-mutation: dialog closes, `onMeetingChanged` → page `role="status"` announce ("Meeting added." / "Meeting updated." / "Meeting deleted.") + background `getCourse` refetch (D112B-10) |
| AC 4 assignments section (AC-E02-06, D112-6) | ✅ | `AssignmentsSection.test.tsx` (5): renders the 10-key projection in API order (no client re-sort) — title, "Due Oct 12, 2026" via `formatDate` + `getBrowserTimeZone` (D112B-16), status pills (PENDING slate / IN_PROGRESS blue / SUBMITTED violet / COMPLETED green / GRADED teal) + priority pills (LOW slate / MEDIUM amber / HIGH orange / URGENT red) pairing text with color; no interactive management controls; empty state "No assignments yet." with no CTA |
| AC 5 states | ✅ | `CourseDetailPage.test.tsx`: loading (spinner + "Loading your course…", one `getCourse` in flight — no per-section loading); 404 → the AC 1 error state; other fetch failure → `role="alert"` + **Try again**; a failed meetings re-fetch after a mutation toasts the sanitized message and keeps the last known detail (no full-page error); the always-present `role="status"` live region announces course/meeting mutations |
| AC 6 accessibility + responsive | ✅ | one `h1` (course name, or "Course" while loading/error) + `h2` per section (asserted in the page tests); name link, day select, time inputs, description toggle, edit/delete/archive controls keyboard-operable; both dialogs trap focus, close on Escape, return focus to the trigger (MeetingForm/DeleteMeetingDialog tests); badges pair text with color (DoD 6, WCAG 2.2 AA); responsive: container `max-w-5xl px-4 sm:px-6 lg:px-8 py-12`, header row stacks (`flex-col-reverse` → `sm:flex-row`), sections `grid grid-cols-1 lg:grid-cols-2` (D112B-1), form fields + rows stack below `sm` (DoD 7) |

DoD map: 1 ✅ (ACs 1–6), 2 ✅ (zod mirrors the backend rules), 3 N/A
(consumes A's principal-scoped routes), 4 ✅ (field-level 400 / 409 / 404
rendered actionably), 5 ✅, 6 ✅, 7 ✅, 8 ✅ (component tests above), 9 N/A
(no API change — consumes A's contract), 10 via SP-112C sign-off + the
combined parent review.

## Verification actually executed

All commands from the repo root, on the final tree (2026-10-23):

| Check | Command | Result |
|---|---|---|
| Typecheck | `pnpm --filter @studypilot/web typecheck` (`tsc --noEmit`) | exit 0 |
| Full web suite | `pnpm --filter @studypilot/web test` | exit 0 — **41/41 files, 495/495 tests passed** (baseline at `650ab39`: 35 files / 425 tests; +6 new test files, +70 tests: courseApi +12, CourseList +3, CoursesPage +0, MeetingForm 14, DeleteMeetingDialog 9, MeetingsSection 8, AssignmentsSection 5, meetingLabel 3, CourseDetailPage 16) |
| Lint | `pnpm --filter @studypilot/web lint` (`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`) | exit 0 — the justified a11y `eslint-disable` in `CourseList.tsx` is used (no unused-directive) and the warning budget holds |
| Build | `pnpm --filter @studypilot/web build` (`tsc && vite build`) | exit 0 — 1581 modules, `dist/assets/index-ASOEMuSt.js` 511 kB; the >500 kB chunk-size warning is pre-existing (present at baseline; the chunk grew slightly with the new page) |

Focused runs during development: per-file `vitest run` for each new/changed
test file as it landed (all green); the final full-suite run above is the
closing evidence.

**Pre-existing test-suite noise (not introduced by this child):** the full
suite logs 665 "not wrapped in act" warnings. Every warning's stack points at
pre-existing files/components (`CourseForm`, `CoursesPage`, `SemestersPage`,
`ProfilePage`, `LoginPage`, `RegisterPage`, `OnboardingPage`,
`ArchiveCourseDialog`, `DeleteSemesterDialog`, `WizardShell`,
`ResetPasswordPage`, `ForgotPasswordPage`, `AuthProvider`, `store.test.tsx`
— the 16 legacy test files that call raw `userEvent.setup()`, which
user-event v14 never act-wraps while RTL v14 sets
`IS_REACT_ACT_ENVIRONMENT=true` per file). **Zero** warnings mention any
SP-112B file (`MeetingForm` / `DeleteMeetingDialog` / `MeetingsSection` /
`AssignmentsSection` / `CourseDetailPage` / `meetingLabel` all absent from the
warning stacks — every new test uses the act-wrapped `setupUser()`). The four
warnings that mention `CourseList` come from the five **pre-existing** raw
`userEvent.setup()` calls in `CourseList.test.tsx` (4) and
`CoursesPage.test.tsx` (1), left as-is for a minimal diff (F-112B-3); the
three new navigation tests use `setupUser()`.

## Findings / deviations

| ID | Description | Disposition |
|---|---|---|
| F-112B-1 | **Pre-existing:** no `<Toaster />` is mounted anywhere in `apps/web` (checked `main.tsx`, `AppProviders.tsx`, full `src` grep) while **11 production files carry 21 `toast.*` call sites** (the "9 files" in this child's original record was a miscount — the reviewer's pass-1 count stands) — so toasts (including the AC 3 "other failure" branch) were no-ops in the built app. Pre-dates SP-112B; the ticket's "toast the sanitized message" follows the app convention regardless, so the code matched the ticket. | **FIXED** in the post-review fix commit (2026-10-23, after review pass 1 confirmed it as the single should-fix — DoD 4): a one-line `<Toaster />` mount in the app shell (`apps/web/src/main.tsx`, inside `AppProviders`, beside `<App />`) + a render test (`apps/web/src/main.test.tsx` — mounts `<Toaster />` alongside a trigger that fires `toast.error(...)`, asserts the message appears in the document; stubs jsdom's missing `window.matchMedia`, which the Toaster queries for `prefers-reduced-motion`). All 11 files / 21 call sites now produce visible messages. Gate results in "Review fix (F-112B-1)" below. |
| F-112B-2 | **Test-only consequence of D112B-6:** `CourseList` now uses `Link`/`useNavigate`, so its standalone test render (and `CoursesPage`'s router-less render) would crash outside a router. Both test files were wrapped in the `Providers` helper (`MemoryRouter` + `initialEntries`) — the `VerifyEmailPage.test.tsx` pattern. | **Fixed (test-only):** `CourseList.test.tsx` 13/13 and `CoursesPage.test.tsx` 14/14 green. No product impact. |
| F-112B-3 | **Act-warning root cause (test harness):** RTL v14.3.1 sets `IS_REACT_ACT_ENVIRONMENT=true` for the whole test file, and user-event v14.6.7 does not act-wrap its actions — raw `userEvent.setup()` clicks produce "not wrapped in act" warnings. The repo convention is the `setupUser()` helper (act-wrapped in `src/test/user.ts`), which lacked `selectOptions`/`clear` wrappers needed by the dialog tests. | **Fixed for this child:** `test/user.ts` gained the two act-wrapped wrappers; all six new SP-112B test files use `setupUser()` end-to-end; `DeleteMeetingDialog.test.tsx` was converted (10 warnings removed). The five pre-existing raw `userEvent.setup()` calls in `CourseList.test.tsx`/`CoursesPage.test.tsx` were left as-is (minimal diff; the raw-userEvent pattern spans 16 legacy files repo-wide — a separate cleanup, flagged with F-112B-1 for the parent review). |

No deviations from the ticket's decisions (D112B-1…16) or the shared API
contract. Two **recorded minor decisions** (both in the checkpoint):
`MeetingForm` create-mode default day = Monday (`dayOfWeek` 1) — the ticket
leaves the default open; and the "Mon 09:00–10:30" label implemented as one
`meetingLabel.ts` helper shared by three components instead of three
divergent copies.

No Jira mutation occurred (child key remains `Pending creation`).

## Commit scope

One scoped commit on `main` (baseline `650ab39`) with exactly the "Changed
paths" table above (10 modified + 12 new files, all SP-112B-scoped) plus the
closeout docs (this record, the refreshed checkpoint, the SP-112 README
execution fields, the SP-112B ticket status line). The working tree was clean
of unrelated edits at closeout (verified via `git status`).

## Review fix (F-112B-1) — post-review fix commit, 2026-10-23

Review pass 1 (`../SP-112/review.md`) returned **DOES NOT PASS** with one
should-fix: **F-112B-1** — shared DoD 4 ("API errors produce actionable
messages") unmet because no `<Toaster />` was mounted, so every `toast.*`
call was a no-op in the built app (11 production files / 21 call sites
app-wide; in this child: `MeetingForm.tsx:195` the 400-unmapped fallback,
`MeetingForm.tsx:216` the network/5xx save-failure branch, and
`CourseDetailPage.tsx:95` the failed background re-fetch). The session owner
directed the fix close inside the SP-112 unit (not a separate story).

**Change (the only production change in the fix commit):** `apps/web/src/
main.tsx` — mount `<Toaster />` from `react-hot-toast` exactly once in the
app shell (inside `AppProviders`, beside `<App />`). No other production code
change; no API-side change.

**Automated proof:** `apps/web/src/main.test.tsx` (**new**) — mounts
`<Toaster />` alongside a trigger that fires `toast.error(...)`, asserts the
message appears in the document (jsdom's missing `window.matchMedia` is
stubbed for the file — the Toaster queries `prefers-reduced-motion` when it
renders a toast; real browsers always have it, so no production stub).

**Gates (re-run on the fix tree, 2026-10-23, cwd: repo root):**

| Check | Command | Result |
|---|---|---|
| Full web suite | `pnpm --filter @studypilot/web test` | exit 0 — **42/42 files, 496/496 tests passed** (pre-change baseline: 41 files / 495 tests; +1 file / +1 test = `main.test.tsx`) |
| Typecheck | `pnpm --filter @studypilot/web typecheck` | exit 0 |
| Lint | `pnpm --filter @studypilot/web lint` | exit 0 (`--max-warnings 0`) |
| Build | `pnpm --filter @studypilot/web build` | exit 0 — 1581 modules, `dist/assets/index-Cj6bNDwI.js` 514.36 kB (the >500 kB chunk-size warning is pre-existing) |

**Closure of F-112B-1:** the affected branches now produce visible messages in
the built app — the DoD 4 display leg is satisfied; the DoD-10 walk evidence
covers the feature flows the one-line mount does not change (per the review's
closure condition). The fix commit also records the DoD 10 human ratification
(SP-112C — see `../SP-112C/implementation.md`).

## Remaining work (outside this child)

- **SP-112C** (integration sign-off) — the named integration/index owner:
  the e2e spec (it consumes `listMeetings`, provided by this child), the DoD
  10 manual browser sign-off, and the parent index at
  `../SP-112/implementation.md`. *(Completed 2026-10-23 — `469a829`.)*
- **F-112B-1** — **resolved** by the post-review fix commit above (2026-10-23).
- **Combined SP-112 parent review** — pass 1 (2026-10-23) returned DOES NOT
  PASS with F-112B-1 as the single should-fix; the fix + the DoD 10
  ratification land in the fix commit; the **re-review (pass 2)** is
  requested (`../SP-112/review.md` + `walkthrough.md`); only the passing
  combined review establishes sign-off.
