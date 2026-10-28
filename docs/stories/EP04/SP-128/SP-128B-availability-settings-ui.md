# SP-128B: Availability Settings UI

**Story ID:** SP-128B
**Title:** Frontend — the `/availability` page: manage study windows and blocked times
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-128](./SP-128-availability-and-unavailable-blocks.md)
**Milestone:** M2
**Layer:** Frontend
**Status:** Ready — `ui-refiner` pass complete (D404-9 settled by D128B-1…13 below); not implemented.
**Dependencies:** SP-128A implemented (the API it manages).
**Jira key:** Pending creation
**Refined:** 2026-10-28

## Summary

A student opens `/availability` and sees their recurring weekly availability and blocked times grouped under weekday headings. They add a time slot (an available window or a blocked time), edit one, and remove one — each change reflected immediately from the API's state, with the field-level validation message shown next to the offending field and every action announced to assistive technology. The page follows the StudyPilot visual system (SP-126) and reuses the recurring-meeting editor's proven interaction pattern (SP-112B) with one addition: the available/blocked kind.

## Description & bounded scope

### In scope

1. **A new `/availability` route** (`apps/web/src/pages/availability/ui/AvailabilityPage.tsx`), registered in `apps/web/src/app/App.tsx` inside `ProtectedRoute`, reachable from the header nav ("Availability") and from the calendar page's existing "Manage availability" links (D404-12, D127B-8/D127B-12).
2. **The slot list** — the student's slots grouped under weekday headings (Monday → Sunday), rows in API order, each showing its "Mon 09:00–10:30"-style label and an "Available" / "Blocked" text label with a matching icon — the distinction is textual, mirroring the shipped `CalendarEventChip` vocabulary (D127B-5).
3. **Add / edit** — a dialog form for a slot's kind, day, and start/end time; the client mirrors the API's validation rules (react-hook-form + zod, the `MeetingForm` pattern) and shows the API's field-level 400 errors inline; a 409 duplicate renders a form-level alert.
4. **Delete** — a focus-trapped confirmation before removing a slot (the `DeleteSemesterDialog` / `DeleteMeetingDialog` pattern), Escape cancels, focus returns to the trigger.
5. **States** — loading ("Loading your availability…"), empty ("No availability yet" + the add CTA), and error-with-retry; an always-present `role="status"` live region announcing each successful change (the `CoursesPage` / `AssignmentsPage` pattern).
6. **Keyboard and responsive behavior** — every control reachable and operable by keyboard with visible focus; usable from 375px up.

### Out of scope

- Overlap warnings or slot conflict resolution (not in the API contract).
- One-off dated blocks (D404-5) and any bulk copy action (e.g. "copy Monday to all weekdays") — those would change the API contract and trigger a re-size.
- The visual weekly grid editor — rejected in refinement (feature `/availability` stays a CRUD list; see D128B-1).
- The calendar's rendering of availability (SP-127A/127B).
- Any new UI library or backend change.

## Source requirement references

- **Epic AC-E04-04, AC-E04-05** — ownership table in the [SP-128 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1, 5, 6, 7, 8 apply here; items 10–11 belong to the combined parent review.
- **Decisions:** D404-5 (weekly-only), D404-9 (settled here), D404-12 (its own page + nav entry), D404-10 (plain-axios entity client).

## Acceptance criteria

1. The `/availability` page lists the student's slots grouped under weekday headings (Monday → Sunday, presentation-only grouping of the API's Sunday-first order), each row showing its time range ("Mon 09:00–10:30") and its "Available" or "Blocked" text label beside a matching icon — the distinction is textual, not color-only.
2. The student can add an available window and a blocked time through the dialog form's kind control; the new slot appears in the list from the API's response without a manual reload.
3. The student can edit a slot's kind, day, or times; the updated values are shown after the API confirms them.
4. Deleting a slot asks for confirmation first, and the slot disappears once the API confirms the deletion; a cancelled confirmation sends no request.
5. A rejected save shows the API's field-level error next to the offending field (a 409 duplicate shows the API's message as a form-level alert) and keeps the student's input; nothing is written on a rejection.
6. The page renders the empty state ("No availability yet") with a working add CTA, the loading state, and the error state with a working retry.
7. Every successful add, edit, and delete is announced through the always-present `role="status"` live region.
8. All controls are keyboard-operable with visible focus and accessible names (row actions name the label they act on, e.g. "Edit Mon 09:00–10:30"); the dialog traps focus, closes on Escape, and returns focus to its trigger.
9. The layout works from 375px to desktop with consistent spacing.

