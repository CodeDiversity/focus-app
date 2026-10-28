# SP-128B: Availability Settings UI

**Story ID:** SP-128B
**Title:** Frontend — the `/availability` page: manage study windows and blocked times
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-128](./SP-128-availability-and-unavailable-blocks.md)
**Milestone:** M2
**Layer:** Frontend
**Status:** Needs refinement — `ui-refiner` pass required before implementation (D404-9). Not ready to code.
**Dependencies:** SP-128A implemented (the API it manages).
**Jira key:** Pending creation

## Summary

A student opens `/availability` and sees their recurring weekly availability and blocked times, grouped by weekday. They add an available window or a blocked time, edit one, and remove one — each change reflected immediately from the API's state, with the field-level validation message shown next to the offending field and every action announced to assistive technology.

## Description & bounded scope

### In scope

1. **A new `/availability` route** (`apps/web/src/pages/availability/ui/AvailabilityPage.tsx`), registered in `apps/web/src/app/App.tsx` inside `ProtectedRoute` and reachable from the header nav and from the calendar page's "Manage availability" link (D404-12).
2. **The slot list** — the student's slots grouped by weekday, distinguishing an available window from a blocked time **in text**, not only by color (both share one model with an `isAvailable` flag).
3. **Add / edit** — a form for a slot's day, start and end time, and whether it is an available window or a blocked time; the client mirrors the API's validation rules and shows the API's field-level errors inline.
4. **Delete** — a focus-trapped confirmation before removing a slot (the `DeleteSemesterDialog` pattern).
5. **States** — loading, empty ("no availability set yet"), and error-with-retry; an always-present `role="status"` live region announcing each successful change.
6. **Keyboard and responsive behavior** — every control reachable and operable by keyboard with visible focus; usable from 375px up.

### Out of scope

- Overlap warnings or slot conflict resolution (not in the API contract).
- One-off dated blocks (D404-5).
- The calendar's rendering of availability (SP-127A).
- Any new UI library or backend change.

## Source requirement references

