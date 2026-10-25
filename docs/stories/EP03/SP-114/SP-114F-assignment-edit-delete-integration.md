# SP-114F: Assignment Edit and Delete Integration Sign-off

**Story ID:** SP-114F
**Title:** Integration: e2e tests + DoD-10 sign-off + parent index
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented — awaiting parent re-review (IR-114-03/04/05 closed; [implementation](./artifacts/SP-114F/implementation.md))
**Refined:** 2026-10-24
**Dependencies:** SP-114D (PATCH + DELETE API), SP-114E (per-row edit/delete UI)
**Artifacts:** [implementation](./artifacts/SP-114F/implementation.md) · [checkpoint](./artifacts/SP-114F/checkpoint.md)
**Jira key:** Pending creation

## Summary

Verify end-to-end that assignment editing and deletion work correctly across
the full stack: API endpoints, frontend forms, ownership enforcement, error
handling, and the course-detail refetch pattern. The e2e spec (the API-side
`test-http` harness — the SP-113C precedent: no browser automation) proves the
PATCH/DELETE round-trips, the D114-5 null semantics, and the ownership matrix;
the web side (edit/delete forms, live-region announcements — no success toast,
D114E-7 — keyboard, responsive) is verified in the DoD-10 manual browser walk.
Write the e2e tests, perform DoD-10 manual browser sign-off, and write the
parent implementation index.

## Source requirement references

- **AC-E03-01** (create) — editing/deletion extend the same assignment resource.
- **AC-E03-02** (optional fields) — editable via PATCH.
- **DoD 1** (functional criteria) — integrated proof.
- **DoD 3** (student data scoping) — two-student matrix (cross-student PATCH/DELETE → 404).
- **DoD 4** (actionable API errors) — integrated error display.
- **DoD 5** (loading/empty/error states) — integrated states.
- **DoD 8** (automated tests) — e2e tests.
- **DoD 10** (integrated review) — manual browser sign-off.

## Acceptance criteria

1. **E2E — PATCH:** `POST` an assignment, `PATCH /assignments/:id` its editable fields (title, description, due date, estimated hours, priority), and verify the updated values in the `GET /courses/:id` projection (the course-detail refetch surface).
2. **E2E — DELETE:** `DELETE /assignments/:id` (204) and verify the row is gone from the `GET /courses/:id` projection; a seeded task on the assignment survives with `assignmentId: null` (D114-4).
3. **E2E — ownership:** A second student cannot edit or delete the first student's assignment (uniform 404; the row is unchanged).
4. **E2E — validation:** Invalid input on edit (e.g., whitespace-only title, out-of-range duration, unknown `status`/`actualHours` fields) is rejected with 400 field-level errors.
5. **E2E — null semantics (D114-5):** an explicit `null` for `dueDate`/`estimatedHours` keeps the stored value; `description: ''` clears the stored description; an empty body → 400 "At least one field must be provided".
6. **DoD-10 manual sign-off:** Manual browser walkthrough of the edit and delete flows on the course detail page — including the live-region announcements (`"Assignment updated."` / `"Assignment deleted."` — no success toast, D114E-7), the mode-aware edit hints, error states, keyboard interactions, and responsive behavior.

## Tests

- **E2E tests** (`assignments-e2e.spec.ts` — extended by this story; API-side `test-http` harness, real Postgres — the web side is covered by the manual walk, the SP-113C precedent):
  - Full-stack PATCH flow: create → `PATCH /assignments/:id` → verify updated values in the `GET /courses/:id` projection.
  - PATCH null semantics (D114-5): explicit `null` keeps the stored `dueDate`/`estimatedHours`; `description: ''` clears the stored description; empty body → 400 "At least one field must be provided".
  - Full-stack DELETE flow: create → `DELETE /assignments/:id` (204) → verify removal from the projection; a seeded task (via `app.prisma`) survives with `assignmentId: null` (D114-4).
  - Two-student matrix: student B attempts PATCH/DELETE on student A's assignment → 404; A's row unchanged.
  - Validation: invalid edit input (whitespace-only title, out-of-range duration, unknown lifecycle fields) → 400 field-level errors.
  - **Manual walk (AC 6):** the UI edit/delete flows, live-region announcements (no success toast — D114E-7), mode-aware hints, error states (incl. network/5xx → retry toast), keyboard-only pass, and mobile viewport — recorded per the SP-113C DoD-10 format.

## Technical notes

### Inspected code paths (verified)

- `apps/api/src/test/test-http.ts` — `createIntegrationApp` (real HTTP, main.ts module parity, real Postgres).
- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — existing e2e tests (POST only; extend with PATCH/DELETE).
- `docs/stories/EP03/SP-113/SP-113C-quick-create-integration-signoff.md` — the SP-113C pattern (e2e + DoD-10 + parent index).

### Integration with SP-113

The e2e test suite (SP-113C) tests POST /assignments. This story extends that
suite with PATCH and DELETE flows. The same `createIntegrationApp` harness is
used. The course-detail page (SP-113B) is the integration surface — create an
assignment, edit it, delete it, and verify the `AssignmentsSection` updates
correctly after each mutation.

## Definition of Done

All applicable shared DoD (see SP-114 parent). Integration-specific:

- E2E tests for PATCH and DELETE flows (full-stack, real Postgres), incl. the D114-5 null-semantics cases (null keeps, `''` clears description, empty body → 400) and the task-cascade survival.
- Two-student matrix test (cross-student ownership enforcement).
- Manual browser walkthrough of edit and delete flows, incl. the live-region announcements (no success toast — D114E-7), mode-aware hints, error states, keyboard, and responsive passes.
- Parent implementation index at `./artifacts/SP-114/implementation.md`.

## Sizing block

- **Outcome:** E2E tests for PATCH + DELETE flows (incl. null semantics + task cascade), manual DoD-10 sign-off, parent index.
- **Time estimate:** ~2 hours (the SP-113C precedent: one e2e spec + the manual walk + the index).
- **Production files:** None (integration only).
- **Test files:** `assignments-e2e.spec.ts` (extend with PATCH/DELETE flows).
- **Minimal start context:** Read `test-http.ts`, `assignments-e2e.spec.ts`, `SP-113C`.
- **Verification commands:** `pnpm test:e2e -- assignments-e2e.spec.ts`.
- **Dependencies:** SP-114D (PATCH + DELETE endpoints), SP-114E (per-row UI).
- **Exclusions:** None (this is the integration verification child).
