# SP-114F checkpoint

Updated: 2026-10-24 (implementer session — child complete)
Execution state: [SP-114 README queue](../../README.md#execution-queue) — row F `Implemented — awaiting parent review`
Story: [SP-114F-assignment-edit-delete-integration.md](../../SP-114F-assignment-edit-delete-integration.md)
Review unit: SP-114 (parent index `./artifacts/SP-114/implementation.md` written by F; combined parent review)
Role / scope: implementer; integration only — E2E tests for PATCH/DELETE flows in `assignments-e2e.spec.ts`, DoD-10 manual browser sign-off, parent index `../SP-114/implementation.md`.

## Completed — see [implementation.md](./implementation.md)

- [x] Extend `apps/api/src/modules/assignments/assignments-e2e.spec.ts` with PATCH and DELETE flows:
  - [x] Full-stack PATCH: create assignment -> `PATCH /assignments/:id` editable fields (title, description, due date, estimated hours, priority) -> verify updated values in `GET /courses/:id` projection (AC 1)
  - [x] Full-stack DELETE: create assignment -> `DELETE /assignments/:id` (204) -> verify removal from `GET /courses/:id` projection; seeded task on assignment survives with `assignmentId: null` (D114-4, AC 2)
  - [x] Two-student matrix: student B attempts PATCH/DELETE on student A's assignment -> uniform 404; student A's row unchanged (AC 3)
  - [x] Validation: invalid edit inputs (whitespace-only title, out-of-range duration, unknown `status`/`actualHours` fields) -> 400 field-level errors with no write (AC 4)
  - [x] PATCH null semantics (D114-5): explicit `null` keeps stored `dueDate`/`estimatedHours`; `description: ''` clears stored description; empty body -> 400 "At least one field must be provided" (AC 5)
- [x] Run automated API tests and full test suite with disposable PostgreSQL (815 tests passing, 0 failures)
- [x] DoD-10 manual browser sign-off: walkthrough of edit and delete flows on course detail page (announcements, mode-aware hints, error states, keyboard, responsive) (AC 6)
- [x] Create parent implementation index at `docs/stories/EP03/SP-114/artifacts/SP-114/implementation.md`
- [x] Complete child `implementation.md` and closeout

## Findings / discoveries / deviations

Findings/deviations: None.

## Resume next

None — SP-114F implementation complete. Request combined independent SP-114 parent review.
