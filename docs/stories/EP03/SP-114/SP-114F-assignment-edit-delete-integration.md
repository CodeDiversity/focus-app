# SP-114F: Assignment Edit and Delete Integration Sign-off

**Story ID:** SP-114F
**Title:** Integration: e2e tests + DoD-10 sign-off + parent index
**Parent:** [SP-114](./SP-114-assignment-editing-and-deletion.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Integration
**Status:** Plan Ready
**Dependencies:** SP-114D (PATCH + DELETE API), SP-114E (per-row edit/delete UI)
**Jira key:** Pending creation

## Summary

Verify end-to-end that assignment editing and deletion work correctly across
the full stack: API endpoints, frontend forms, ownership enforcement, error
handling, and the course-detail refetch pattern. Write e2e tests, perform
DoD-10 manual browser sign-off, and write the parent implementation index.

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

1. **E2E — PATCH:** A student can edit an assignment's editable fields (title, description, due date, estimated hours, priority) via the UI and see the changes reflected after the course refetch.
2. **E2E — DELETE:** A student can delete an assignment via the UI and see it removed from the list after the course refetch.
3. **E2E — ownership:** A second student cannot edit or delete the first student's assignment (uniform 404, generic error displayed).
4. **E2E — validation:** Invalid input on edit (e.g., whitespace-only title, out-of-range duration) is rejected with field-level errors.
5. **DoD-10 manual sign-off:** Manual browser walkthrough of edit and delete flows, including error states, keyboard interactions, and responsive behavior.

## Tests

- **E2E tests** (`assignments-e2e.spec.ts` — extended by this story):
  - Full-stack PATCH flow: create → edit via UI → verify updated values in list.
  - Full-stack DELETE flow: create → delete via UI → verify removal from list.
  - Two-student matrix: student B attempts PATCH/DELETE on student A's assignment → 404.
  - Validation: invalid edit input → 400 field-level errors displayed.
  - Error states: network/5xx errors → retry toast.

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

- E2E tests for PATCH and DELETE flows (full-stack, real Postgres).
- Two-student matrix test (cross-student ownership enforcement).
- Manual browser walkthrough of edit and delete flows.
- Parent implementation index at `./artifacts/SP-114/implementation.md`.

## Sizing block

- **Outcome:** E2E tests for PATCH + DELETE flows, manual DoD-10 sign-off, parent index.
- **Time estimate:** ~1–1.5 hours.
- **Production files:** None (integration only).
- **Test files:** `assignments-e2e.spec.ts` (extend with PATCH/DELETE flows).
- **Minimal start context:** Read `test-http.ts`, `assignments-e2e.spec.ts`, `SP-113C`.
- **Verification commands:** `pnpm test:e2e -- assignments-e2e.spec.ts`.
- **Dependencies:** SP-114D (PATCH + DELETE endpoints), SP-114E (per-row UI).
- **Exclusions:** None (this is the integration verification child).