## Tests to add / update

- `apps/web/src/pages/availability/ui/AvailabilityPage.test.tsx` (new)
  - Renders the slots grouped under weekday headings (Monday → Sunday) with the "Available" / "Blocked" labels.
  - Creates an available window and a blocked time through the form; the list reflects the API response.
  - Edits a slot; the updated values render.
  - Deletes a slot after confirming; a cancelled confirmation sends no request.
  - Empty state ("No availability yet" + CTA), loading state, and error-with-retry (a rejected list request then a successful one).
  - A field-level 400 shows the message next to the field and keeps the input.
  - The `role="status"` region announces the change.
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.test.tsx` (new)
  - Create mode: kind radio pair ("Available window" / "Blocked time"), the Sun–Sat day select, time inputs, create-mode default day Monday.
  - The client's validation mirrors the API's rules: an end time not strictly after the start time is caught before the request; empty times are caught.
  - A field-level 400 maps under the matching field; a 409 renders the form-level alert; a successful submit closes and calls `onSuccess`.
  - Focus trap, Escape closes, focus returns to the trigger.
- `apps/web/src/features/availability/ui/DeleteAvailabilitySlotDialog.test.tsx` (new) — focus trap, Escape cancels, focus returns to the trigger, confirm dispatches the delete, a failed delete shows the inline alert.
- `apps/web/src/features/availability/ui/slotLabel.test.ts` (new) — "Mon 09:00–10:30" from `dayOfWeek` 1 (the `meetingLabel` convention; Sunday=0 … Saturday=6).
- `apps/web/src/entities/availability/api/availabilityApi.test.ts` (new) — the client maps the payload and sends only editable fields (`dayOfWeek`, `startTime`, `endTime`, `isAvailable`).
- `apps/web/e2e/calendar.spec.ts` (SP-127B's spec, extended) — a slot created here appears on the calendar as an available window; a blocked time appears as a blocked band.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- **No availability code exists in the web app** — no `pages/availability`, `features/availability`, or `entities/availability`; `apps/web/src/app/App.tsx` has no `/availability` route; `apps/web/src/widgets/header/ui/Header.tsx` currently offers Home / Dashboard / Semesters / Courses / Assignments / Calendar / Profile. The calendar page (SP-127B, implemented) already has "Manage availability" links to `/availability`.
- **Closest interaction precedent (read end-to-end):** the recurring-meeting editor — `apps/web/src/features/courses/ui/MeetingsSection.tsx` (rows + Add/Edit/Delete + form/dialog state), `MeetingForm.tsx` (dialog; react-hook-form + zod mirroring the API's `HH:mm` and 0–6 day rules with an inline `endTime > startTime` error; a 400 `errors` map mapped via `getFieldError` under matching fields; a 409 as a form-level `role="alert"`; duplicate-submission prevention), `DeleteMeetingDialog.tsx` (focus trap, Escape cancels, focus returns to trigger), `meetingLabel.ts` ("Mon 09:00–10:30", weekday names indexed Sunday=0 … Saturday=6, D112-1).**Availability reuses this pattern; `dayOfWeek` semantics are the same model family.**
- Shared controls available: `apps/web/src/shared/ui/Button.tsx` (`variant`, `size`, `isLoading`, `leftIcon`), `Input.tsx` (with `leftIcon`, `error`), `Select.tsx` (`error`). **No shared dialog, time-picker, or weekday-picker component exists** — the slot list, form, and delete confirmation are `features/availability/ui/` components, the same as the meetings editor.
- Delete-confirmation precedent: `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (names the record, states the effect, safe action focused first).
- Client pattern: `apps/web/src/entities/course/api/courseApi.ts` — plain axios over `@/shared/api/httpClient`; types under `entities/availability/model/types.ts` (the `entities/user/model/types.ts` shape). D404-10.
- Error handling: `apps/web/src/shared/lib/errors.ts` (`getErrorMessage`, `extractApiError`, `apiErrorMessage`, `getFieldError`) — the `MeetingForm`/Assignments flow shows the API's field-level `errors` map next to the offending field.
- Live-region pattern: `apps/web/src/pages/courses/ui/CoursesPage.tsx` and `pages/assignments/ui/AssignmentsPage.tsx` — an always-present, empty-at-rest `role="status"` region; the Assignments `ACTION_SENTENCES` + refetch-prefix pattern is the model for the change announcements.
- Visual system: the redesigned Assignments and Courses pages (SP-126) — `max-w-5xl` shell, header with an action upper-right, distinct empty/no-match/error states, `h-[42px]` controls with `max-sm:min-h-[44px]`.
- FSD placement (enforced by `import/no-restricted-paths` in `apps/web/.eslintrc.cjs`): the page in `pages/availability/ui/`, the editor components in `features/availability/ui/`, the client and types in `entities/availability/`. **The label/weekday helpers are new files in `features/availability/ui/`** — no cross-feature import from `features/courses` (`meetingLabel.ts` is copied, not imported).
- The kind vocabulary is already shipped on the calendar: `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` renders `CheckCircle2` + "Available" and `Ban` + "Blocked" (D127B-5); AC-E04-08's non-color rule carries over.

