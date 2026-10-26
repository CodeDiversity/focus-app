# EP03: Assignment & Task Management

**Issue Type:** Epic
**Release:** MVP 1.0
**Priority:** High / P0
**Labels:** `studypilot`, `mvp`
**Dependencies:** EP02

## Epic Summary

Provide a centralized system for tracking assignments, deadlines, subtasks, and completion status.

## Description

As a student, I want to manage homework, papers, projects, quizzes, and exams so that I can see my academic responsibilities and track my progress.

The workflow must make adding an assignment quick and allow students to break complex work into smaller actions.

## Scope

- Assignment creation and editing
- Assignment types
- Due dates and priority
- Estimated work duration
- Subtask checklists
- Assignment status and completion
- Sorting, filtering, and overdue work

## Acceptance Criteria

- Students can create an assignment with a title and course.
- Optional fields include due date, estimated duration, type, and priority.
- Assignments can contain ordered, independently completable subtasks.
- Students can update assignment status.
- Completing an assignment removes it from unfinished-work views without deleting it.
- Overdue work is identified from the deadline and completion status.
- Assignment lists support course, date, and status filtering.

## Proposed Stories

1. Implement quick assignment creation.
2. Implement assignment editing and deletion.
3. Add assignment types, deadlines, and priority.
4. Implement assignment subtasks.
5. Implement completion and status tracking.
6. Implement assignment search, sorting, and filters.
7. Implement overdue and completed assignment views.
8. (Added 2026-10-26) Assignment list cohesion — in-place edit, delete,
   status, subtasks, and create on the cross-course `/assignments` list
   (SP-124). This is a UX cohesion follow-up, not a new acceptance criterion;
   it adds a second editing surface for behavior already owned by stories 1–5.
## Technical Notes

Create `Assignment` and `Subtask` Prisma models. Assignment state should be independent of study-session progress. Validate duration estimates and deadline values.
