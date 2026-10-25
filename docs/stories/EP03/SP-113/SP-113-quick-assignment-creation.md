# SP-113: Quick Assignment Creation (parent coordination)

**Story ID:** SP-113
**Epic:** [EP03: Assignment & Task Management](../../../epics/EP03-assignment-and-task-management.md) (Jira STUDY-16)
**Milestone:** M1
**Covers epic proposed story:** 1 (implement quick assignment creation)
**Status:** Complete — reviewed and passed 2026-10-24. See [breakdown README](./README.md), [review report](./artifacts/SP-113/review.md), and [user walkthrough](./artifacts/SP-113/walkthrough.md).
**Jira key:** Pending creation (parent coordination record — no Jira issue; the children carry the tracker keys)

## Purpose

Coordination record for the quick-assignment-creation unit. Not an
implementation ticket — the work lives in the children:

- [SP-113A](./SP-113A-assignment-create-api.md) — backend: the assignments
  module, `POST /assignments`, the nullable-`dueDate` migration (Reviewed).
- [SP-113B](./SP-113B-quick-create-assignment-ui.md) — frontend: the
  quick-create form on the course detail page (Reviewed).
- [SP-113C](./SP-113C-quick-create-integration-signoff.md) — integration:
  e2e spec, DoD-10 manual sign-off, parent index (Reviewed).

## Outcome

A student opening a course can add an assignment in seconds — a title, and
optionally a due date, estimated duration, and priority — and see it appear in
the course's assignments section. The course is implicit from the page; the
assignment persists scoped to the student, and no other student can see or
touch it.

## Exclusions (owned elsewhere)

- The assignment `type` field — proposed story 3 (TBD).
- Editing/deletion — story 2 (TBD). Subtasks — story 4 (TBD). Status
  updates/completion — story 5 (TBD). Lists/search/filters — story 6 (TBD).
  Overdue/completed views — story 7 (TBD).
