# SP-121: Completion & Status Tracking (parent coordination)

**Story ID:** SP-121
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 5 (implement completion and status tracking)
**Status:** Reviewed 2026-10-26 (combined parent review passed — [review](./artifacts/SP-121/review.md) · [walkthrough](./artifacts/SP-121/walkthrough.md))
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the completion-and-status unit. Not an
implementation ticket. This parent owns AC-E03-04 ("Students can update
assignment status.") and the story-5 share of AC-E03-05 ("Completing an
assignment removes it from unfinished-work views without deleting it."):
the status transition itself and its removal from the course-detail
unfinished-work view. Story 7 owns the completed/overdue views that make
finished work visible again, and the overdue identification (AC-E03-06).

- [SP-121A](./SP-121A-assignment-status-api.md) — backend: `PATCH
  /assignments/:id` accepts `status` (Ready).
- [SP-121B](./SP-121B-assignment-status-ui.md) — frontend: the status
  control on course-detail assignment rows and the unfinished-only default
  view (Needs refinement — UI/UX gaps; owns the parent index and the
  DoD-10 browser note).

## Outcome

A student can set an assignment's status (Pending, In progress, Completed,
Submitted, Graded) from the course page. Setting a finished status
(Completed, Submitted, or Graded) removes the assignment from the
course-detail assignments list — the unfinished-work view — without
deleting it: the record persists and the stored status is updated
(D121-1…7).

## Exclusions (owned elsewhere)

- Overdue identification and the completed/overdue views — story 7
  (AC-E03-05 view half, AC-E03-06).
- Search, sorting, and filters — story 6 (AC-E03-07).
- Subtask completion — shipped in SP-120 (D120-4: PENDING/COMPLETED
  only).
- `actualHours` — stays rejected on create/update (D114-2); time tracking
  is EP07.
- Assignment status on create — new assignments always start PENDING
  (D121-1).