- **Epic AC-E04-04, AC-E04-05** — ownership table in the [SP-128 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1, 5, 6, 7, 8 apply here; items 10–11 belong to the combined parent review.
- **Decisions:** D404-5 (weekly-only), D404-9 (the editing model is deliberately undecided), D404-12 (its own page), D404-10 (plain-axios entity client).

## Acceptance criteria

1. The `/availability` page lists the student's slots grouped by weekday, each showing its time range and whether it is an available window or a blocked time — the distinction is textual.
2. The student can add an available window and a blocked time; the new slot appears in the list from the API's response without a manual reload.
3. The student can edit a slot's day, times, or kind; the updated values are shown after the API confirms them.
4. Deleting a slot asks for confirmation first, and the slot disappears once the API confirms the deletion.
5. A rejected save shows the API's field-level error next to the offending field and keeps the student's input; nothing is written on a rejection.
6. The page renders the empty state (no slots yet), the loading state, and the error state with a working retry.
7. Every successful add, edit, and delete is announced through the always-present `role="status"` live region.
8. All controls are keyboard-operable with visible focus and accessible names; the confirmation traps focus, closes on Escape, and returns focus to its trigger.
9. The layout works from 375px to desktop with consistent spacing.

## Tests to add / update

- `apps/web/src/pages/availability/ui/AvailabilityPage.test.tsx` (new)
  - Renders the slots grouped by weekday with the available/blocked labels.
  - Creates an available window and a blocked time; the list reflects the API response.
  - Edits a slot; the updated values render.
  - Deletes a slot after confirming; a cancelled confirmation sends no request.
  - Empty state, loading state, and error-with-retry (a rejected list request then a successful one).
  - A field-level 400 shows the message next to the field and keeps the input.
  - The `role="status"` region announces the change.
- `apps/web/src/features/availability/ui/AvailabilitySlotForm.test.tsx` (new) — the client's validation mirrors the API's rules (an end time not after the start time is caught before the request; a `dayOfWeek` outside 0–6 is impossible to select).
- `apps/web/src/features/availability/ui/DeleteAvailabilitySlotDialog.test.tsx` (new) — focus trap, Escape cancels, focus returns to the trigger, confirm dispatches the delete.
- `apps/web/src/entities/availability/api/availabilityApi.test.ts` (new) — the client maps the payload and sends only editable fields.
- `apps/web/e2e/calendar.spec.ts` (SP-127B's spec, extended) — a slot created here appears on the calendar as an available window; a blocked time appears as a blocked band.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- **No availability code exists in the web app** — no `pages/availability`, `features/availability`, or `entities/availability`; `apps/web/src/app/App.tsx` has no `/availability` route and `apps/web/src/widgets/header/ui/Header.tsx` has no Availability nav entry.
- Shared controls available: `apps/web/src/shared/ui/Button.tsx` (`variant`, `size`, `leftIcon`), `Input.tsx` (with `leftIcon`), `Select.tsx`. **No shared dialog, time-picker, or weekday-picker component exists** — the slot form and the delete confirmation are `features/availability/ui/` components.
- Delete-confirmation precedent: `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (focus trap, Escape cancels, focus returns to the trigger). Dialog precedent: `apps/web/src/features/courses/ui/ArchiveCourseDialog.tsx`.
- Client pattern: `apps/web/src/entities/course/api/courseApi.ts` — plain axios over `@/shared/api/httpClient`; types under `entities/<entity>/model/types.ts` (the `entities/user/model/types.ts` shape) or `shared/types/academic.ts`.
- Error handling: `apps/web/src/shared/lib/errors.ts` (`getErrorMessage`, `extractApiError`) — the Assignments form shows the API's field-level `errors` map next to the offending field; the availability form mirrors that.
- Live-region pattern: `apps/web/src/pages/courses/ui/CoursesPage.tsx` — an always-present, empty-at-rest `role="status"` region so changes are announced.
- FSD placement (enforced by `import/no-restricted-paths` in `apps/web/.eslintrc.cjs`): the page in `pages/availability/ui/`, the editor components in `features/availability/ui/`, the client and types in `entities/availability/`.
- Visual system: the redesigned Assignments and Courses pages (SP-126) — `max-w-5xl` shell, header with an action upper-right, `role="status"` count header, distinct empty/no-match/error states, `h-[42px]` controls with `max-sm:min-h-[44px]`.

### Proposed files

`apps/web/src/entities/availability/api/availabilityApi.ts` (+ `model/types.ts`, + test), `apps/web/src/features/availability/ui/{AvailabilitySlotList,AvailabilitySlotForm,DeleteAvailabilitySlotDialog}.tsx` (+ tests), `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (+ test), `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, the calendar page's "Manage availability" link (SP-127B), `apps/web/e2e/calendar.spec.ts` (extended).

### UI/UX gaps for the `ui-refiner` (D404-9 — required before implementation)

- The editing model: a weekday-grouped list of slots vs. a visual weekly grid; whether a slot is added through a dialog, an inline row, or a dedicated section.
- How an available window and a blocked time are distinguished in the UI given they share one model with an `isAvailable` flag (label wording, icon, ordering).
- The form's controls (weekday select vs. segmented days; start/end time inputs vs. a time picker) and where the validation message appears.
- The delete confirmation's wording and the empty-state copy.
- The page header, the primary action's label, and the exact wording of every message.

## Definition of Done

1. The functional acceptance criteria above pass.
2. The form mirrors the API's validation rules; the API's field-level errors are shown inline (DoD 2, 4).
3. Not applicable — no new read or write beyond the principal-scoped availability API.
4. API error messages produce actionable inline messages and the error state.
5. Loading, empty, and error states render.
6. Keyboard operability, visible focus, accessible names, and a focus-trapped confirmation.
7. Responsive layout verified on desktop and mobile.
8. Component tests in `pages/availability` and `features/availability`, plus the e2e journey.
9. Not applicable — no API change.
10. Integrated review in a development environment — the combined SP-128 review covers the browser pass.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** the student can create, edit, and remove their recurring availability windows and blocked times from a dedicated, validated, accessible page.
- **Request/token estimate:** ~2–2.5 requests/tokens — the entity client and types, the slot list + form + confirmation, the page with its route and nav entry, the component tests, and the e2e extension. The `ui-refiner` pass settles the editing model first, which keeps this bounded.
- **Model recommendation:** 3 — a form-heavy editor over a settled API contract; the interaction decisions are made by `ui-refiner`, so the implementation itself is mid-tier work.
- **Files:** `apps/web/src/entities/availability/api/availabilityApi.ts` (new), `apps/web/src/entities/availability/model/types.ts` (new), `apps/web/src/features/availability/ui/` (new: slot list, slot form, delete confirmation + tests), `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (new) + test, `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`, `apps/web/e2e/calendar.spec.ts` (extended).
- **Start context:** this story file; the [EP04 README](../README.md#shared-api-contract) (the API the page calls); `apps/web/src/pages/assignments/ui/AssignmentsPage.tsx` and `apps/web/src/pages/courses/ui/CoursesPage.tsx` (design references); `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (confirmation pattern); `apps/web/src/entities/course/api/courseApi.ts` (client pattern); `apps/web/src/shared/ui/` (the available shared controls); `apps/web/src/shared/lib/errors.ts` (API error handling).
- **Verification:** `pnpm --filter web test -- src/pages/availability src/features/availability src/entities/availability`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec.
- **Dependencies / exclusions:** SP-128A implemented. Excludes dated one-off blocks, overlap warnings, calendar rendering, and new UI libraries.