### Proposed files

`apps/web/src/entities/availability/api/availabilityApi.ts` (+ `model/types.ts`, + test), `apps/web/src/features/availability/ui/{AvailabilitySlotList,AvailabilitySlotForm,DeleteAvailabilitySlotDialog,slotLabel}.tsx` (+ `slotLabel.ts`/tests), `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (+ test), `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, the calendar page's "Manage availability" links (already shipped by SP-127B — verify only), `apps/web/e2e/calendar.spec.ts` (extended).

### Decisions (ui-refiner, 2026-10-28 — D404-9 settled)

User-confirmed choices: editing model (D128B-1), the list's kind distinction (D128B-4), the form's kind control (D128B-6), and the header nav entry (D128B-11). The remaining choices below follow the established in-repo patterns; all are reversible layout/copy decisions.

- **D128B-1 — Editing model: weekday-grouped list + dialog form.** No visual weekly grid and no bulk-copy actions (both would trigger the SP-128 README's re-size/split rule and, for the grid, a read of the calendar payload). Add and Edit both open a dialog mirroring `MeetingForm`; Delete opens the confirmation. This keeps SP-128B the editor for the settled CRUD surface, ~2–2.5 requests, no split.
- **D128B-2 — Page shell (AssignmentsPage system):** `max-w-5xl` section, `aria-labelledby` heading "Availability" with subtitle "When you can study — and when you can't.", the primary "Add time slot" `Button` upper-right (full-row stacking on mobile per the header pattern).
- **D128B-3 — Grouping: one card per weekday, Monday → Sunday.** The API returns slots ordered `dayOfWeek` asc (Sunday=0 first, D112-1); the client regroups presentation-side into Monday-first sections to match the calendar's week start (D127B-2). Rows stay in API order within a group (already `startTime` asc) — no client re-sort inside a group. Each group header: full weekday name + slot count, e.g. "Monday" ("1 slot" / "2 slots" as muted text). A weekday with no slots renders no group. This is grouping only — it changes no API request.
- **D128B-4 — Slot row anatomy (the `MeetingsSection` row + the calendar vocabulary):** left side, the time label "Mon 09:00–10:30" (short weekday, en dash, 24-hour `HH:mm` as stored — the `meetingLabel` convention, copied as `slotLabel.ts`) and beside it a kind badge: `CheckCircle2` + "Available" or `Ban` + "Blocked", icons `aria-hidden` (D127B-5 labels verbatim). Right side, "Edit" (outline) and "Delete" (ghost) buttons with accessible names including the label and kind, e.g. "Edit Available Mon 09:00–10:30", "Delete Blocked Wed 20:00–22:00" (identical times of different kinds must not collide in the a11y tree).
- **D128B-5 — Add/Edit dialog (the `MeetingForm` pattern):** `role="dialog"` + `aria-modal`, focus trap, Escape closes, focus returns to the trigger, backdrop click closes (frozen while submitting), `max-h-[90vh]` scroll, duplicate-submission prevention via `isLoading`. Heading: "Add a time slot" (create) or "Edit Available Mon 09:00–10:30" (edit, the row's full name). Fields: Kind (D128B-6), Day (`Select`, Sunday–Saturday full names, values 0–6, default Monday — the `MeetingForm` recorded default), Start time and End time (`Input type="time"`, side by side on `sm:`).
- **D128B-6 — Kind control: segmented radio pair** (user-confirmed). A labeled `radiogroup` "Kind" with two choices, arrow-key operable, first radio focused into the form's tab order naturally: **"Available window"** (sub-caption "You can study then") and **"Blocked time"** (sub-caption "You are unavailable then"); create-mode default is "Available window" (`isAvailable: true`). The radio labels are one word more explicit than the calendar badges ("Available"/"Blocked") so the setting's meaning survives without the calendar context; the list badge vocabulary stays verbatim per D128B-4.
- **D128B-7 — Client validation mirrors the API (DoD 2, the MeetingForm zod schema + one field):** required `HH:mm` times, `endTime` strictly after `startTime` on the same day (error path `endTime`, inline under the End field via `Input error`), a status code stays the API's authority on 0–6 (the day select makes out-of-range unselectable, so no client message is needed for it beyond the required check). Submit button: "Create time slot" (create) / "Save changes" (edit).
- **D128B-8 — API failure handling (the MeetingForm mapping):** a 400 field map (`getFieldError` over `dayOfWeek`, `startTime`, `endTime`) renders under the matching field, input preserved; a 409 duplicate renders a form-level `role="alert"` with the API's message ("…already exists…" as returned); a 404 during edit (uniform "Resource not found" — the slot is gone or foreign) renders a form-level alert "Resource not found — this time slot may no longer exist." and the dialog's cancel reloads the list; any other failure toasts the sanitized message with values preserved (resubmit is the retry). Nothing is written on any rejection (AC 5).
- **D128B-9 — Delete confirmation (the `DeleteSemesterDialog` pattern):** title "Delete Mon 09:00–10:30?"; body "This permanently deletes that recurring time. It will stop appearing on your availability list and your calendar."; the safe action (Cancel) is focused first; focus trap, Escape cancels, focus returns to the trigger; confirm is a `danger` button `aria-label`ed with the row's full name (D128B-4); a failed delete shows a `role="alert"` inside the dialog and re-enables confirm.
- **D128B-10 — States:** loading = card with `Loader2` spinner + "Loading your availability…" (the Assignments loading card). Empty = `CalendarClock` icon, "No availability yet.", hint "Add when you can study, and when you can't.", CTA "Add your first time slot", secondary link "View your week" → `/calendar`. Error = `role="alert"` card "We could not load your availability. Try again." + a "Try again" `Button` re-issuing the list request (the Assignments error card).
- **D128B-11 — Navigation:** the authenticated header nav gains an "Availability" link between Calendar and Profile, same current-page styling as the other links (user-confirmed, D404-12). The calendar page's two shipped "Manage availability" links stay unchanged — verified, no edit needed.
- **D128B-12 — Live region:** an always-present, empty-at-rest `role="status"` region under the heading (the `CoursesPage`/`AssignmentsPage` pattern) announcing after each success: "Available window added." / "Time slot updated." / "Time slot deleted." (kind-specific for the add when possible, e.g. "Blocked time added."), with no count re-fetch — the page re-reads `GET /availability-slots` after each change and the sentence is prefixed to the count line ("Showing N time slots.") like the Assignments refetch prefix.
- **D128B-13 — Responsive:** desktop shows the weekday cards in one column; `max-w-3xl`–`max-w-5xl` keeps rows short. At 375px each row stacks label above actions (the `MeetingsSection` flex-col pattern), all buttons/controls reach `max-sm:min-h-[44px]`, and type margins come from the shared system; the dialog scrolls to the first invalid field implicitly (native focus), so no extra scroll logic. No `768` breakpoint rules needed — the single-column list is breakpoint-free except the row layout above.

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

All gaps settled by decisions D128B-1…13 above: the editing model (D128B-1, D128B-5–8), the available/blocked distinction (D128B-4, D128B-6), the form's controls and where validation appears (D128B-7–8), the delete confirmation and empty-state copy (D128B-9–10), and the page header, primary action label, and message wording (D128B-2, D128B-12). No material UI/UX ambiguity remains.

## Definition of Done

1. The functional acceptance criteria above pass.
2. The form mirrors the API's validation rules; the API's field-level errors are shown inline (DoD 2, 4).
3. Not applicable — no new read or write beyond the principal-scoped availability API.
4. API error messages produce actionable inline messages (400/409) and the error state (D128B-8, D128B-10).
5. Loading, empty, and error states render (D128B-10).
6. Keyboard operability, visible focus, accessible names on every row action, and a focus-trapped dialog and confirmation (D128B-5, D128B-9).
7. Responsive layout verified on desktop and mobile (D128B-13).
8. Component tests in `pages/availability` and `features/availability`, plus the e2e journey.
9. Not applicable — no API change.
10. Integrated review in a development environment — the combined SP-128 review covers the browser pass.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized. The `ui-refiner` does not mutate Jira; any description reconciliation returns to the planner/coordinator.

## Sizing

- **Outcome:** the student can create, edit, and remove their recurring availability windows and blocked times from a dedicated, validated, accessible page.
- **Request/token estimate:** ~2–2.5 requests/tokens — the entity client and types, the slot list + form + confirmation, the page with its route and nav entry, the component tests, and the e2e extension. The `ui-refiner` decisions are all inside the existing CRUD surface (list + dialog + labels + copy); **no split trigger**, per the SP-128 README's re-size rule.
- **Model recommendation:** 3 — a form-heavy editor over a settled API contract with an in-repo interaction blueprint (`MeetingForm`); the implementation is mid-tier work.
- **Files:** `apps/web/src/entities/availability/api/availabilityApi.ts` (new), `apps/web/src/entities/availability/model/types.ts` (new), `apps/web/src/features/availability/ui/` (new: slot list, slot label helper, slot form, delete confirmation + tests), `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (new) + test, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts` (extended).
- **Start context:** this story file; the [EP04 README](../../README.md#shared-api-contract) (the API the page calls); `apps/web/src/features/courses/ui/MeetingForm.tsx` and `MeetingsSection.tsx` (the interaction blueprint); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` (design references); `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (confirmation pattern); `apps/web/src/features/calendar/ui/CalendarEventChip.tsx` (the kind vocabulary); `apps/web/src/entities/course/api/courseApi.ts` (client pattern); `apps/web/src/shared/ui/` (the available shared controls); `apps/web/src/shared/lib/errors.ts` (API error handling).
- **Verification:** `pnpm --filter web test -- src/pages/availability src/features/availability src/entities/availability`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec.
- **Dependencies / exclusions:** SP-128A implemented. Excludes dated one-off blocks, bulk-copy actions, overlap warnings, the grid editor, calendar rendering, and new UI libraries.
