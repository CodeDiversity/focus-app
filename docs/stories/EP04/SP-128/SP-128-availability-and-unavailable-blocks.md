# SP-128: Study Availability & Unavailable Blocks

**Story ID:** SP-128
**Title:** Availability: recurring study windows and blocked times, managed by the student
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Milestone:** M2
**Layer:** Backend + Frontend (two children)
**Status:** Draft — SP-128A `Ready`, SP-128B `Needs refinement`.
**Dependencies:** EP02 + EP03 (both complete). No EP04 predecessor.
**Jira key:** Pending creation

## Summary

A student tells StudyPilot when they are free to study and when they are not: recurring weekly available windows and recurring blocked times, editable on their own page and shown on the calendar. The data reuses the existing `AvailabilitySlot` model — no migration — and every slot belongs to the authenticated student alone.

## Description & bounded scope

### In scope

1. **`SP-128A` (backend):** a new `availability` module exposing `GET / POST / PATCH / DELETE /availability-slots` over the existing `AvailabilitySlot` model, with the `HH:mm` + `dayOfWeek` validation rules, partial-merge updates validated on the merged values, a uniqueness conflict on `(userId, dayOfWeek, startTime)`, and uniform 404s for missing or foreign slots.
2. **`SP-128B` (frontend):** the `/availability` page where the student adds, edits, and removes recurring available windows and blocked times, with the empty, loading, error, and validation states.

### Out of scope

- One-off dated blocks — the model is weekly-recurring (D404-5).
- Showing availability on the calendar grid — SP-127A's read model already returns `AVAILABILITY` / `BLOCKED_TIME` events.
- Availability-driven scheduling — EP06 consumes these slots later.
- Any Prisma migration; any new dependency.

## Source requirement references

