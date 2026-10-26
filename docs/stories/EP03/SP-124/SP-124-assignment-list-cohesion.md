# SP-124: Assignment List Cohesion (parent coordination)

**Story ID:** SP-124
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 8 (assignment list cohesion — edit/completion on the cross-course list; not in the original 7 proposed stories; added 2026-10-26 by user direction)
**Status:** Draft — planned 2026-10-26; children `Needs refinement` for UI/UX (ui-refiner handoff). No implementation evidence.
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the assignment-list-cohesion unit. Not an implementation
ticket. EP03 already ships assignment editing/deletion (SP-114), status
transitions (SP-121), subtasks (SP-120), and the cross-course list with
search/sort/filters (SP-122). Today the list page is **read-only except for
search/filter/sort**: its title routes to the course page, and edit/delete/status/
subtask/create all live on the course page. This unit makes the list page a
first-class editing surface so a student can manage an assignment where they
found it, while the course page keeps its existing capabilities (D124-2).

- [SP-124A](./SP-124A-list-row-actions.md) — frontend: in-place Edit, Delete, and status change on list rows; title no longer routes (opens edit); add a "View course" affordance; refetch after mutation.
- [SP-124B](./SP-124B-list-subtasks.md) — frontend: subtask checklist on list-page rows (expand/collapse, reorder, add/delete).
- [SP-124C](./SP-124C-list-create.md) — frontend: in-place create on the list page with a course selector (or "No course"), plus refetch.

## Outcome

A student can edit, change status, delete, manage subtasks, and create
assignments directly on the cross-course `/assignments` list, without being
routed to the course page. The course page retains its existing assignment
capabilities. No backend or schema change is needed (D124-1).

## Exclusions (owned elsewhere)

- Backend CRUD/status/subtasks — SP-113/SP-114/SP-120/SP-121 (no new API).
- Search, sorting, filters, overdue/completed views on the list — SP-122/SP-123.
- Assignment type/priority/deadline semantics — SP-115.
- Dashboard widgets linking to the list — EP05.
- `actualHours` / time tracking — EP07.
- Any backend or schema change — none is needed (D124-1).