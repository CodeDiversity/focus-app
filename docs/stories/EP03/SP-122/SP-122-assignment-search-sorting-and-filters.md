# SP-122: Assignment Search, Sorting & Filters (parent coordination)

**Story ID:** SP-122
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 6 (implement assignment search, sorting, and filters)
**Status:** Planned 2026-10-26 (Plan Ready — [breakdown](./README.md)). Implementation not started.
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the assignment-list unit. Not an implementation ticket.
This parent owns AC-E03-07 ("Assignment lists support course, date, and status
filtering.") in full: the cross-course list endpoint with course, date, and
status filters (plus search and sort), the list page that exposes those
controls, and the cross-layer proof.

- [SP-122A](./SP-122A-assignment-list-api.md) — backend: `GET /assignments`
  with query filters (`courseId`, `status`, `priority`, `type`,
  `dueFrom`/`dueTo`, `q`), sort/order, and the course-context projection
  (Ready).
- [SP-122B](./SP-122B-assignment-list-ui.md) — frontend: the `/assignments`
  list page with search, filters, sort, the course picker, and the entity API
  function (Needs refinement — UI/UX gaps; owns the DoD-10 browser note).
- [SP-122C](./SP-122C-assignment-list-integration.md) — integration: the
  filter/sort/search/ownership e2e matrix, the parent index, and the DoD-10
  browser note.

## Outcome

A student can open a single list of all their assignments across courses and
narrow it by course, date range, and status (plus priority, type, and free text),
and order it by due date, title, priority, status, or creation/update time. Each
row carries its course context and subtask progress. Filtering by another
student's course is impossible (uniform 404), and no query parameter can bypass
ownership.

## Exclusions (owned elsewhere)

- Overdue identification and the completed/overdue views — story 7
  (AC-E03-06 and the AC-E03-05 view half).
- Assignment creation/editing/deletion/status/subtasks — SP-113/SP-114/SP-115/
  SP-120/SP-121.
- Dashboard widgets that link to this list — EP05 (not yet broken down).
- Pagination — deferred (D122-7); EP05 owns sensible limits.
- A dedicated assignment detail page / deep links — deferred (D122-1). Rows
  route to their course detail.