- **Epic AC-E04-04, AC-E04-05** — ownership table in the [SP-128 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1–8 apply; item 9 is satisfied by the shared contract (no migration); items 10–11 belong to the combined parent review.
- **Decisions:** D404-5, D404-9, D404-11, D404-12 in the [EP04 README](../README.md#decision-register).

## Acceptance criteria

1. `GET /availability-slots` returns the student's slots ordered by `dayOfWeek` then `startTime`, each with `dayOfWeek`, `startTime`, `endTime`, `isAvailable`, and timestamps.
2. `POST /availability-slots` creates a slot; `isAvailable` defaults to `true` when omitted; `dayOfWeek` is an integer 0–6 (Sunday = 0) and the times are `HH:mm` 24-hour strings with `endTime` strictly after `startTime` on the same day.
3. `PATCH /availability-slots/:id` partially merges the submitted fields and validates the merged result; an empty body is rejected; a duplicate `(userId, dayOfWeek, startTime)` after the merge returns `409`.
4. `DELETE /availability-slots/:id` removes the slot and returns `204`.
5. A missing, foreign, or malformed slot id returns the same uniform `404 Resource not found`; an unauthenticated request returns `401`; a field-level validation failure returns `400` with an `errors` map and writes nothing.
6. The `/availability` page lists the student's slots grouped by weekday, lets the student add an available window or a blocked time, edit a slot, and remove it, and reflects the API's state after each change.
7. The page handles the empty state (no slots yet), the loading state, and the error state with a working retry; it shows the API's field-level validation message next to the offending field.
8. The page is keyboard-operable with visible focus, accessible names on all controls, and readable contrast; it works on mobile as well as desktop.

## Tests to add / update

### Backend (SP-128A)

- `apps/api/src/modules/availability/availability.service.spec.ts` — create with defaults; validation matrix (`dayOfWeek` 7 / −1 / non-integer, `startTime` `"9:00"`, `endTime` equal to or before `startTime`, unknown fields); PATCH partial merge validated on the merged values; empty PATCH body rejected; duplicate slot → 409; delete → 204; a slot is not affected by another student's writes.
- `apps/api/src/modules/availability/availability-data-scoping.spec.ts` — student B cannot read, patch, or delete student A's slot; the list contains only B's slots.
- `apps/api/src/modules/availability/availability-e2e.spec.ts` (integration, `apps/api/src/test/test-http.ts`) — the full CRUD journey over real HTTP; 400 / 401 / 404 / 409 shapes.
- `apps/api/src/test/test-http.ts` — register the new `AvailabilityModule`.

### Frontend (SP-128B)

- `apps/web/src/pages/availability/ui/AvailabilityPage.test.tsx` — lists slots grouped by weekday; creates an available window and a blocked time; edits a slot; deletes a slot with confirmation; renders the empty, loading, and error states with a working retry; shows a field-level validation message; announces the change through the `role="status"` region.
- `apps/web/src/entities/availability/api/availabilityApi.test.ts` — the client maps the payload and sends only the editable fields.

### End-to-end

- `apps/web/e2e/calendar.spec.ts` (SP-127B's spec, extended) — a slot created in `/availability` appears on the calendar as an available window, and a blocked time appears as a blocked band.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- The `AvailabilitySlot` model already exists (`apps/api/prisma/schema.prisma`): `id`, `userId` (cascade), `dayOfWeek` (0–6), `startTime`/`endTime` (`HH:mm` strings), `isAvailable Boolean @default(true)`, timestamps, `@@unique([userId, dayOfWeek, startTime])`, mapped to `availability_slots`. **No migration is needed.** `apps/api/src/common/ownership/ownership.ts` already names `AvailabilitySlot` in its scope-by-`userId` list.
- There is **no availability module and no availability route** (`apps/api/src/modules/` = assignments, auth, courses, email, onboarding, prisma, semesters, users). EP04 adds `apps/api/src/modules/availability/` and registers it in `apps/api/src/app.module.ts` and `apps/api/src/test/test-http.ts` (which wires the module graph explicitly).
- Validation precedent to copy: `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` and `update-class-meeting.dto.ts` — `dayOfWeek` 0–6, strict `HH:mm` patterns, and the service-owned cross-field rule (`endTime` strictly after `startTime`, same day, no midnight wrap) that a single-field decorator cannot express; plus `apps/api/src/modules/assignments/assignments.service.ts` for the `validateSync` service re-check and the partial-merge semantics.
- Ownership precedent: `ownedWhere(userId, id)` in every write; the global `AllExceptionsFilter` normalizes Prisma P2025 to the same uniform 404 as a missing row.
- Frontend precedent: plain-axios entity clients (`entities/course/api/courseApi.ts`), types under `entities/<entity>/model/types.ts`, shared controls `apps/web/src/shared/ui/{Button,Input,Select}.tsx` — no shared dialog or time-picker component exists, so the slot editor is a `features/availability/ui/` component; the `ArchiveCourseDialog` / `DeleteSemesterDialog` focus-trapped confirmation is the delete-confirmation precedent.

### Proposed placement

- Backend: `apps/api/src/modules/availability/` — `availability.module.ts`, `availability.controller.ts`, `availability.service.ts`, `dto/create-availability-slot.dto.ts`, `dto/update-availability-slot.dto.ts`, plus specs.
- Frontend: `apps/web/src/entities/availability/api/availabilityApi.ts` (+ `model/types.ts`), `apps/web/src/features/availability/ui/` (slot list, slot form, delete confirmation), `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (+ test). Route registered in `apps/web/src/app/App.tsx`; nav entry in `apps/web/src/widgets/header/ui/Header.tsx`; a "Manage availability" link on the calendar page (SP-127B).

### Open items for the ui-refiner (SP-128B, D404-9)

The editing model itself: whether the week is presented as a list of slots grouped by weekday or as a visual weekly grid; how "available window" and "blocked time" are distinguished (they share one model with an `isAvailable` flag); the add/edit form's controls and validation presentation; the delete confirmation; the empty-state copy; and the exact wording. These are deliberately undecided.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is validated — the full field matrix produces field-level 400s and writes nothing (SP-128A); the form mirrors the rules (SP-128B).
3. Every read and write is scoped to the authenticated student; a foreign slot is a uniform 404 (SP-128A).
4. API errors produce actionable messages — 400 field map, 401, uniform 404, 409 conflict (SP-128A) and their display (SP-128B).
5. Loading, empty, and error states render (SP-128B).
6. Keyboard operability and visible focus across the list, the form, and the confirmation (SP-128B).
7. Responsive layouts work on desktop and mobile (SP-128B).
8. Business rules have automated tests: unit + data-scoping + integration (SP-128A), component (SP-128B), and the e2e journey.
9. The API is documented in the [EP04 README](../README.md#shared-api-contract). **No migration.**
10. Integrated review in a development environment — the combined SP-128 review covers the browser pass.
11. The reviewer saves the final walkthrough for this parent.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** the student can list, create, edit, and delete their recurring availability windows and blocked times through a validated, ownership-scoped API (SP-128A), and manage them from a dedicated page (SP-128B).
- **Request/token estimate:** ~2–2.5 requests/tokens per child — SP-128A: one new module (controller + service + two DTOs), the merge/validation/uniqueness rules, module registration, and three spec files; SP-128B: the entity client, the slot list + form + confirmation, the page with route and nav, the component tests, and the e2e extension.
- **Model recommendation:** 3 — the backend child is a conventional, well-precedented CRUD surface (a 3); the frontend child is a form-heavy editor whose interaction model the `ui-refiner` settles first (a 3).
- **Files:**
  - `apps/api/src/modules/availability/availability.module.ts` (new)
  - `apps/api/src/modules/availability/availability.controller.ts` (new)
  - `apps/api/src/modules/availability/availability.service.ts` (new)
  - `apps/api/src/modules/availability/dto/create-availability-slot.dto.ts` (new)
  - `apps/api/src/modules/availability/dto/update-availability-slot.dto.ts` (new)
  - `apps/api/src/modules/availability/availability.service.spec.ts` (new)
  - `apps/api/src/modules/availability/availability-data-scoping.spec.ts` (new)
  - `apps/api/src/modules/availability/availability-e2e.spec.ts` (new)
  - `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`
  - `apps/web/src/entities/availability/api/availabilityApi.ts` (new) + `model/types.ts` (new) + test
  - `apps/web/src/features/availability/ui/` (new: slot list, slot form, delete confirmation + tests)
  - `apps/web/src/pages/availability/ui/AvailabilityPage.tsx` (new) + test
  - `apps/web/src/app/App.tsx`, `apps/web/src/widgets/header/ui/Header.tsx`
  - `apps/web/e2e/calendar.spec.ts` (extended)
- **Start context:** this story file; the [EP04 README](../README.md#shared-api-contract) (the exact request/response shape); `apps/api/prisma/schema.prisma` (the `AvailabilitySlot` model); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` and `update-class-meeting.dto.ts` (the validation precedent); `apps/api/src/modules/assignments/assignments.service.ts` (the merge + re-check pattern); `apps/api/src/test/test-http.ts`; `apps/web/src/entities/course/api/courseApi.ts` (client pattern); `apps/web/src/features/semesters/ui/DeleteSemesterDialog.tsx` (delete-confirmation precedent).
- **Verification:** `pnpm --filter api test -- availability`, `pnpm --filter web test -- src/pages/availability src/features/availability src/entities/availability`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, and the `calendar` Playwright spec.
- **Dependencies / exclusions:** EP02 + EP03 (complete). Excludes dated one-off blocks (D404-5), calendar rendering of availability (SP-127A), scheduling use of availability (EP06), new dependencies, and migrations.
