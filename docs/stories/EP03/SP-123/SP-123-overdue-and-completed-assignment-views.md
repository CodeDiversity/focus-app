# SP-123: Overdue & Completed Assignment Views (parent coordination)

**Story ID:** SP-123
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 7 (implement overdue and completed assignment views)
**Status:** Reviewed 2026-10-26 (pass 4) — SP-123 (A/B) implemented and reviewed; meets DoD and AC-E03-05 (view half) / AC-E03-06 (see [breakdown](./README.md) and `./artifacts/SP-123/review.md` pass 4). DoD-10 under D123B-DoD10 exception (manual browser pass outstanding for user); DoD-11 walkthrough saved at `./artifacts/SP-123/walkthrough.md`.
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the overdue/completed-views unit. Not an implementation
ticket. This parent owns the story-7 share of AC-E03-05 ("Completing an
assignment removes it from unfinished-work views without deleting it.") — the
completed view that makes finished work visible again — and AC-E03-06
("Overdue work is identified from the deadline and completion status.").

- [SP-123A](./SP-123A-overdue-identification.md) — frontend: overdue
  identification (shared predicate + overdue indicator on course detail and the
  list page) (Needs refinement — UI/UX gaps).
- [SP-123B](./SP-123B-completed-assignment-views.md) — frontend: completed
  assignment views on the course page (show-completed affordance), plus the
  parent index and the DoD-10 browser note (Needs refinement — UI/UX gaps).

## Outcome

A student can see which unfinished assignments are past their deadline (an
overdue indicator, never color-only) on both the course page and the
cross-course list, and can reveal finished (completed/submitted/graded)
assignments on the course page without a refetch, so completed work is never
lost from view. The record persists throughout — no delete, no status change,
no API change.

## Exclusions (owned elsewhere)

- Assignment creation/editing/deletion/subtasks/status — SP-113/SP-114/SP-115/
  SP-120/SP-121.
- Search, sorting, and filters — SP-122.
- Dashboard overdue widget and links to full lists — EP05 (not yet broken down).
- `actualHours` / time tracking — EP07.
- Any backend or schema change — none is needed (D123-1, D123-3).