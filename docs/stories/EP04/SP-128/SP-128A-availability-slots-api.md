# SP-128A: Availability Slots API

**Story ID:** SP-128A
**Title:** Backend — CRUD for recurring study availability windows and blocked times
**Parent epic:** [EP04: Academic Calendar & Availability](../../../epics/EP04-academic-calendar-and-availability.md) (Jira STUDY-14)
**Parent:** [SP-128](./SP-128-availability-and-unavailable-blocks.md)
**Milestone:** M2
**Layer:** Backend
**Status:** Reviewed — combined SP-128 parent review passed (pass 1, `artifacts/SP-128/review.md`).
**Dependencies:** EP02 + EP03 (both complete). No EP04 predecessor.
**Jira key:** Pending creation

## Summary

A new `availability` module exposes `GET / POST / PATCH / DELETE /availability-slots` over the existing `AvailabilitySlot` model: recurring weekly windows when the student is free to study (`isAvailable: true`) and recurring blocked times (`isAvailable: false`), with validated `HH:mm` times, partial-merge updates validated on the merged result, a uniqueness conflict on `(userId, dayOfWeek, startTime)`, and uniform 404s for anything the student does not own.

## Description & bounded scope

### In scope

- A new `apps/api/src/modules/availability/` module (`AvailabilityModule`, `AvailabilityController`, `AvailabilityService`, `CreateAvailabilitySlotDto`, `UpdateAvailabilitySlotDto`), registered in `apps/api/src/app.module.ts` and in `apps/api/src/test/test-http.ts`.
- `GET /availability-slots` → the student's slots ordered by `dayOfWeek`, then `startTime`.
- `POST /availability-slots` → create a slot; `isAvailable` defaults to `true`.
- `PATCH /availability-slots/:id` → partial merge; at least one field required; validation runs on the merged values.
- `DELETE /availability-slots/:id` → remove the slot (`204`).
- Ownership scoping on every read and write; uniform `404 Resource not found` for a missing, foreign, or malformed id.

### Out of scope

- One-off dated blocks (the model is weekly-recurring — D404-5).
- Any bulk operation ("copy to all days") — not in the contract.
- Any Prisma migration; any new dependency; any change to other modules.

## Source requirement references

