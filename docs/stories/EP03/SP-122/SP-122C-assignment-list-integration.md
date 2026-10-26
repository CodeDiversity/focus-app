# SP-122C: Assignment List Integration

**Story ID:** SP-122C
**Title:** Integration: assignment list filters, sort, search, and ownership
**Parent:** [SP-122](./SP-122-assignment-search-sorting-and-filters.md)
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Layer:** Integration
**Status:** Implemented — awaiting parent review (2026-10-26)
**Dependencies:** SP-122A and SP-122B implemented. No open blocker once both are done.
**Jira key:** Pending creation

## Summary

Named integration owner for SP-122: prove the filter/sort/search/ownership
contract end-to-end over real HTTP + Postgres, write the parent implementation
index, and record the DoD-10 browser sign-off. No new product behavior.

## Bounded scope

In: a new (or extended) e2e spec covering filter combinations, sort order,
search, the course-ownership 404, malformed/unknown params, and the projection
key set; the parent index at `./artifacts/SP-122/implementation.md`; the DoD-10
browser note.

Out: any change to the endpoint or the page (those belong to A/B). Pagination,
overdue/completed views, and dedicated detail pages (story 7 / EP05).

## Source requirement references

- **AC-E03-07** — "Assignment lists support course, date, and status
  filtering." This child owns the cross-layer proof that the filters, date
  range, and status filter work end-to-end and are principal-scoped.
- Shared DoD in [docs/epics/README.md](../../../epics/README.md#definition-of-done),
  items 1, 3, 4, 5, 8, 10. Items 2, 6, 7 are A/B's. Item 9 is A's. Item 11 is
  the final reviewer walkthrough for the parent.
- Contract and D122-1…7 in the [SP-122 README](./README.md).

## Acceptance criteria

1. **Filter matrix (e2e).** Combining `courseId`, `status`, `priority`, `type`,
   `dueFrom`, `dueTo`, and `q` returns exactly the matching rows for the
   principal; an empty match returns `[]` with 200.
2. **Sort matrix (e2e).** Each `sort` × `order` combination returns rows in
   the documented order, including nulls-last for `dueDate asc` and the
   `title`/`id` tie-break.
3. **Search (e2e).** `q` matches title and description case-insensitively;
   whitespace-only `q` behaves as absent.
4. **Ownership (e2e).** Student B's list never contains A's rows; B filtering
   by A's `courseId` → uniform 404; B's data unchanged.
5. **Validation (e2e).** Invalid enum/date/sort/order/`q` length and unknown
   params → 400 with a field-level `errors` map; unauthenticated → 401.
6. **Projection (e2e).** Every returned item's key set equals the contract's
   `AssignmentListItem` keys; `course` and `subtasks` shapes match.
7. **No regression (e2e).** `POST`/`PATCH`/`DELETE` and the subtask routes
   still behave as before; `GET /courses/:id` projection/order unchanged.
8. **Parent index.** `./artifacts/SP-122/implementation.md` is written,
   summarizing A, B, and this child's evidence, with checkpoint links.
9. **DoD-10.** A manual browser pass of the list page (search, filters, sort,
   empty/error states, responsive, keyboard) is executed and recorded in
   `./artifacts/SP-122B/implementation.md` (or a linked note), or a documented
   exception is recorded with the session owner's authorization (the SP-113C
   precedent).
10. **Verification gates.** The backend unit + data-scoping + e2e suites and the
    frontend component tests pass (or self-skip without `DATABASE_URL`, recorded
    as skipped — not claimed passed).

## Tests

- **E2E** (`assignments-list-e2e.spec.ts` or an appended describe block in
  `assignments-e2e.spec.ts`): the filter/sort/search/ownership/projection matrix
  above, following the `createIntegrationApp` pattern (real HTTP, real Postgres,
  self-skip without `DATABASE_URL`).
- **Frontend component tests** (owned by B) are run as part of the gate but not
  authored here.
- **Manual:** DoD-10 browser pass (recorded, not invented).

## Technical notes

### Inspected paths (2026-10-26)

- `apps/api/src/modules/assignments/assignments-e2e.spec.ts` — the pattern
  (two-student matrix, `createIntegrationApp`, cleanup).
- `apps/api/src/modules/assignments/subtasks-e2e.spec.ts` — the nested-route
  e2e pattern.
- `apps/api/src/test/test-http.ts` — harness.
- `apps/web/src/features/courses/ui/AssignmentsSection.test.tsx` — component
  test precedent for filter/row assertions.
- `docs/stories/EP03/SP-113/SP-113C-quick-create-integration-signoff.md` —
  the integration-child precedent (parent index + DoD-10 + combined review).

### Contract notes

Verify against the [SP-122 README](./README.md) contract and D122-1…7. Any
deviation found is a finding against A or B, not a silent change here.

## Definition of Done

- The ten acceptance criteria pass.
- The e2e matrix and the ownership counterexamples are recorded as passing (or
  self-skipped without `DATABASE_URL`, honestly recorded).
- The parent index and DoD-10 note are written.
- No product code is changed by this child beyond test/spec files.

## Sizing

- **Outcome:** The end-to-end proof of the assignment list contract (filters,
  sort, search, ownership, projection), the parent implementation index, and the
  DoD-10 browser note.
- **Time estimate:** 1.5–2 hours, including the e2e spec, the parent index, and
  the browser note. Uncertainty is the filter-matrix case count, not the proof
  logic.
- **Files:** new/extended e2e spec under `apps/api/src/modules/assignments/`;
  `./artifacts/SP-122/implementation.md`; DoD-10 note. No production code.
- **Start context:** this file, the SP-122 README contract, and the inspected
  paths above. Do not read story 7.
- **Verification:** With `DATABASE_URL`,
  `pnpm --filter @studypilot/api exec jest --runInBand assignments-list-e2e.spec.ts`
  (or the appended describe block) passes and is not skipped. Without
  `DATABASE_URL`, the spec self-skips and that is recorded honestly. The
  frontend suite (`assignmentApi.test.ts` + the new page test) passes. The
  parent index and DoD-10 note exist at the recorded paths.
- **Dependencies / exclusions:** Requires SP-122A and SP-122B implemented.
  Excludes product changes, pagination, overdue/completed views, and story 7.
  Every excluded epic AC stays owned in the [EP03 README](../README.md).