# SP-112B checkpoint

Updated: 2026-10-23 (implementer session, local time) — **complete**
Execution state: parent queue row B — `docs/stories/EP02/SP-112/README.md` (Implemented — awaiting parent review)
Story: `docs/stories/EP02/SP-112/SP-112B-course-detail-ui.md`
Review unit: SP-112 (`./artifacts/SP-112/` parent index written by C)
Role / scope: implementer; frontend only — course detail page + meetings/assignments sections + row links + entity API extension. Excluded: integration sign-off/e2e (SP-112C), assignment management (EP03), calendar (EP04).

## Repository state
- Workspace / branch: main working tree, `/Users/michael/Documents/GitHub/focus-app`
- HEAD at start: `650ab39` (docs(SP-112): reconcile queue — SP-112B Ready)
- Saved work: **all SP-112B files** (10 modified + 12 new — the full list in `implementation.md` "Changed paths") — committed in the closeout commit (see `implementation.md` "Commit scope")
- Other work to preserve: none — `git status` clean at start; no unrelated edits at closeout

## Progress
- [x] Baseline read: ticket D112B-1…16, shared contract, SP-112A backend (`courses-meetings.service.ts`, `courses.service.get()` 14-key), `CourseForm`/`ArchiveCourseDialog`/`DeleteSemesterDialog` patterns, `errors.ts`/`datetime.ts`, `test/providers.tsx`/`user.ts`, `courseApi.ts` + tests, `CourseList` + tests, `CoursesPage` + tests, `App.tsx` routes
- [x] Baseline web test suite green (verified before first edit: 35 files / 425 tests at `650ab39`)
- [x] `shared/types/academic.ts` — `ClassMeeting` + `CourseAssignment` (D112B-14)
- [x] `courseApi.ts` — `getCourse` → 14-key `CourseDetail` (D112B-12) + four meeting functions (D112B-13)
- [x] `courseApi.test.ts` — meeting functions + 14-key shape tests (21 → 33 tests, green)
- [x] `meetingLabel.ts` (+ test, 3 tests) — the shared "Mon 09:00–10:30" formatter
- [x] `MeetingForm.tsx` (+ test, 14 tests) — add/edit dialog (RHF + zod; 400/409/404 branches; focus trap)
- [x] `DeleteMeetingDialog.tsx` (+ test, 9 tests) — confirmation (Cancel first, danger Delete)
- [x] `MeetingsSection.tsx` (+ test, 8 tests) — list + Add meeting; hosts both dialogs
- [x] `AssignmentsSection.tsx` (+ test, 5 tests) — read-only list + badges + empty state
- [x] `test/user.ts` — `selectOptions` + `clear` act-wrapped wrappers (F-112B-3)
- [x] `CourseDetailPage.tsx` (+ test, 16 tests) — header + sections + states + live region (`!id` guard; `id && course` render branch)
- [x] `CourseList.tsx` — name → `Link`, row click navigates, buttons `stopPropagation`, justified a11y `eslint-disable` (D112B-6)
- [x] `CourseList.test.tsx` (13) + `CoursesPage.test.tsx` (14) — `Providers`/`initialEntries` router wrapper (F-112B-2) + 3 navigation tests
- [x] `App.tsx` — `/courses/:id` route inside `ProtectedRoute`
- [x] Full verification: typecheck + test (41 files / 495 tests) + lint (`--max-warnings 0`) + build — all exit 0
- [x] Closeout: `implementation.md` written, queue reconciled (row B → Implemented — awaiting parent review; row C → Ready), ticket status line, scoped commit
- Current step: **complete** — the child is implemented and committed; the next action is SP-112C (implement), then the combined SP-112 parent review.

## Decisions and dependencies
- D112-1…6 (parent README) + D112B-1…16 (ticket) govern; shared contract fixed in parent README.
- **Minor decision (recorded):** `MeetingForm` create-mode default day = Monday (`dayOfWeek` 1) — the ticket leaves the default open; Monday is the natural default for a class meeting. The select offers Sunday–Saturday full names (0–6) per D112-1.
- **Minor decision (recorded):** the "Mon 09:00–10:30" label (D112B-7) is needed by three components (section rows, delete copy, edit title) — implemented as one small `features/courses/ui/meetingLabel.ts` helper (`formatMeetingLabel`) to avoid three divergent copies.
- Contract verified against SP-112A code: `toMeetingResponse` = 6 keys (no `userId`/`courseId`); `get()` = 12 + `meetings` + `assignments` (10-key assignment, no `courseId`).

## Findings
- **F-112B-1** (pre-existing, out of scope — **open, flagged for the combined parent review**): no `<Toaster />` is mounted anywhere in `apps/web` (checked `main.tsx`, `AppProviders.tsx`, full `src` grep) while 9 files call `toast.*`. Pre-dates SP-112B; the code follows the app convention regardless. A one-line `<Toaster />` mount in the app shell would fix all 9 callers — a decision for the review, not this child.
- **F-112B-2** (test-only consequence of D112B-6, **fixed**): `CourseList` gains a `Link` + `useNavigate`, so `CourseList.test.tsx` + `CoursesPage.test.tsx` were wrapped in `Providers` (`MemoryRouter` + `initialEntries`) — the `VerifyEmailPage.test.tsx` pattern. No product impact.
- **F-112B-3** (test harness, **fixed for this child**): RTL v14.3.1 sets `IS_REACT_ACT_ENVIRONMENT=true` per file; user-event v14.6.7 never act-wraps, so raw `userEvent.setup()` clicks warn. All six new SP-112B test files use the act-wrapped `setupUser()`; `test/user.ts` gained `selectOptions` + `clear` wrappers; `DeleteMeetingDialog.test.tsx` converted (10 warnings removed). The five pre-existing raw `userEvent.setup()` calls in `CourseList.test.tsx` (4) / `CoursesPage.test.tsx` (1) left as-is (minimal diff; the pattern spans 16 legacy files — flagged with F-112B-1).

## Verification
- Final tree, repo root, 2026-10-23: `pnpm --filter @studypilot/web typecheck` exit 0; `pnpm --filter @studypilot/web test` exit 0 — **41/41 files, 495/495 tests** (baseline 35/425; +6 files, +70 tests); `pnpm --filter @studypilot/web lint` exit 0 (`--max-warnings 0`); `pnpm --filter @studypilot/web build` exit 0 (pre-existing >500 kB chunk warning only).
- Act warnings: 665 in the full suite — every stack points at pre-existing files (the 16 legacy raw-`userEvent` files); **zero** mention any SP-112B file.
- Full details (AC-by-AC, per-file test counts, command table) in `implementation.md`.

## Resume next
**Nothing** — the child is complete. Next in the SP-112 queue: SP-112C (implement — e2e spec + DoD 10 sign-off + parent index), then the combined SP-112 parent review.
