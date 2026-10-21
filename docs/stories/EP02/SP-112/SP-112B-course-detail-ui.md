# SP-112B: Course Detail UI (Meetings + Assignments)

**Story ID:** SP-112B
**Parent:** [SP-112](./SP-112-class-meetings-and-course-detail.md)
**Epic:** [EP02: Semester & Course Management](../../../epics/EP02-semester-and-course-management.md) (Jira STUDY-18)
**Milestone:** M1
**Layer:** Frontend
**Status:** Queued (planned 2026-10-21)
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
   `pages/courses/ui/CourseDetailPage.tsx`; the SP-111B list rows become links
   to their course's detail page (row click → detail; the edit/archive actions
   stay available). A missing/foreign course id (uniform 404 from the API)
   renders an error state with a back-to-courses action — no crash, no
   existence hint. *(AC-E02-06, D112-5)*
2. **Course header:** color chip, `code` (monospace), `name`, instructor
   (muted "—" when null), semester (or "No semester"), credits, description
   (collapsed when long); **Edit** opens the SP-111B `CourseForm` (same
   dialog, pre-filled); **Archive/Restore** reuses the SP-111B action. An
   archived course shows an **Archived** banner — the page remains fully
   accessible (AC-E02-05). *(AC-E02-03/05)*
3. **Meetings section (AC-E02-04):** lists the course's meetings as
   "Weekday HH:mm–HH:mm" rows (e.g. "Mon 09:00–10:30"), ordered
   day-of-week then start time, each with edit + delete actions. An **Add
   meeting** form offers: weekday (select, Sun–Sat), start time, end time
   (native time inputs, `HH:mm`). Client-side rules mirror the backend (DoD 2):
   end must be after start (same day) — an inline message when violated.
   Backend 400 field errors render per-field; 409 (slot already taken) and 404
   render as actionable messages. Delete uses a lightweight confirmation
   dialog. Empty state: "No meetings yet — add the first one." *(AC-E02-04,
   DoD 2/4/5/8)*
4. **Assignments section (AC-E02-06, D112-6):** read-only list of the
   course's assignments — title, due date, status badge, priority — in API
   order. **No management controls** (EP03 owns those). Empty state: "No
   assignments yet." (EP03 will populate this section through the same
   projection — no EP02 rework.) *(AC-E02-06, DoD 5)*
5. **States:** the page shows loading, an error + retry for the course fetch,
   and per-section loading/empty states for meetings and assignments (DoD 5).
6. **Accessibility:** sections have headings; the weekday select, time inputs,
   edit/delete/archive controls, and dialogs are fully keyboard-operable with
   focus trap/return; badges pair text with color (DoD 6). **Responsive:**
   stacked single-column on mobile, header + two sections side-by-side or
   stacked on desktop (DoD 7).

## Tests

Component (mirror the `features/semesters` test patterns):

- `CourseDetailPage`: renders header fields (incl. instructor "—" fallback,
  "No semester" fallback, Archived banner); 404 → error state + back action;
  edit opens the pre-filled form; archive/restore wired
- `MeetingsSection`: rows ordered weekday/start; add-form validation (end
  after start; each 400 field; 409 slot-taken message); edit/delete flows;
  empty state
- `AssignmentsSection`: renders the projection (title/due/status/priority);
  no interactive management controls; empty state
- `CoursesPage` (SP-111B file, **extended**): rows link to `/courses/:id`

## Technical notes

- **Inspected (2026-10-21):** `apps/web/src/features/semesters/ui/*` +
  `pages/semesters/ui/SemestersPage.tsx` (page/section composition pattern),
  `apps/web/src/entities/course/api/courseApi.ts` (to extend with
  `listMeetings(courseId)`, `createMeeting(courseId, data)`,
  `updateMeeting(courseId, meetingId, patch)`, `deleteMeeting(courseId,
  meetingId)` + `getCourse` returning the extended detail shape — plain-axios
  pattern, no RTK Query), `shared/types/academic.ts` (add `ClassMeeting`
  type; `Assignment` type already exists), `App.tsx` (route), the SP-111B
  feature files (form/dialog to reuse).
- **Feature (`features/courses/`):** add `ui/MeetingsSection.tsx` (list +
  add/edit form + delete dialog) and `ui/AssignmentsSection.tsx` (read-only
  list); extend `CourseDetailPage` in `pages/courses/ui/`.
- **Weekday labels:** Sun–Sat from `dayOfWeek` 0–6 (matches the API
  convention, D112-1); display as short names.
- **States:** section-level loading/empty/error; a meeting mutation refetches
  the meetings list (optimistic updates optional).

## Definition of Done

1. ACs 1–6 pass. 2. Client-side validation mirrors the backend (DoD 2).
3. N/A — consumes principal-scoped routes (A). 4. Field-level 400 / 409 / 404
rendered actionably. 5. Page + section states per AC 5. 6. Keyboard
accessibility per AC 6. 7. Responsive per AC 6. 8. Component tests above.
9. N/A — no API change (consumes A's contract). 10. Via SP-112C sign-off +
the combined parent review.

## Sizing

- **Outcome:** the course detail screen is complete — course info, a manageable
  recurring weekly schedule, and the read-only assignments view — and the
  course list links into it.
- **Time estimate:** ~2.5–3 h — one page + two sections + entity API
  extension on well-trodden patterns (the semesters feature is the template);
  the non-mechanical parts are the meeting time/weekday form (validation +
  409 handling) and the section state matrix. One cohesive child: the detail
  page's sections are one screen's behavior and must not be split.
- **Files:** `apps/web/src/entities/course/api/courseApi.ts` (change) + its
  test, `apps/web/src/shared/types/academic.ts` (change — `ClassMeeting`),
  `apps/web/src/features/courses/ui/{MeetingsSection,AssignmentsSection}.tsx`
  (**new**) + tests, `apps/web/src/pages/courses/ui/CourseDetailPage.tsx`
  (**new**) + test, `CoursesPage.tsx` (row links — change), `App.tsx` (route).
- **Start context:** this ticket, decisions D112-1…6, the
  [shared API contract](./README.md#shared-api-contract), the files above
  (esp. the `features/semesters` + SP-111B `features/courses` templates),
  `shared/api/httpClient.ts`.
- **Verification:** `pnpm --filter @studypilot/web test` all green;
  `pnpm --filter @studypilot/web typecheck` + `lint` + `build` clean.
- **Dependencies / exclusions:** SP-111B + SP-112A (done at implementation
  time), SP-109 (done). Excluded: integration sign-off (C), assignment
  management (EP03), calendar display of meetings (EP04). Every excluded
  requirement has an owner in the
  [README traceability table](./README.md#source-requirements-and-test-traceability).
