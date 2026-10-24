# SP-113B: Quick-Create Assignment UI (course detail page)

**Story ID:** SP-113B
**Parent:** [SP-113](./SP-113-quick-assignment-creation.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Frontend
**Status:** **Implemented — awaiting parent review** 2026-10-24.
[Implementation](./artifacts/SP-113B/implementation.md) ·
[checkpoint](./artifacts/SP-113B/checkpoint.md). Combined SP-113 review follows C.
**Refined:** 2026-10-24
**Dependencies:** SP-113A implemented (contract); SP-112B implemented
(satisfied 2026-10-23 — the `AssignmentsSection` this child extends)
**Jira key:** Pending creation

## Summary

Give the course detail page its quick-assignment-creation flow: an "Add
assignment" affordance on the (currently read-only) assignments section, a
short dialog form (title + optional due date, estimated duration, priority),
and the row appearing in the section after the page's background refetch.

## Description

As a student viewing a course, I can add an assignment in seconds — the course
is already the context — and see it appear in the assignments list with its
due date and priority.

## Acceptance criteria

1. **Affordance (D113B-2):** the assignments section gets an **Add
   assignment** button (primary, `size="sm"`) on the section header row —
   mirroring the sibling Meetings section's "Add meeting" — and the empty
   state becomes "No assignments yet." + an **Add your first assignment** CTA
   below it (the meetings precedent: the text is kept, the CTA augments it).
   Both open the quick-create form; the course is implicit — `courseId` comes
   from the page route, never a form field. *(AC-E03-01, DoD 5/6)*
2. **Form (D113B-1/3):** the form is a **dialog** (`AssignmentForm`, the
   `MeetingForm` pattern: `role="dialog"` + `aria-modal`, focus trap, Escape
   closes, focus returns to the trigger, `w-full max-w-md max-h-[90vh]
   overflow-y-auto`). Fields in order: **title** (`Input`, required,
   placeholder "Problem Set 4") → **due date** (`Input type="date"`,
   optional) + **estimated duration** (`Input type="number"`, label "Estimated
   duration (hours)", optional) side by side on `sm`+ → **priority**
   (`Select`, optional, defaults to Medium). Client-side validation mirrors
   the API rules (D113-5): title non-whitespace ≤ 200; due date — the date
   input can only yield a valid date or blank (past dates accepted, D113-5);
   `0 < h ≤ 1000`; priority constrained to the enum. The API's 400 `errors`
   map renders under the matching fields via `getFieldError`. *(AC-E03-02,
   DoD 2/4/8)*
3. **Submit + success (D113B-4):** submit calls `POST /assignments` (new
   `entities/assignment/api/assignmentApi.ts`, the plain-axios `httpClient`
   pattern — D113-4) with `courseId` from the route. While in flight the
   submit button is `isLoading` (disabled — no double-submit) and the fields
   are disabled. Success → the dialog closes, the page announces
   **"Assignment added."** through its existing `role="status"` live region,
   and runs the existing background `getCourse` refetch (the D112B-10 pattern
   — the section gains an `onAssignmentChanged` callback) so the new row
   renders from the projection at its API-ordered position. No toast (toasts
   in this app are reserved for failures) and no row highlight. *(AC-E03-01,
   DoD 1/5/8)*
4. **Failure states (D113B-5):** 400 → field-level errors under the matching
   inputs (title/dueDate/estimatedHours/priority); a 400 whose `errors` map
   names no form field → toast the sanitized `apiErrorMessage`. 404 (the
   course vanished mid-edit — the uniform "Resource not found") → form-level
   alert: the API message + "— this course may no longer exist." + a
   **Back to courses** link (the `MeetingForm` pattern). Network/5xx → toast
   "We could not save the assignment. Try again." (the `<Toaster />` is
   mounted — F-112B-1) with the form values preserved (resubmit is the retry).
   *(DoD 4/5/8)*
5. **Null due date (D113B-6):** the `Assignment`/`CourseAssignment` types
   widen to `dueDate: string | null` (D113-1) and a row with a null due date
   renders a muted **"No due date"** due line (the course header's "No
   semester" treatment) instead of the "Due Oct 12, 2026" line; the SP-112
   nulls-last ordering is preserved. *(AC-E03-02, DoD 5/8)*
6. **Keyboard + responsive (DoD 6/7):** the dialog is fully keyboard-operable
   (focus trap, Escape closes, focus returns to the trigger, a label on every
   field, `aria-invalid`/`aria-describedby` on errors — the shared `Input`/
   `Select` components wire these from their `error`/`hint` props); the form
   works at mobile widths (fields stack below `sm`; the dialog is `w-full
   max-w-md`); the section header row and empty-state CTA follow the existing
   responsive section layout. *(DoD 6/7)*

## Tests

Component — `apps/web/src/features/courses/ui/` (vitest + Testing Library;
interactions through the `test/user.ts` wrapper; page-level renders through
the `test/providers.tsx` `Providers` helper with `vi.mock` of the entity API
— the D112B-15 pattern):

- `AssignmentForm.test.tsx` (**new**):
  - renders the four fields with the correct labels; priority defaults to
    Medium; on open the title input receives focus, Tab cycles within the
    dialog (focus trap), Escape closes, and focus returns to the trigger
  - title: submit with a whitespace-only title → blocked + "Title is
    required" under the field; a 201-char title → "Title must be 200
    characters or fewer"
  - estimated duration: `0` / `-3` / `100000` → "Estimated duration must be
    greater than 0 and at most 1000 hours"; blank is accepted
  - a past due date is accepted (no client error — D113-5)
  - a 400 `errors` map renders under the matching fields (via
    `getFieldError`); a 400 naming no form field toasts
  - a 404 renders the form-level alert + **Back to courses** link
  - a network failure toasts "We could not save the assignment. Try again."
    with the form values preserved and the submit re-enabled
  - while in flight: submit `isLoading` (disabled) and the fields disabled
  - the date-only input converts to a local-midnight ISO-8601 `dueDate` in
    the request body (D113B-3); a blank date omits the field
- `AssignmentsSection.test.tsx` (updated):
  - the header row offers the **Add assignment** button (primary, `size="sm"`)
    and it opens the form; the list rows themselves carry **no** per-row
    controls (the old "no buttons at all" assertion is scoped to the rows —
    edit/delete belong to story 2)
  - the empty state renders "No assignments yet." **plus** the **Add your
    first assignment** CTA (the old "no CTA" assertion is inverted) and the
    CTA opens the form
  - a null `dueDate` renders the muted "No due date" line; a non-null date
    still renders "Due Oct 12, 2026" (the existing `formatDate` +
    `getBrowserTimeZone` assertion); the SP-112 nulls-last API order is
    preserved (no client re-sort)
  - a new row appears when the `assignments` prop updates (the refetch result)
- `CourseDetailPage` test (updated): the section receives `courseId` +
  `onAssignmentChanged`; on create success the page announces "Assignment
  added." through the live region and triggers the background `getCourse`
  refetch (the `handleMeetingChanged` pattern)
- `assignmentApi.test.ts` (**new**, `apps/web/src/entities/assignment/api/`
  — the `courseApi.test.ts` adapter pattern): `createAssignment` posts to
  `POST /assignments`; blank optionals are omitted from the body (not sent as
  null/empty); the 10-key 201 shape is returned

## Technical notes

### Decisions

**UI/UX — `ui-refiner` pass, 2026-10-24** (settled with the user; resolves
the six open gaps recorded in the 2026-10-24 planning ticket):

- **D113B-1 (form presentation):** a **dialog** — the `MeetingForm`/
  `CourseForm` pattern (RHF + zod, `role="dialog"` + `aria-modal`, focus
  trap, Escape closes, focus returns to the trigger; `w-full max-w-md
  max-h-[90vh] overflow-y-auto`). Every other mutation on this page is a
  dialog, and the section cards are half-width on `lg` (D112B-1) — cramped
  for a 4-field inline form. *(AC 1/2, DoD 6/7)*
- **D113B-2 (affordance placement):** **both** — an **Add assignment** button
  (primary, `size="sm"`) on the section header row (always visible) + the
  empty state keeps "No assignments yet." and gains an **Add your first
  assignment** CTA below it. Mirrors the sibling Meetings section exactly.
  *(AC 1, DoD 5)*
- **D113B-3 (field order + presentation):** title (full-width `Input`,
  placeholder "Problem Set 4") → due date (`Input type="date"`) + estimated
  duration (`Input type="number"`, label "Estimated duration (hours)", hint
  "Optional") in a 2-column grid on `sm`+ → priority (full-width `Select`,
  defaults to Medium, hint "Optional — defaults to Medium"). **Date-only
  picker:** the UI renders date-only ("Due Oct 12, 2026"), so a time picker
  would be invisible; the form converts the picked `YYYY-MM-DD` to
  **local-midnight ISO-8601** — build a local `Date` from the date parts
  (`new Date(y, m - 1, d)`) then `toISOString()`, never `new Date(
  'YYYY-MM-DD')` (that parses as UTC midnight) — so the due line round-trips
  exactly for the creating student (the data is scoped per student). No "h"
  suffix on the duration input (the shared `Input` has no text-suffix slot;
  the CourseForm credits field is the label+hint precedent). The due date
  hint is "Optional — leave blank for no due date." *(AC 2, DoD 2/7)*
- **D113B-4 (success feedback):** **live region only** — "Assignment added."
  through the page's existing `role="status"` region + the background refetch
  (the D112B-10 pattern). No toast (toasts in this app mean failure) and no
  row highlight (no precedent; the row lands at its API-ordered position,
  which is not necessarily the top). *(AC 3, DoD 5/6)*
- **D113B-5 (failure presentation):** 400 → per field via `getFieldError`
  (title/dueDate/estimatedHours/priority); a 400 naming no form field →
  toast the sanitized `apiErrorMessage`; 404 → form-level alert
  `${apiErrorMessage} — this course may no longer exist.` + **Back to
  courses** link (the `MeetingForm` pattern); any other failure → toast "We
  could not save the assignment. Try again.", values preserved, submit
  re-enabled. *(AC 4, DoD 4)*
- **D113B-6 (null due date display):** a row with a null due date renders a
  muted **"No due date"** due line (the course header's `text-secondary-400`
  "No semester" treatment) — the row structure stays stable (title + due line
  + badges) and the absence reads as "no deadline", not "failed to load".
  *(AC 5, DoD 5)*

**Copy** (concrete strings, the meetings/course parallel): section header
button "Add assignment"; empty state "No assignments yet." + "Add your first
assignment"; dialog heading "Add an assignment"; submit "Create assignment" /
Cancel "Cancel"; live region "Assignment added."; client field errors "Title
is required" / "Title must be 200 characters or fewer" / "Estimated duration
must be greater than 0 and at most 1000 hours".

### Inspected (2026-10-24)

- `apps/web/src/features/courses/ui/MeetingsSection.tsx` — the direct pattern
  donor: header row (`flex items-center justify-between`) with the **Add
  meeting** button (primary, `size="sm"`); empty state "No meetings yet" +
  **Add your first meeting** CTA; hosts the form + `onMeetingChanged`
  callback; per-row action buttons with `aria-label`s.
- `apps/web/src/features/courses/ui/MeetingForm.tsx` — the dialog-form
  pattern to copy: RHF + zod, `FOCUSABLE_SELECTOR` focus trap, Escape/Tab
  keydown handler attached imperatively, focus-restore on close,
  `getFieldError` 400 mapping, 404 form-level alert + Back-to-courses link,
  `isLoading` submit, `max-w-md` dialog card.
- `apps/web/src/features/courses/ui/CourseForm.tsx` — the label/hint/error
  field layout (2-column `sm` grids, hint copy "Optional (0–30)"), the
  string-`refine` number-field pattern (credits), `max-w-xl` dialog.
- `apps/web/src/features/courses/ui/{AssignmentsSection,ArchiveCourseDialog}.tsx`
  — the section being extended (badge palettes, "No assignments yet." empty
  state, `formatDate` + `getBrowserTimeZone` due line) and the
  `FOCUSABLE_SELECTOR` focus-trap precedent.
- `apps/web/src/pages/courses/ui/CourseDetailPage.tsx` — the `role="status"`
  live region + `statusMessage`, `handleMeetingChanged` (announce +
  background `load({ background: true })`), the section grid, the dialog
  hosting.
- `apps/web/src/shared/ui/{Input,Select,Button}.tsx` — `label`/`error`/
  `hint` with auto `id` + `aria-invalid`/`aria-describedby`; `Input`
  passes through `type`/`inputMode` (so `type="date"`/`"number"` work as in
  `MeetingForm`'s `type="time"`); `Button` `isLoading` + variants/sizes.
- `apps/web/src/shared/lib/errors.ts` — `extractApiError` /
  `apiErrorMessage` / `getFieldError` / `getErrorMessage` (the D112B-8
  machinery). `apps/web/src/shared/lib/datetime.ts` — `formatDate` /
  `getBrowserTimeZone` (the due line; no new formatting code).
- `apps/web/src/entities/course/api/courseApi.ts` (+ `.test.ts`) — the
  plain-axios `httpClient` pattern, the omit-when-blank body builder
  (`createCourse`), the adapter-swap test pattern for the new
  `assignmentApi.test.ts`.
- `apps/web/src/shared/types/academic.ts` — `Assignment.dueDate: string`
  widens to `string | null` (the full type is referenced by `Task` per the
  file comment — typecheck catches any consumer assuming non-null).
- `apps/web/src/test/{providers,user}.tsx` — the `Providers` render helper
  (store + `MemoryRouter`) and the `userEvent` wrapper (D112B-15).
- `apps/web/src/main.tsx` — `<Toaster />` mounted (F-112B-1).

### Implementation notes

- **New:** `entities/assignment/api/assignmentApi.ts` (`createAssignment` +
  `CreateAssignmentRequest` typed against the [shared API
  contract](./README.md#shared-api-contract); optional fields omitted when
  blank — the `createCourse` body-builder precedent) + `assignmentApi.test.ts`.
- **New:** `features/courses/ui/AssignmentForm.tsx` (D113-4: colocated with
  the section — the FSD rule forbids a `features/courses` →
  `features/assignments` lateral import) + `AssignmentForm.test.tsx`.
- **Change:** `AssignmentsSection.tsx` — gains `courseId` +
  `onAssignmentChanged` props (the `MeetingsSection` shape, minus the
  edit/delete actions); header button (D113B-2); empty-state CTA (D113B-2);
  muted "No due date" line (D113B-6); hosts the `AssignmentForm` (the
  `formState` pattern from `MeetingsSection`).
- **Change:** `pages/courses/ui/CourseDetailPage.tsx` — wire the section
  props + a `handleAssignmentAdded` (`setStatusMessage('Assignment added.')`
  + background refetch — the `handleMeetingChanged` pattern).
- **Change:** `shared/types/academic.ts` — `dueDate: string | null`.
- The form mirrors the API field rules (D113-5) — client validation is UX;
  the backend stays authoritative.

## Definition of Done

1. ACs 1–6 pass. 2. Client-side validation mirroring the API; actionable
field errors. 3. N/A — the data is the page's already-scoped fetch. 4.
Field/form/network failure states all surface actionable feedback. 5.
Loading/empty/error states incl. the empty-state CTA and the null due date.
6. Keyboard accessibility per AC 6. 7. Responsive per AC 6. 8. Component
tests above. 9. N/A — no API/migration change (the contract is A's). 10. Via
SP-113C sign-off + the combined parent review.

## Sizing

- **Outcome:** the quick-create flow works on the course detail page — the
  epic's "adding an assignment quick" requirement, end to end in the UI.
- **Time estimate:** ~2–2.5 h — one small entity API, one dialog form that
  is a near-mechanical copy of `MeetingForm` (RHF + zod, focus trap, error
  mapping), the section/page/type changes; the non-mechanical parts are the
  date-only → local-midnight ISO conversion (D113B-3) and its tests, the
  null-due-date row treatment (D113B-6), and the a11y/responsive pass.
- **Files:** `apps/web/src/entities/assignment/api/assignmentApi.ts` (+ test,
  **new**), `apps/web/src/features/courses/ui/AssignmentForm.tsx` (**new**) +
  `AssignmentForm.test.tsx` (**new**), `AssignmentsSection.tsx` (change) +
  test (change), `pages/courses/ui/CourseDetailPage.tsx` (change) + test
  (change), `shared/types/academic.ts` (change).
- **Start context:** this ticket (incl. decisions D113B-1…6 + the copy
  block), decisions D113-1…6, the [shared API
  contract](./README.md#shared-api-contract), the files above (esp.
  `MeetingForm.tsx` + `MeetingsSection.tsx` as the pattern donors), the
  SP-112B ticket (D112B-4/8/10/13/16 — the section's existing conventions),
  `shared/api/httpClient.ts`, `shared/lib/{errors,datetime}.ts`,
  `test/{providers,user}.tsx`.
- **Verification:** `pnpm --filter @studypilot/web test` all green;
  `pnpm --filter @studypilot/web typecheck` clean; lint clean.
- **Dependencies / exclusions:** SP-113A (contract), SP-112B (done).
  Excluded: edit/delete UI (story 2), `type` field UI (story 3), status
  controls (story 5), the standalone assignments list page (stories 6/7).
  Every excluded requirement has an owner in the
  [EP03 README traceability](../README.md).
