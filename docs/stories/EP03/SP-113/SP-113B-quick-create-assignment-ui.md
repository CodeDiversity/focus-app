# SP-113B: Quick-Create Assignment UI (course detail page)

**Story ID:** SP-113B
**Parent:** [SP-113](./SP-113-quick-assignment-creation.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** **Needs refinement** — UI/UX gaps below recorded 2026-10-24 for
the `ui-refiner` pass; not ready to code until it lands (planner assessment,
per the SP-112B precedent)
**Dependencies:** SP-113A implemented (contract); SP-112B implemented
(satisfied 2026-10-23 — the `AssignmentsSection` this child extends)
**Jira key:** Pending creation

## Summary

Give the course detail page its quick-assignment-creation flow: a "New
assignment" affordance on the (currently read-only) assignments section, a
short form (title + optional due date, estimated duration, priority), and the
row appearing in the section after the page's background refetch.

## Description

As a student viewing a course, I can add an assignment in seconds — the course
is already the context — and see it appear in the assignments list with its
due date and priority.

## Acceptance criteria

1. A **"New assignment"** affordance on the course detail page's assignments
   section (placement per the ui-refiner decision) opens the quick-create
   form; the course is implicit — `courseId` comes from the page route, never
   a form field. *(AC-E03-01, DoD 5/6)*
2. The form fields (D113-5): **title** (required), **due date** (optional
   date input), **estimated duration** (optional, hours), **priority**
   (optional, default Medium). Client-side validation mirrors the API rules
   (non-whitespace title ≤ 200; valid date; `0 < h ≤ 1000`; enum priority)
   with field-level error display from the API's 400 `errors` map.
   *(AC-E03-02, DoD 2/4/8)*
3. Submit calls `POST /assignments` (new `entities/assignment/api/assignmentApi.ts`,
   the plain-axios `httpClient` pattern — D113-4) and shows a saving state
   (button disabled/indeterminate; no double-submit). Success → the page's
   existing background `getCourse` refetch (D112B-10 pattern — the section
   gains an `onAssignmentChanged` callback) so the new row renders from the
   projection; success feedback per the ui-refiner decision (toast vs inline).
   *(AC-E03-01, DoD 1/5/8)*
4. Failure states: field-level 400s under the inputs; a form-level alert for
   a course-level 404 (the course vanished mid-edit); network/5xx → toast
   (the `<Toaster />` is mounted — F-112B-1). The section's empty state gains
   the create CTA per the ui-refiner decision. *(DoD 4/5/8)*
5. The section renders a **null `dueDate`** (D113-1): the
   `Assignment`/`CourseAssignment` types widen to `dueDate: string | null`
   and the row shows the ui-refiner-approved treatment; the SP-112
   nulls-last ordering is preserved. *(AC-E03-02, DoD 5/8)*
6. Keyboard accessible (DoD 6: focus management for the form/dialog, Escape
   to close, labels on every field) and responsive (DoD 7: the form works at
   mobile widths within the existing section layout). *(DoD 6/7)*

## UI/UX gaps — for the `ui-refiner` pass

The planner does not settle these; the `ui-refiner` decides with the user
(per the SP-112B precedent, D112B-*):

1. **Form presentation:** inline expand in the section vs dialog vs side
   panel — the page already uses a dialog for edit/archive
   (`CourseForm`/`ArchiveCourseDialog`), but a 4-field quick-create may not
   need one.
2. **Affordance placement:** section-header button vs empty-state CTA vs both;
   the empty state is currently "No assignments yet." with no CTA (SP-112B) —
   does the CTA replace or augment it?
3. **Field order + presentation:** title first; due date as a date picker
   (the `datetime` helpers exist); estimated duration as a number input with
   an "h" suffix?; priority as a select or segmented control (the badge
   palette exists for display).
4. **Success feedback:** toast (the meetings pattern: "Meeting added.") vs
   inline row highlight; does the new row need a visible "new" cue after the
   refetch?
5. **Null due date display:** "No due date" text vs omitting the due line;
   ordering is already nulls-last (D112-3).
6. **Copy:** button/heading/empty-state/error strings.

## Tests

Component — `apps/web/src/features/courses/ui/` (new
`AssignmentForm.test.tsx`; updated `AssignmentsSection.test.tsx`):

- form: renders the four fields with correct labels/defaults (priority
  Medium); title required (submit blocked + field error on whitespace);
  client-side 400 mapping renders under the right field; saving state
  disables submit; Escape/focus behavior per the ui-refiner decision
- section: null `dueDate` renders the ui-refiner-approved treatment; the new
  row appears after the data update; the empty-state CTA (per the decision)
  opens the form
- a11y: keyboard-only completion of the create flow; labels/announcements

## Technical notes

- **Inspected (2026-10-24):** `apps/web/src/pages/courses/ui/CourseDetailPage.tsx`
  (single `getCourse` fetch D112B-13; `onMeetingChanged` → background refetch
  D112B-10; the section grid), `features/courses/ui/AssignmentsSection.tsx`
  (read-only; `STATUS_STYLES`/`PRIORITY_STYLES` badge palettes; "No
  assignments yet." empty state), `entities/course/api/courseApi.ts`
  (plain-axios `@/shared/api/httpClient` pattern; `CourseDetail.assignments:
  CourseAssignment[]`), `shared/types/academic.ts` (`Assignment.dueDate:
  string` — widens to `string | null`; the full type is referenced by `Task`
  per the file comment — typecheck catches any consumer assuming non-null),
  `shared/lib/datetime.ts` (`formatDate`/`getBrowserTimeZone`), `main.tsx`
  (`<Toaster />` — F-112B-1).
- **New:** `entities/assignment/api/assignmentApi.ts`
  (`createAssignment` + `CreateAssignmentRequest`; typed against the
  contract) + `assignmentApi.test.ts`. **New:**
  `features/courses/ui/AssignmentForm.tsx` (D113-4: colocated with the
  section — the FSD rule forbids a `features/courses` → `features/assignments`
  lateral import). **Change:** `AssignmentsSection.tsx` (affordance + null
  due date + CTA per the ui-refiner decisions), `CourseDetailPage.tsx` (wire
  the form + `onAssignmentChanged` → the existing refetch handler),
  `shared/types/academic.ts` (`dueDate: string | null`).
- The form mirrors the API field rules (D113-5) — client validation is UX;
  the backend stays authoritative.

## Definition of Done

1. ACs 1–6 pass. 2. Client-side validation mirroring the API; actionable
field errors. 3. N/A — the data is the page's already-scoped fetch. 4.
Field/form/network failure states all surface actionable feedback. 5.
Loading/empty/error states incl. the null due date. 6. Keyboard accessibility
per AC 6. 7. Responsive per AC 6. 8. Component tests above. 9. N/A — no
API/migration change (the contract is A's). 10. Via SP-113C sign-off + the
combined parent review.

## Sizing

- **Outcome:** the quick-create flow works on the course detail page — the
  epic's "adding an assignment quick" requirement, end to end in the UI.
- **Time estimate:** ~2.5 h — one small entity API, one form, the
  section/page/type changes; the non-mechanical parts are the ui-refiner
  decisions' implementation, the null-due-date treatment, and the
  a11y/responsive pass.
- **Files:** `apps/web/src/entities/assignment/api/assignmentApi.ts` (+ test,
  **new**), `apps/web/src/features/courses/ui/AssignmentForm.tsx` (**new**) +
  `AssignmentForm.test.tsx` (**new**), `AssignmentsSection.tsx` (change) +
  test (change), `pages/courses/ui/CourseDetailPage.tsx` (change) + test
  (change), `shared/types/academic.ts` (change).
- **Start context:** this ticket (incl. the ui-refiner decisions), decisions
  D113-1…6, the [shared API contract](./README.md#shared-api-contract), the
  files above, the SP-112B ticket (D112B-4/10/13/16 — the section's existing
  conventions).
- **Verification:** `pnpm --filter @studypilot/web test` all green;
  `pnpm --filter @studypilot/web typecheck` clean; lint clean.
- **Dependencies / exclusions:** SP-113A (contract), SP-112B (done).
  Excluded: edit/delete UI (story 2), `type` field UI (story 3), status
  controls (story 5), the standalone assignments list page (stories 6/7).
  Every excluded requirement has an owner in the
  [EP03 README traceability](../README.md).
