# SP-118: Semester & Course Management E2E Coverage

**Story ID:** SP-118
**Epic:** [EP09: E2E Test Automation](../../epics/EP09-e2e-test-automation.md)
**Dependencies:** SP-116
**Status:** Reviewed (EP09 complete, 2026-10-25 — final parent review PASS, `review.md`)

## Summary

E2E coverage for the core data journeys: creating, editing, and deleting a
semester and a course through the real UI and API.

## Scope / acceptance criteria

1. A signed-in user can create a semester; it appears in the semesters list.
2. A signed-in user can create a course; it appears in the courses list.
3. Editing a semester/course persists and renders the updated values.
4. Deleting a semester/course removes it (with whatever confirmation the UI
   already uses — do not weaken deletion guards for testability).
5. Tests clean up their data or use uniquely named entities per run.

## Notes

- These flows exercise form validation and API persistence together; keep
  assertions on user-visible outcomes, not DOM internals.
- If form validation states need explicit coverage, add one negative case
  (e.g., empty required field shows inline error) rather than exhaustive
  per-field tests — unit tests already cover validation logic.

## Sizing

~1–2 hours. Tests only.
