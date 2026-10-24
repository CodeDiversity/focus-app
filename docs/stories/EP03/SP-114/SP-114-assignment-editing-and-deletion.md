# SP-114: Assignment Editing and Deletion (parent coordination)

**Story ID:** SP-114
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 2 (implement assignment editing and deletion)
**Status:** Planned 2026-10-24, **Plan Ready**.
**Jira key:** Pending creation (no sync authorized)

## Purpose

Coordination record for the assignment-editing-and-deletion unit. Not an
implementation ticket — the work lives in the children:

- [SP-114D](./SP-114D-assignment-update-delete-api.md) — backend: `PATCH /assignments/:id`,
  `DELETE /assignments/:id`, DTOs, service methods, ownership, tests (Plan Ready).
- [SP-114E](./SP-114E-assignment-edit-delete-ui.md) — frontend: per-row edit/delete controls
  in `AssignmentsSection`, form reuse for editing, delete confirmation, refetch
  after mutation (Plan Ready; **needs a `ui-refiner` pass** before implementation).
- [SP-114F](./SP-114F-assignment-edit-delete-integration.md) — integration: e2e spec,
  DoD-10 manual sign-off, parent index (Plan Ready).

## Outcome

A student viewing a course's assignments can edit any assignment's editable
fields (title, description, due date, estimated duration, priority) and delete
assignments, with the same ownership guarantees, validation, and error handling
as creation. The course-detail page refreshes after each mutation.

## Exclusions (owned elsewhere)

- Status updates (PENDING → IN_PROGRESS → COMPLETED, etc.) — story 5.
- `actualHours` (tracked time) — story 5.
- Assignment `type` column — proposed story 3.
- Assignment subtasks — proposed story 4.
- Assignment lists, search, sorting, filters — proposed story 6.
- Overdue and completed assignment views — proposed story 7.
- Moving an assignment between courses (changing `courseId` after creation) —
  not in scope; can be a future story.
