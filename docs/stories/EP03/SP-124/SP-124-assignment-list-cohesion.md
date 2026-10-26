# SP-124: Assignment List Cohesion (parent coordination)

**Story ID:** SP-124
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 8 (assignment list cohesion — not in the original 7 proposed stories; added 2026-10-26 by user direction, refined the same day for a single interaction owner)
**Status:** Draft — refined 2026-10-26. A is Ready. B and C are `Needs refinement` for list-only UI/UX. No implementation evidence.
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record. Not an implementation ticket. The list page is read-only
except for search, filter, and sort; its title routes to the course page.
This unit makes the list a second host of the same assignment interaction the
course page uses, so edit, delete, status, subtasks, and create are not
implemented twice (D124-9, D124-10).

- [SP-124A](./SP-124A-shared-assignment-interaction.md) — extract `features/assignments` (`useAssignmentActions` + `AssignmentRow`); course page behavior unchanged. Ready.
- [SP-124B](./SP-124B-list-adopts-shared-interaction.md) — list page hosts that owner; title opens edit. Needs refinement.
- [SP-124C](./SP-124C-shared-create.md) — same form, optional course select, list create entry. Needs refinement. Owns the parent index and DoD-10 note.

## Outcome

A student can manage an assignment on `/assignments` without being sent to the
course page, and the course page keeps the same actions. Both surfaces call
one hook and one row. No backend or schema change (D124-1).

## Exclusions (owned elsewhere)

- Backend CRUD, status, and subtasks — SP-113/SP-114/SP-120/SP-121.
- Search, sort, filters, overdue, and completed views — SP-122/SP-123.
- Dashboard links — EP05.
- `actualHours` / time tracking — EP07.
