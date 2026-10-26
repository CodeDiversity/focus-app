# SP-120: Assignment Subtasks (parent coordination)

**Story ID:** SP-120
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 4 (implement assignment subtasks)
**Status:** Plan Ready — children broken down 2026-10-25; implementation not started
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the assignment-subtask unit. Not an implementation
ticket. This parent owns AC-E03-03: "Assignments can contain ordered,
independently completable subtasks."

- [SP-120I](./SP-120I-subtask-api.md) — backend: nested subtask routes
  under assignments, the course-detail projection, and API tests (Ready).
- [SP-120J](./SP-120J-subtask-ui.md) — frontend: the subtask checklist on
  the course-detail assignment rows (Needs refinement — UI/UX gaps; owns
  the parent index and DoD-10 browser note).

## Outcome

A student can break an assignment into an ordered checklist of subtasks on
the course page: add a subtask, mark it complete, reorder it, and delete
it. Each subtask is independently completable, and the order is preserved.
Subtasks are the existing `Task` rows linked by `assignmentId` (D120-1 —
no new model, no migration).

## Exclusions (owned elsewhere)

- Standalone tasks (no assignment) — not in EP03 scope; EP06 study
  planning owns the scheduling surface.
- Orphaned subtasks after assignment deletion — persist per D114-4
  (`SetNull`); not surfaced in this story's UI (D120-6).
- Assignment status and completion — story 5.
- Search, sorting, and filters — story 6.
- Overdue and completed views — story 7.
- Subtask descriptions, due dates, estimated/actual minutes, priority —
  the `Task` model carries them but the MVP checklist does not expose them
  (D120-3).
