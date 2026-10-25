# SP-115: Assignment Types (parent coordination)

**Story ID:** SP-115
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 3 (add assignment types, deadlines, and priority)
**Status:** Reviewed — the combined parent review passed 2026-10-25 ([review](./artifacts/SP-115/review.md) · [walkthrough](./artifacts/SP-115/walkthrough.md)); both children `Reviewed`, user DoD-10 manual pass executed.
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the assignment-type unit. Not an implementation
ticket. Deadlines, estimated duration, and priority already shipped in
[SP-113](../SP-113/README.md) and are editable in [SP-114](../SP-114/README.md).
This parent owns the remaining AC-E03-02 field: optional assignment `type`.

- [SP-115G](./SP-115G-assignment-type-api.md) — backend: nullable `type`
  column, create/update validation, both assignment projections, API tests
  (Ready).
- [SP-115H](./SP-115H-assignment-type-ui.md) — frontend: set and show type on
  the course-detail form and row (Needs refinement; owns the parent index
  and DoD-10 browser note).

## Outcome

A student can classify an assignment as homework, a paper, a project, a quiz,
or an exam when creating or editing it, and see that classification on the
course. Omitting it leaves the assignment untyped. The value is stored on the
student's own assignment and is not a lifecycle or ownership field.

## Exclusions (owned elsewhere)

- Due date, estimated duration, and priority — already shipped (SP-113/SP-114).
  This parent does not reopen their rules.
- Status updates and `actualHours` — story 5.
- Clearing a stored due date or estimated duration — still impossible
  (D114-5). Type follows that same keep-on-null rule (D115-3).
- Subtasks — story 4. Search, sorting, and filters — story 6. Overdue and
  completed views — story 7.
- Moving an assignment between courses — out of scope (SP-114 exclusion).
- Free-text or student-defined types — not in the epic list.