- **Epic AC-E04-04, AC-E04-05** — ownership table in the [SP-128 README](./README.md#source-requirements-and-test-traceability).
- **Shared Definition of Done** ([docs/epics/README.md](../../../epics/README.md#definition-of-done)) — items 1–4 and 8–9 apply here; items 5–7 are SP-128B's; items 10–11 belong to the combined parent review.
- **Decisions:** D404-5 (model reuse, weekly-only), D404-11 (top-level resource), in the [EP04 README](../README.md#decision-register).

## Acceptance criteria

1. `GET /availability-slots` returns `200` with the student's slots ordered by `dayOfWeek` ascending, then `startTime` ascending; each slot carries `id`, `dayOfWeek`, `startTime`, `endTime`, `isAvailable`, `createdAt`, `updatedAt`, and never `userId`.
2. `POST /availability-slots` accepts `{ dayOfWeek, startTime, endTime, isAvailable? }` and returns `201` with the created slot; `isAvailable` omitted → `true`.
3. Validation: `dayOfWeek` is an integer 0–6 (Sunday = 0); `startTime`/`endTime` match `HH:mm` (00:00–23:59); `endTime` is strictly after `startTime` on the same day (no midnight wrap). A failure returns `400` with a field-level `errors` map and writes nothing.
4. `PATCH /availability-slots/:id` accepts any subset of `{ dayOfWeek, startTime, endTime, isAvailable }`, merges them onto the stored values, validates the merged result, and returns `200` with the updated slot; an empty body is a `400`; a merged duplicate `(userId, dayOfWeek, startTime)` is a `409`.
5. `DELETE /availability-slots/:id` returns `204` and the slot is gone; a repeated delete is a uniform `404`.
6. A missing, foreign, or malformed id is always the same `404 Resource not found` — never `403` and never a different message.
7. An unauthenticated request is `401`; an unknown body field (including `userId`) is `400`.
8. The response never exposes another student's row, and the list contains only the requesting student's slots.

## Tests to add / update

- `apps/api/src/modules/availability/availability.service.spec.ts` (new)
  - Create defaults (`isAvailable` true) and an explicit `isAvailable: false` blocked time.
  - Validation matrix: `dayOfWeek` 7, −1, 1.5; `startTime` `"9:00"`, `"25:00"`, `"09:60"`; `endTime` equal to and before `startTime`; unknown field `userId`; each → 400, nothing written.
  - PATCH: single-field update; multi-field merge; validation on the merged values (a patch that would make `endTime` ≤ `startTime` fails); empty body → 400; duplicate after merge → 409.
  - Delete → 204; delete twice → 404 the second time.
  - Ordering of the list.
- `apps/api/src/modules/availability/availability-data-scoping.spec.ts` (new) — student B's list excludes student A's slots; B patching or deleting A's slot id gets the uniform 404 and A's slot is unchanged.
- `apps/api/src/modules/availability/availability-e2e.spec.ts` (new, integration over `apps/api/src/test/test-http.ts`) — the create → list → patch → delete journey; the 400 / 401 / 404 / 409 shapes.
- `apps/api/src/test/test-http.ts` — register `AvailabilityModule` in the integration app's module graph.

## Technical notes

### Verified current behavior (inspected 2026-10-28)

- The model already exists — `apps/api/prisma/schema.prisma`: `AvailabilitySlot { id, userId (cascade), dayOfWeek Int, startTime String, endTime String, isAvailable Boolean @default(true), createdAt, updatedAt, @@unique([userId, dayOfWeek, startTime]) }` mapped to `availability_slots`. **No migration.**
- `apps/api/src/common/ownership/ownership.ts` already lists `AvailabilitySlot` among the models scoped by `userId`, and provides `ownedWhere(userId, id)` + the uniform `RESOURCE_NOT_FOUND` 404.
- There is no availability module or route today: `apps/api/src/modules/` = assignments, auth, courses, email, onboarding, prisma, semesters, users. `apps/api/src/app.module.ts` registers each feature module explicitly; `apps/api/src/test/test-http.ts` mirrors that graph (it must be updated too, or the integration spec cannot see the new routes).
- Validation precedent to copy: `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` (`dayOfWeek` 0–6 with an integer check; `HH:mm` with `/^\d{2}:\d{2}$/`), `update-class-meeting.dto.ts` (all-optional partial-merge DTO), and `apps/api/src/modules/courses/courses-meetings.service.ts` (the service-owned cross-field `endTime > startTime` rule and the hour/minute bounds a decorator cannot express).
- Service precedent to copy: `apps/api/src/modules/assignments/assignments.service.ts` — the `validateSync(..., { whitelist: true, forbidNonWhitelisted: true })` re-check as defense in depth for non-HTTP callers, the partial-merge-on-stored-values semantics, and the field-level `errors` map shape.
- Global pipe: `apps/api/src/common/pipes/validation.pipe.ts` (whitelist + `forbidNonWhitelisted`) applies to the `@Body()` metatype, so an unknown body field is a 400 before the service runs.

### Proposed files

`apps/api/src/modules/availability/` — `availability.module.ts`, `availability.controller.ts`, `availability.service.ts`, `dto/create-availability-slot.dto.ts`, `dto/update-availability-slot.dto.ts`, `availability.service.spec.ts`, `availability-data-scoping.spec.ts`, `availability-e2e.spec.ts`; plus `apps/api/src/app.module.ts` and `apps/api/src/test/test-http.ts`.

### Open questions

None blocking. Overlapping slots are permitted by the model (the unique constraint only forbids an identical `(dayOfWeek, startTime)`); the calendar renders them as separate bands. If the `ui-refiner` or the user wants overlapping windows rejected, that is a new cross-field rule and a contract change — recorded here as a known non-rule, not silently assumed.

## Definition of Done

1. The functional acceptance criteria above pass.
2. Invalid input is validated with field-level 400s; nothing is written on failure.
3. Every read and write is scoped to the authenticated student; the data-scoping spec proves it.
4. API errors are actionable: 400 field map, 401, uniform 404, 409 conflict.
5. Not applicable — no UI in this child.
6. Not applicable — no UI in this child.
7. Not applicable — no UI in this child.
8. Business rules have automated tests: unit, data-scoping, and integration specs.
9. The API is documented in the [EP04 README](../README.md#shared-api-contract). **No migration.**
10. Integrated review — covered by the combined SP-128 review.
11. Reviewer walkthrough — produced for the parent review unit.

## Tracker reference

Jira key: Pending creation. No sync was authorized.

## Sizing

- **Outcome:** the student can manage their recurring availability windows and blocked times through a validated, ownership-scoped CRUD API.
- **Request/token estimate:** ~2–2.5 requests/tokens — one new module (controller + service + two DTOs), the merge/validation/uniqueness/ownership rules, module registration in two places, and three spec files.
- **Model recommendation:** 3 — a conventional CRUD surface with a strong in-repo precedent (the meetings module) and no novel algorithm; a solid mid-tier model suffices.
- **Files:** `apps/api/src/modules/availability/{availability.module.ts,availability.controller.ts,availability.service.ts,dto/create-availability-slot.dto.ts,dto/update-availability-slot.dto.ts,availability.service.spec.ts,availability-data-scoping.spec.ts,availability-e2e.spec.ts}` (all new), `apps/api/src/app.module.ts`, `apps/api/src/test/test-http.ts`.
- **Start context:** this story file; the [EP04 README](../README.md#shared-api-contract) (exact request/response shape); `apps/api/prisma/schema.prisma` (the `AvailabilitySlot` model); `apps/api/src/common/ownership/ownership.ts`; `apps/api/src/common/pipes/validation.pipe.ts`; `apps/api/src/modules/courses/dto/create-class-meeting.dto.ts` + `update-class-meeting.dto.ts` + `courses-meetings.service.ts`; `apps/api/src/modules/assignments/assignments.service.ts`; `apps/api/src/test/test-http.ts`.
- **Verification:** `pnpm --filter api test -- availability` (unit + data-scoping + integration; the integration spec self-skips without `DATABASE_URL`), `pnpm --filter api typecheck`, `pnpm --filter api lint`.
- **Dependencies / exclusions:** EP02 + EP03 (complete). Excludes dated one-off blocks, bulk operations, calendar rendering, scheduling use, new dependencies, and migrations.
