# SP-112B: Course Detail UI (Meetings + Assignments)

**Story ID:** SP-112B
**Parent:** [SP-112](./SP-112-class-meetings-and-course-detail.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Implemented 2026-10-23 — awaiting the combined SP-112 parent
review (implementation record: `./artifacts/SP-112B/implementation.md`).
Refined 2026-10-23 — UI/UX (the `ui-refiner` pass; decisions D112B-1…11) and
technical (that pass; decisions D112B-12…16) both settled and grounded in the
post-SP-112A code. Dependencies satisfied (SP-111B + SP-112A implemented).
**Refined:** 2026-10-23
**Dependencies:** SP-111B implemented (the `/courses` list page + `features/courses/`), SP-112A implemented (contract fixed in the [breakdown README](./README.md#shared-api-contract))
**Jira key:** Pending creation

## Summary

Build the course detail screen: `/courses/:id` showing the course's
information, its **recurring weekly meetings** (add / edit / delete — the epic's
"configure recurring weekly classes"), and its **related assignments**
(read-only until EP03) — and make the SP-111B list rows link here.

## Description

As a student, I open a course and see everything about it in one place: what
it is, when it meets each week, and what work it has — with a clear empty
state when there is none yet.

## Acceptance criteria

1. **Route + nav:** `/courses/:id` renders inside `ProtectedRoute` at
   `pages/courses/ui/CourseDetailPage.tsx` (route registered in
   `apps/web/src/app/App.tsx` beside `/courses`). The SP-111B list rows link
   here: the course **name** becomes a `Link` to `/courses/:id` (accessible
   name = the course name), the non-interactive row area also navigates on
   mouse click (the row itself is not focusable and carries no role —
   keyboard/AT users use the name link), and the Edit/Archive/Restore buttons
   `stopPropagation` so they never navigate (D112B-6). A missing/foreign
   course id (uniform 404 from the API) renders an error state: a
   `role="alert"` card with the copy "We couldn't find this course. It may no
   longer exist." and a **Back to courses** action — no crash, no existence
   hint, and no retry (a 404 does not self-heal). *(AC-E02-06, D112-5)*
2. **Course header (D112B-11):** header card with the color chip (aria-hidden,
   as in the list) + `h1` course name + `code` (monospace, muted) on one line;
   a meta line with instructor (muted "—" when null) · semester name (muted
   "No semester" when null) · credits (omitted when null); actions on the
   right — **Edit** (outline) and **Archive/Restore** (secondary, reusing the
   SP-111B `ArchiveCourseDialog`) with per-course `aria-label`s — mirroring
   the CoursesPage header-row pattern. The description renders below the meta
   line, clamped to 3 lines (`line-clamp-3`); a **Show more**/**Show less**
   button appears only when the text actually overflows the clamp (measured —
   short descriptions never show a toggle) (D112B-2). An archived course shows
   a full-width **Archived** banner strip above the header card (text-only —
   no duplicate inline badge in the header); the page remains fully accessible
   (AC-E02-05) (D112B-5). **Edit** opens the SP-111B `CourseForm` (same
   dialog, pre-filled); on success the detail re-fetches (the header
   re-renders) and the change is announced. While loading or in the error
   state the page `h1` is the generic "Course" (one stable `h1`; it becomes
   the course name on success). *(AC-E02-03/05)*
3. **Meetings section (AC-E02-04):** `h2` "Meetings" with an **Add meeting**
   button (primary, `size="sm"`) on the section header row. Meetings render as
   "Mon 09:00–10:30" rows (short weekday Sun–Sat from `dayOfWeek` 0–6; en
   dash; 24-hour `HH:mm` exactly as stored — recurring times of day, no
   time-zone conversion, D112-1/D112B-7), in API order (dayOfWeek then start
   time — no client re-sort), each with **Edit** (outline sm) + **Delete**
   (ghost sm) carrying per-meeting `aria-label`s (e.g. "Edit Mon 09:00–10:30").
   Add and edit both open the `MeetingForm` **dialog** (D112B-3; the
   `CourseForm` pattern — focus trap, Escape closes, focus returns to the
   trigger): Day (native `Select`, Sun–Sat), Start time and End time
   (`Input type="time"`, `HH:mm`). Client-side rules mirror the backend (DoD
   2): both times required; end must be strictly after start (same day) — an
   inline error under the end field ("End time must be after the start
   time."). Backend 400 field errors render per field (dayOfWeek/startTime/
   endTime via `getFieldError`); 409 (slot already taken) renders the API
   message as a form-level alert; 404 renders a form-level alert with a
   **Back to courses** link; any other failure toasts the sanitized message
   with the form values preserved (resubmit is the retry) (D112B-8). Delete
   uses a lightweight confirmation dialog (`DeleteMeetingDialog`, the
   `DeleteSemesterDialog` pattern — Cancel focused first, danger Delete):
   "Delete Mon 09:00–10:30?" + "This removes the meeting from the course's
   weekly schedule." On success the dialog closes, the page announces through
   the status live region ("Meeting added." / "Meeting updated." / "Meeting
   deleted.") and refetches the meetings list (D112B-10). Empty state: "No
   meetings yet" + an **Add your first meeting** CTA. *(DoD 2/4/5/8)*
4. **Assignments section (AC-E02-06, D112-6):** `h2` "Assignments" with a
   read-only list of the course's assignments in API order (dueDate asc
   nulls-last, then title — no client re-sort): title (medium weight), a
   "Due Oct 12, 2026" line (medium date in the student's browser time zone via
   the shared `datetime` helpers — `formatDate` + `getBrowserTimeZone`; EP03
   owns date semantics), and a status badge + a priority badge — color-coded
   pills that pair text with color (DoD 6): status PENDING slate /
   IN_PROGRESS blue / SUBMITTED violet / COMPLETED green / GRADED teal;
   priority LOW slate / MEDIUM amber / HIGH orange / URGENT red (D112B-4).
   **No management controls** (EP03 owns those). Empty state: "No
   assignments yet." (no CTA — EP03 will populate this section through the
   same projection, D112-3; no EP02 rework.) *(DoD 5)*
5. **States:** the page shows a loading spinner + "Loading your course…"
   while the single `getCourse` fetch is in flight (that one response drives
   the header + both sections — there is no separate per-section loading); a
   404 renders the AC 1 error state; any other fetch failure renders a
   `role="alert"` message + **Try again** (DoD 5). A failed meetings
   re-fetch after a mutation toasts the sanitized message and keeps the last
   known list (no full-page error). An always-present `role="status"` live
   region announces course/meeting mutations (the CoursesPage pattern, DoD 6).
6. **Accessibility:** one `h1` (the course name, or "Course" while
   loading/error); `h2` per section; the name link, weekday select, time
   inputs, description toggle, edit/delete/archive controls, and both dialogs
   are fully keyboard-operable with visible focus states; dialogs trap focus,
   close on Escape, and return focus to the trigger; badges pair text with
   color (DoD 6, WCAG 2.2 AA). **Responsive:** container `max-w-5xl px-4
   sm:px-6 lg:px-8 py-12`; the header row stacks (`flex-col-reverse` →
   `sm:flex-row justify-between`); the two section cards are `grid
   grid-cols-1 lg:grid-cols-2` (side-by-side on desktop, D112B-1); the
   meeting form fields and list rows stack below `sm` (DoD 7).

## Technical notes

### Decisions

**UI/UX — `ui-refiner` pass, 2026-10-23** (settled with the user; resolves
the six open gaps recorded in the 2026-10-23 planning ticket):

- **D112B-1 (desktop layout):** the two section cards sit side-by-side on
  `lg` (`grid grid-cols-1 lg:grid-cols-2`), stacked below; the header card
  spans full width above them. *(AC 6)*
- **D112B-2 (description collapse):** clamped to 3 lines (`line-clamp-3` —
  Tailwind core); the **Show more**/**Show less** toggle appears only when the
  text actually overflows the clamp (measured `scrollHeight > clientHeight`) —
  short descriptions never show a toggle. *(AC 2)*
- **D112B-3 (meetings form placement):** add and edit both open the
  `MeetingForm` **dialog** (not an inline form) — the `CourseForm` pattern:
  focus trap, Escape closes, focus returns to the trigger. *(AC 3)*
- **D112B-4 (badge styling):** status pills — PENDING slate / IN_PROGRESS blue
  / SUBMITTED violet / COMPLETED green / GRADED teal; priority pills — LOW
  slate / MEDIUM amber / HIGH orange / URGENT red; text always paired with
  color (DoD 6). *(AC 4)*
- **D112B-5 (archived presentation):** a full-width **Archived** banner strip
  above the header card (text-only) — no duplicate badge inside the header;
  the page remains fully accessible (AC-E02-05). *(AC 2)*
- **D112B-6 (list row → link):** the course **name** becomes a `Link` to
  `/courses/:id` (accessible name = the course name); the non-interactive row
  area also navigates on mouse click (the row itself is not focusable and
  carries no role — keyboard/AT users use the name link); the
  Edit/Archive/Restore buttons `stopPropagation`. *(AC 1)*
- **D112B-7 (meeting row display):** "Mon 09:00–10:30" — short weekday
  (Sun–Sat) from `dayOfWeek` 0–6, en dash, 24-hour `HH:mm` exactly as stored —
  recurring times of day, no time-zone conversion (D112-1). *(AC 3)*
- **D112B-8 (meeting form errors):** 400 → per field via `getFieldError`
  (dayOfWeek/startTime/endTime); 409 (slot taken) → form-level alert with the
  API message; 404 → form-level alert + **Back to courses** link; any other
  failure → toast the sanitized message, form values preserved (resubmit is
  the retry). *(AC 3)*
- **D112B-9 (delete confirmation + control labels):** a lightweight
  `DeleteMeetingDialog` — the `DeleteSemesterDialog` pattern (Cancel focused
  first, danger Delete); copy: "Delete Mon 09:00–10:30?" + "This removes the
  meeting from the course's weekly schedule."; row Edit (outline sm) / Delete
  (ghost sm) with per-meeting `aria-label`s. *(AC 3)*
- **D112B-10 (post-mutation behavior):** on success the dialog closes, the
  meetings list refetches, and the page announces through the
  `role="status"` live region ("Meeting added." / "Meeting updated." /
  "Meeting deleted."). *(AC 3)*
- **D112B-11 (header hierarchy):** header card: color chip (aria-hidden) +
  `h1` name + `code` (monospace, muted) on one line; a meta line with
  instructor (muted "—" when null) · semester name (muted "No semester" when
  null) · credits (omitted when null); actions on the right — **Edit**
  (outline) + **Archive/Restore** (secondary, reusing `ArchiveCourseDialog`)
  with per-course `aria-label`s; while loading/error the `h1` is the generic
  "Course". *(AC 2)*

**Technical — this pass, 2026-10-23** (grounded in the post-SP-112A code):

- **D112B-12 (`getCourse` return type):** `getCourse`'s return type changes
  from `CourseWithSemester` (12 keys) to the 14-key detail shape —
  `CourseWithSemester` + `meetings: ClassMeeting[]` +
  `assignments: CourseAssignment[]` (the [shared
  contract](./README.md#shared-api-contract)). **Safe:** verified 2026-10-23
  that `getCourse` has **no production callers** — its only references are
  `courseApi.test.ts` (extended here) and `vi.fn()` mocks in
  `CoursesPage.test.tsx` / `ArchiveCourseDialog.test.tsx` /
  `CourseForm.test.tsx` that do not assert the shape. The
  `CourseWithSemester` interface itself is unchanged (still the list/create/
  patch return).
- **D112B-13 (meeting API functions):** the four meeting functions —
  `listMeetings(courseId)`, `createMeeting(courseId, data)`,
  `updateMeeting(courseId, meetingId, patch)`, `deleteMeeting(courseId,
  meetingId)` — are added to `entities/course/api/courseApi.ts` (the entity's
  data home — D107-9; plain-axios `httpClient`, no RTK Query) on the shared
  contract's nested paths. The detail page's meetings **list** comes from
  `getCourse`'s projection (one fetch drives the header + both sections);
  after a meeting mutation the page refetches `getCourse` (D112B-10).
  `create`/`update`/`delete` are called directly by the form/dialog;
  `listMeetings` exists for the contract surface + SP-112C's e2e spec.
- **D112B-14 (types):** `shared/types/academic.ts` gains `ClassMeeting` —
  `{ id, dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm", createdAt,
  updatedAt }` (the canonical 6-key `toMeetingResponse` shape;
  `userId`/`courseId` are never exposed — D112-2) and
  `CourseAssignment = Omit<Assignment, 'course'>` (the 10-key read-only
  projection — the existing `Assignment` type is referenced only by `Task`,
  so it stays untouched).
- **D112B-15 (test plan):** page/section tests mock the entity API
  (`vi.mock('@/entities/course/api/courseApi')` — the `CoursesPage.test.tsx`
  pattern) and render through the `Providers` test helper (store +
  `MemoryRouter` with `initialEntries`); `MeetingForm` /
  `DeleteMeetingDialog` get their own component tests (validation + 400/409/
  404 branches, focus trap/return, Escape); `CoursesPage`'s tests extend for
  the row links; `courseApi.test.ts` gains the four meeting functions + the
  14-key `getCourse` shape. Interactions use the `test/user.ts` wrapper
  (userEvent in `act`).
- **D112B-16 (due-date formatting):** assignment due dates render through the
  shared `shared/lib/datetime.ts` — `formatDate(new Date(dueDate),
  getBrowserTimeZone())` → "Oct 12, 2026" (medium date, the student's browser
  time zone, `en-US` default locale) — no new formatting code; date semantics
  stay EP03's (D112-3).

### Inspected (2026-10-23, post-SP-112A)

- `apps/web/src/entities/course/api/courseApi.ts` — `getCourse` returns
  `CourseWithSemester`; no meeting functions yet; no production callers of
  `getCourse`.
- `apps/web/src/shared/types/academic.ts` — `Assignment` self-contained
  (referenced only by `Task`); no `ClassMeeting` type yet.
- `apps/api/src/modules/courses/courses-meetings.service.ts` —
  `toMeetingResponse` (canonical 6-key shape); 400/404/409 behavior per the
  shared contract.
- `apps/api/src/modules/courses/courses.service.ts` — `get()` returns the
  14-key detail (12 + `meetings` + `assignments`) with the D112-3 ordering.
- `apps/web/src/features/courses/ui/` — `CourseForm.tsx` (RHF + zod dialog
  pattern), `ArchiveCourseDialog.tsx` (focus-trap `FOCUSABLE_SELECTOR`
  pattern), `CourseList.tsx` (row markup — the row-link change lands here).
- `apps/web/src/shared/lib/{errors,datetime}.ts` — `getFieldError` /
  `apiErrorMessage` / `extractApiError`; `formatDate` /
  `getBrowserTimeZone`.
- `apps/web/src/test/providers.tsx` — the `Providers` helper (store +
  `MemoryRouter` with `initialEntries`).
- Tailwind 3.3.6 — `line-clamp-3` is core; the config uses `extend` (default
  palette intact).

## Relevant files

**Change:**

- `apps/web/src/entities/course/api/courseApi.ts` — `getCourse` → 14-key
  detail shape (D112B-12); add the four meeting functions (D112B-13)
- `apps/web/src/entities/course/api/courseApi.test.ts` — meeting function
  tests + the 14-key `getCourse` shape test
- `apps/web/src/shared/types/academic.ts` — `ClassMeeting` +
  `CourseAssignment` (D112B-14)
- `apps/web/src/features/courses/ui/CourseList.tsx` — the row's name becomes
  a `Link` to `/courses/:id`; row click navigates; action buttons
  `stopPropagation` (D112B-6)
- `apps/web/src/pages/courses/ui/CoursesPage.tsx` — tests extended for the
  row links (the row markup itself lives in `CourseList`)
- `apps/web/src/app/App.tsx` — the `/courses/:id` route inside
  `ProtectedRoute`, beside `/courses`

**Create:**

- `apps/web/src/features/courses/ui/MeetingsSection.tsx` (+ test) — the
  meetings list + **Add meeting** button; hosts `MeetingForm` /
  `DeleteMeetingDialog`
- `apps/web/src/features/courses/ui/MeetingForm.tsx` (+ test) — the add/edit
  dialog (RHF + zod, the `CourseForm` pattern)
- `apps/web/src/features/courses/ui/DeleteMeetingDialog.tsx` (+ test) — the
  delete confirmation dialog (the `DeleteSemesterDialog` pattern)
- `apps/web/src/features/courses/ui/AssignmentsSection.tsx` (+ test) — the
  read-only assignments list
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` (+ test) — the route
  screen (header + both sections + page states + live region)

## Tests

Component (mirror the `features/semesters` + SP-111B test patterns):

- `CourseDetailPage`: renders the header fields (instructor "—" fallback,
  "No semester" fallback, credits omitted when null, description clamp +
  Show more/less only on overflow, Archived banner); 404 → the error card +
  Back to courses; other fetch failure → alert + Try again; edit opens the
  pre-filled `CourseForm` and refetches on success; archive/restore wired;
  the loading state; the live-region announcements; a failed meetings
  re-fetch toasts and keeps the last list
- `MeetingForm`: the dialog opens/closes (focus trap, Escape, focus return);
  day select Sun–Sat; `Input type="time"`; end-after-start inline validation;
  per-field 400 via `getFieldError`; 409 form-level alert; 404 form-level
  alert + Back to courses; other failure toasts with values preserved
- `DeleteMeetingDialog`: the copy; Cancel focused first; danger Delete;
  success closes + announces
- `AssignmentsSection`: renders the 10-key projection (title / due via
  `formatDate` + `getBrowserTimeZone` / status + priority badge palettes) in
  API order (no client re-sort); no interactive management controls; the
  empty state
- `CoursesPage` (extended): the name is a `Link` to `/courses/:id`; row click
  navigates; Edit/Archive buttons do not navigate (`stopPropagation`)
- `courseApi.test.ts` (extended): the four meeting functions hit the nested
  paths; `getCourse` returns the 14-key detail shape

## Definition of Done

1. ACs 1–6 pass. 2. Client-side validation mirrors the backend (DoD 2).
3. N/A — consumes principal-scoped routes (A). 4. Field-level 400 / 409 / 404
rendered actionably. 5. Page + section states per AC 5. 6. Keyboard
accessibility per AC 6. 7. Responsive per AC 6. 8. Component tests above.
9. N/A — no API change (consumes A's contract). 10. Via SP-112C sign-off +
the combined parent review.

## Sizing

- **Outcome:** the course detail screen is complete — course info, a
  manageable recurring weekly schedule, and the read-only assignments view —
  and the course list links into it.
- **Time estimate:** ~2.5–3 h — one page + two sections + four components on
  well-trodden patterns (the semesters feature + SP-111B `features/courses`
  are the templates; the two dialogs are mechanical pattern copies); the
  non-mechanical parts are the meeting time/weekday form (validation + 409
  handling) and the section state matrix. One cohesive child: the detail
  page's sections are one screen's behavior and must not be split.
- **Files:** per the relevant-files list above — `courseApi.ts` (change) +
  its test, `academic.ts` (change), `features/courses/ui/{MeetingsSection,
  MeetingForm, DeleteMeetingDialog, AssignmentsSection}.tsx` (**new**) +
  tests, `pages/courses/ui/CourseDetailPage.tsx` (**new**) + test,
  `CourseList.tsx` + `CoursesPage.tsx` (row links — change), `App.tsx`
  (route).
- **Start context:** this ticket, decisions D112-1…6 (parent README) +
  D112B-1…16 (above), the [shared
  API contract](./README.md#shared-api-contract), the files above (esp. the
  `features/semesters` + SP-111B `features/courses` templates),
  `shared/api/httpClient.ts`, `shared/lib/{errors,datetime}.ts`,
  `test/providers.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test` all green;
  `pnpm --filter @studypilot/web typecheck` + `lint` + `build` clean.
- **Dependencies / exclusions:** SP-111B + SP-112A (done at implementation
  time), SP-109 (done). Excluded: integration sign-off (SP-112C), assignment
  management (EP03), calendar display of meetings (EP04). Every excluded
  requirement has an owner in the [README traceability
  table](./README.md#source-requirements-and-test-traceability).

## Out of scope

- Integration sign-off / e2e (SP-112C owns it; `listMeetings` is provided
  for its spec).
- Assignment management UI (EP03 — the section is read-only; EP03 populates
  the same projection, no EP02 rework, D112-3).
- Calendar display of meetings (EP04 consumes the same `ClassMeeting` shape,
  D112-1).
- Optimistic updates (a plain refetch is the MVP behavior, D112B-10).
